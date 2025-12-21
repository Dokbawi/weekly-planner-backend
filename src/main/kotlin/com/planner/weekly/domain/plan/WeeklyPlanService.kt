package com.planner.weekly.domain.plan

import com.planner.weekly.domain.changelog.ChangeTrackingService
import com.planner.weekly.domain.changelog.ChangeType
import com.planner.weekly.dto.request.CreateTaskRequest
import com.planner.weekly.dto.request.UpdateTaskRequest
import com.planner.weekly.exception.ApiException
import com.planner.weekly.exception.ErrorCode
import org.bson.types.ObjectId
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.LocalDate

@Service
class WeeklyPlanService(
    private val weeklyPlanRepository: WeeklyPlanRepository,
    private val changeTrackingService: ChangeTrackingService
) {

    fun createWeeklyPlan(userId: String, weekStartDate: LocalDate): WeeklyPlan {
        // Ensure weekStartDate is a Monday
        val adjustedStart = weekStartDate.with(java.time.DayOfWeek.MONDAY)
        val weekEndDate = adjustedStart.plusDays(6)

        if (weeklyPlanRepository.existsByUserIdAndWeekStartDate(userId, adjustedStart)) {
            throw ApiException(ErrorCode.PLAN_ALREADY_EXISTS)
        }

        val plan = WeeklyPlan(
            userId = userId,
            weekStartDate = adjustedStart,
            weekEndDate = weekEndDate
        )

        return weeklyPlanRepository.save(plan)
    }

    fun getWeeklyPlan(planId: String, userId: String): WeeklyPlan {
        val plan = findPlanOrThrow(planId)
        if (plan.userId != userId) {
            throw ApiException(ErrorCode.UNAUTHORIZED)
        }
        return plan
    }

    fun getWeeklyPlanByDate(userId: String, date: LocalDate): WeeklyPlan {
        val weekStartDate = date.with(java.time.DayOfWeek.MONDAY)
        return weeklyPlanRepository.findByUserIdAndWeekStartDate(userId, weekStartDate)
            .orElseThrow { ApiException(ErrorCode.PLAN_NOT_FOUND) }
    }

    fun getUserPlans(userId: String): List<WeeklyPlan> {
        return weeklyPlanRepository.findByUserIdOrderByWeekStartDateDesc(userId)
    }

    fun confirmPlan(planId: String, userId: String): WeeklyPlan {
        val plan = getWeeklyPlan(planId, userId)

        if (plan.status == PlanStatus.CONFIRMED) {
            throw ApiException(ErrorCode.PLAN_ALREADY_CONFIRMED)
        }

        val confirmedPlan = plan.copy(
            status = PlanStatus.CONFIRMED,
            confirmedAt = Instant.now()
        )

        return weeklyPlanRepository.save(confirmedPlan)
    }

    fun addTask(planId: String, userId: String, date: LocalDate, request: CreateTaskRequest): Task {
        val plan = getWeeklyPlan(planId, userId)

        if (!plan.isDateInWeek(date)) {
            throw ApiException(ErrorCode.INVALID_TARGET_DATE)
        }

        val task = Task(
            title = request.title,
            description = request.description,
            priority = request.priority,
            scheduledTime = request.scheduledTime,
            estimatedMinutes = request.estimatedMinutes,
            tags = request.tags,
            reminderEnabled = request.reminderEnabled,
            reminderMinutesBefore = request.reminderMinutesBefore
        )

        val dailyPlan = plan.dailyPlans[date] ?: DailyPlan(date = date)
        dailyPlan.tasks.add(task)
        plan.dailyPlans[date] = dailyPlan

        changeTrackingService.trackChange(
            weeklyPlan = plan,
            taskId = task.id,
            taskTitle = task.title,
            targetDate = date,
            changeType = ChangeType.TASK_CREATED,
            previousTask = null,
            newTask = task
        )

        weeklyPlanRepository.save(plan)
        return task
    }

    fun updateTask(
        planId: String,
        userId: String,
        taskId: String,
        request: UpdateTaskRequest
    ): Task {
        val plan = getWeeklyPlan(planId, userId)
        val (date, task) = findTaskInPlan(plan, taskId)

        val updatedTask = task.copy(
            title = request.title ?: task.title,
            description = request.description ?: task.description,
            status = request.status ?: task.status,
            priority = request.priority ?: task.priority,
            scheduledTime = request.scheduledTime ?: task.scheduledTime,
            estimatedMinutes = request.estimatedMinutes ?: task.estimatedMinutes,
            actualMinutes = request.actualMinutes ?: task.actualMinutes,
            tags = request.tags ?: task.tags,
            reminderEnabled = request.reminderEnabled ?: task.reminderEnabled,
            reminderMinutesBefore = request.reminderMinutesBefore ?: task.reminderMinutesBefore,
            completedAt = if (request.status == TaskStatus.COMPLETED && task.completedAt == null) {
                Instant.now()
            } else {
                task.completedAt
            }
        )

        changeTrackingService.trackChange(
            weeklyPlan = plan,
            taskId = task.id,
            taskTitle = task.title,
            targetDate = date,
            changeType = ChangeType.TASK_UPDATED,
            previousTask = task,
            newTask = updatedTask,
            reason = request.reason
        )

        updateTaskInPlan(plan, date, updatedTask)
        weeklyPlanRepository.save(plan)
        return updatedTask
    }

    fun deleteTask(planId: String, userId: String, taskId: String, reason: String?) {
        val plan = getWeeklyPlan(planId, userId)
        val (date, task) = findTaskInPlan(plan, taskId)

        changeTrackingService.trackChange(
            weeklyPlan = plan,
            taskId = task.id,
            taskTitle = task.title,
            targetDate = date,
            changeType = ChangeType.TASK_DELETED,
            previousTask = task,
            newTask = null,
            reason = reason
        )

        plan.dailyPlans[date]?.tasks?.removeIf { it.id == taskId }
        weeklyPlanRepository.save(plan)
    }

    fun moveTask(
        planId: String,
        userId: String,
        taskId: String,
        targetDate: LocalDate,
        reason: String?
    ): Task {
        val plan = getWeeklyPlan(planId, userId)

        if (!plan.isDateInWeek(targetDate)) {
            throw ApiException(ErrorCode.INVALID_TARGET_DATE)
        }

        val (sourceDate, task) = findTaskInPlan(plan, taskId)

        // Mark original task as postponed
        val postponedTask = task.copy(status = TaskStatus.POSTPONED)
        updateTaskInPlan(plan, sourceDate, postponedTask)

        // Create new task on target date
        val newTask = task.copy(
            id = ObjectId().toString(),
            status = TaskStatus.PENDING,
            createdAt = Instant.now()
        )

        val targetDailyPlan = plan.dailyPlans[targetDate] ?: DailyPlan(date = targetDate)
        targetDailyPlan.tasks.add(newTask)
        plan.dailyPlans[targetDate] = targetDailyPlan

        changeTrackingService.trackChange(
            weeklyPlan = plan,
            taskId = task.id,
            taskTitle = task.title,
            targetDate = sourceDate,
            changeType = ChangeType.MOVED_TO_ANOTHER_DAY,
            previousTask = task,
            newTask = postponedTask,
            reason = reason ?: "Moved to $targetDate"
        )

        weeklyPlanRepository.save(plan)
        return newTask
    }

    fun getTodayTasks(userId: String): List<Task> {
        val today = LocalDate.now()
        return try {
            val plan = getWeeklyPlanByDate(userId, today)
            plan.dailyPlans[today]?.tasks ?: emptyList()
        } catch (e: ApiException) {
            emptyList()
        }
    }

    private fun findPlanOrThrow(planId: String): WeeklyPlan {
        return weeklyPlanRepository.findById(planId)
            .orElseThrow { ApiException(ErrorCode.PLAN_NOT_FOUND) }
    }

    private fun findTaskInPlan(plan: WeeklyPlan, taskId: String): Pair<LocalDate, Task> {
        for ((date, dailyPlan) in plan.dailyPlans) {
            val task = dailyPlan.tasks.find { it.id == taskId }
            if (task != null) {
                return date to task
            }
        }
        throw ApiException(ErrorCode.TASK_NOT_FOUND)
    }

    private fun updateTaskInPlan(plan: WeeklyPlan, date: LocalDate, updatedTask: Task) {
        val dailyPlan = plan.dailyPlans[date]
            ?: throw ApiException(ErrorCode.TASK_NOT_FOUND)

        val index = dailyPlan.tasks.indexOfFirst { it.id == updatedTask.id }
        if (index == -1) {
            throw ApiException(ErrorCode.TASK_NOT_FOUND)
        }
        dailyPlan.tasks[index] = updatedTask
    }
}
