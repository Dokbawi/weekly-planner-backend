package com.planner.weekly.domain.changelog

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.Instant
import java.time.LocalDate

@Document(collection = "change_logs")
data class ChangeLog(
    @Id
    val id: String? = null,
    val weeklyPlanId: String,
    val userId: String,
    val targetDate: LocalDate,
    val taskId: String,
    val taskTitle: String,
    val changeType: ChangeType,
    val changes: List<FieldChange> = emptyList(),
    val reason: String? = null,
    val changedAt: Instant = Instant.now()
)

data class FieldChange(
    val field: String,
    val oldValue: String?,
    val newValue: String?
)

enum class ChangeType {
    TASK_CREATED,
    TASK_UPDATED,
    TASK_DELETED,
    STATUS_CHANGED,
    MOVED_TO_ANOTHER_DAY,
    PRIORITY_CHANGED,
    TIME_CHANGED
}
