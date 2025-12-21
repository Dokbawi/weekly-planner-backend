package com.planner.weekly.domain.changelog

import com.planner.weekly.domain.plan.PlanStatus
import com.planner.weekly.domain.plan.Task
import com.planner.weekly.domain.plan.WeeklyPlan
import org.springframework.stereotype.Service
import java.time.LocalDate

@Service
class ChangeTrackingService(
    private val changeLogRepository: ChangeLogRepository
) {

    fun trackChange(
        weeklyPlan: WeeklyPlan,
        taskId: String,
        taskTitle: String,
        targetDate: LocalDate,
        changeType: ChangeType,
        previousTask: Task?,
        newTask: Task?,
        reason: String? = null
    ) {
        // Only track changes for CONFIRMED plans
        if (weeklyPlan.status != PlanStatus.CONFIRMED) return

        val changes = detectFieldChanges(previousTask, newTask)

        // Skip if no actual changes for TASK_UPDATED
        if (changes.isEmpty() && changeType == ChangeType.TASK_UPDATED) return

        val log = ChangeLog(
            weeklyPlanId = weeklyPlan.id!!,
            userId = weeklyPlan.userId,
            targetDate = targetDate,
            taskId = taskId,
            taskTitle = taskTitle,
            changeType = changeType,
            changes = changes,
            reason = reason
        )

        changeLogRepository.save(log)
    }

    fun getChangesForPlan(weeklyPlanId: String): List<ChangeLog> {
        return changeLogRepository.findByWeeklyPlanIdOrderByChangedAtDesc(weeklyPlanId)
    }

    fun getChangesForDate(weeklyPlanId: String, date: LocalDate): List<ChangeLog> {
        return changeLogRepository.findByWeeklyPlanIdAndTargetDate(weeklyPlanId, date)
    }

    private fun detectFieldChanges(prev: Task?, new: Task?): List<FieldChange> {
        if (prev == null || new == null) return emptyList()

        val changes = mutableListOf<FieldChange>()

        if (prev.title != new.title) {
            changes.add(FieldChange("title", prev.title, new.title))
        }
        if (prev.description != new.description) {
            changes.add(FieldChange("description", prev.description, new.description))
        }
        if (prev.status != new.status) {
            changes.add(FieldChange("status", prev.status.name, new.status.name))
        }
        if (prev.priority != new.priority) {
            changes.add(FieldChange("priority", prev.priority.name, new.priority.name))
        }
        if (prev.scheduledTime != new.scheduledTime) {
            changes.add(FieldChange("scheduledTime", prev.scheduledTime?.toString(), new.scheduledTime?.toString()))
        }
        if (prev.estimatedMinutes != new.estimatedMinutes) {
            changes.add(FieldChange("estimatedMinutes", prev.estimatedMinutes?.toString(), new.estimatedMinutes?.toString()))
        }
        if (prev.actualMinutes != new.actualMinutes) {
            changes.add(FieldChange("actualMinutes", prev.actualMinutes?.toString(), new.actualMinutes?.toString()))
        }
        if (prev.tags != new.tags) {
            changes.add(FieldChange("tags", prev.tags.joinToString(","), new.tags.joinToString(",")))
        }
        if (prev.reminderEnabled != new.reminderEnabled) {
            changes.add(FieldChange("reminderEnabled", prev.reminderEnabled.toString(), new.reminderEnabled.toString()))
        }
        if (prev.reminderMinutesBefore != new.reminderMinutesBefore) {
            changes.add(FieldChange("reminderMinutesBefore", prev.reminderMinutesBefore?.toString(), new.reminderMinutesBefore?.toString()))
        }

        return changes
    }
}
