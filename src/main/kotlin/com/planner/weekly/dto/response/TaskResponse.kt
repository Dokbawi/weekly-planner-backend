package com.planner.weekly.dto.response

import com.planner.weekly.domain.plan.Task
import com.planner.weekly.domain.plan.TaskPriority
import com.planner.weekly.domain.plan.TaskStatus
import java.time.Instant
import java.time.LocalTime

data class TaskResponse(
    val id: String,
    val title: String,
    val description: String?,
    val status: TaskStatus,
    val priority: TaskPriority,
    val scheduledTime: LocalTime?,
    val estimatedMinutes: Int?,
    val actualMinutes: Int?,
    val tags: List<String>,
    val reminderEnabled: Boolean,
    val reminderMinutesBefore: Int?,
    val createdAt: Instant,
    val completedAt: Instant?
) {
    companion object {
        fun from(task: Task) = TaskResponse(
            id = task.id,
            title = task.title,
            description = task.description,
            status = task.status,
            priority = task.priority,
            scheduledTime = task.scheduledTime,
            estimatedMinutes = task.estimatedMinutes,
            actualMinutes = task.actualMinutes,
            tags = task.tags,
            reminderEnabled = task.reminderEnabled,
            reminderMinutesBefore = task.reminderMinutesBefore,
            createdAt = task.createdAt,
            completedAt = task.completedAt
        )
    }
}
