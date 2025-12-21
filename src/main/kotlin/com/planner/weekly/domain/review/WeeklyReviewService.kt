package com.planner.weekly.domain.review

import com.planner.weekly.domain.changelog.ChangeLogRepository
import com.planner.weekly.domain.changelog.ChangeType
import com.planner.weekly.domain.plan.TaskStatus
import com.planner.weekly.domain.plan.WeeklyPlanRepository
import com.planner.weekly.exception.ApiException
import com.planner.weekly.exception.ErrorCode
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class WeeklyReviewService(
    private val weeklyPlanRepository: WeeklyPlanRepository,
    private val changeLogRepository: ChangeLogRepository
) {

    fun generateReview(planId: String, userId: String): WeeklyReview {
        val plan = weeklyPlanRepository.findById(planId)
            .orElseThrow { ApiException(ErrorCode.PLAN_NOT_FOUND) }

        if (plan.userId != userId) {
            throw ApiException(ErrorCode.UNAUTHORIZED)
        }

        val changes = changeLogRepository.findByWeeklyPlanIdOrderByChangedAtDesc(planId)
        val allTasks = plan.dailyPlans.values.flatMap { it.tasks }

        val completed = allTasks.count { it.status == TaskStatus.COMPLETED }
        val cancelled = allTasks.count { it.status == TaskStatus.CANCELLED }
        val postponed = allTasks.count { it.status == TaskStatus.POSTPONED }
        val addedAfterConfirm = changes.count { it.changeType == ChangeType.TASK_CREATED }

        val statistics = ReviewStatistics(
            totalPlanned = allTasks.size,
            completed = completed,
            cancelled = cancelled,
            postponed = postponed,
            addedAfterConfirm = addedAfterConfirm,
            completionRate = calculateRate(completed, allTasks.size),
            totalChanges = changes.size,
            changesByType = changes.groupingBy { it.changeType }.eachCount()
        )

        val dailyBreakdown = calculateDailyBreakdown(plan.dailyPlans)

        return WeeklyReview(
            weeklyPlanId = planId,
            weekStartDate = plan.weekStartDate,
            weekEndDate = plan.weekEndDate,
            statistics = statistics,
            dailyBreakdown = dailyBreakdown,
            changeHistory = changes
        )
    }

    private fun calculateRate(completed: Int, total: Int): Double {
        if (total == 0) return 0.0
        return (completed.toDouble() / total * 100).let {
            Math.round(it * 100) / 100.0
        }
    }

    private fun calculateDailyBreakdown(
        dailyPlans: Map<LocalDate, com.planner.weekly.domain.plan.DailyPlan>
    ): Map<LocalDate, DailyStatistics> {
        return dailyPlans.mapValues { (date, dailyPlan) ->
            val tasks = dailyPlan.tasks
            DailyStatistics(
                date = date,
                totalTasks = tasks.size,
                completed = tasks.count { it.status == TaskStatus.COMPLETED },
                cancelled = tasks.count { it.status == TaskStatus.CANCELLED },
                postponed = tasks.count { it.status == TaskStatus.POSTPONED },
                pending = tasks.count { it.status == TaskStatus.PENDING || it.status == TaskStatus.IN_PROGRESS }
            )
        }
    }
}
