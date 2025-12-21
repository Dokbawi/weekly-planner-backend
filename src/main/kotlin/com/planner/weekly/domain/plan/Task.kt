package com.planner.weekly.domain.plan

import org.bson.types.ObjectId
import java.time.Instant
import java.time.LocalTime

data class Task(
    val id: String = ObjectId().toString(),
    val title: String,
    val description: String? = null,
    val status: TaskStatus = TaskStatus.PENDING,
    val priority: TaskPriority = TaskPriority.MEDIUM,
    val scheduledTime: LocalTime? = null,
    val estimatedMinutes: Int? = null,
    val actualMinutes: Int? = null,
    val tags: List<String> = emptyList(),
    val reminderEnabled: Boolean = false,
    val reminderMinutesBefore: Int? = null,
    val createdAt: Instant = Instant.now(),
    val completedAt: Instant? = null
)

enum class TaskStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED,
    POSTPONED
}

enum class TaskPriority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}
