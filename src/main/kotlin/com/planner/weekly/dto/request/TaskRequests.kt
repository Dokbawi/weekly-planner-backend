package com.planner.weekly.dto.request

import com.planner.weekly.domain.plan.TaskPriority
import com.planner.weekly.domain.plan.TaskStatus
import jakarta.validation.constraints.NotBlank
import java.time.LocalDate
import java.time.LocalTime

data class CreateTaskRequest(
    @field:NotBlank(message = "Title is required")
    val title: String,
    val description: String? = null,
    val priority: TaskPriority = TaskPriority.MEDIUM,
    val scheduledTime: LocalTime? = null,
    val estimatedMinutes: Int? = null,
    val tags: List<String> = emptyList(),
    val reminderEnabled: Boolean = false,
    val reminderMinutesBefore: Int? = null
)

data class UpdateTaskRequest(
    val title: String? = null,
    val description: String? = null,
    val status: TaskStatus? = null,
    val priority: TaskPriority? = null,
    val scheduledTime: LocalTime? = null,
    val estimatedMinutes: Int? = null,
    val actualMinutes: Int? = null,
    val tags: List<String>? = null,
    val reminderEnabled: Boolean? = null,
    val reminderMinutesBefore: Int? = null,
    val reason: String? = null
)

data class MoveTaskRequest(
    val targetDate: LocalDate,
    val reason: String? = null
)
