package com.planner.weekly.domain.notification

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.Instant

@Document(collection = "notifications")
data class Notification(
    @Id
    val id: String? = null,
    val userId: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val relatedPlanId: String? = null,
    val relatedTaskId: String? = null,
    val isRead: Boolean = false,
    val createdAt: Instant = Instant.now()
)

enum class NotificationType {
    TASK_REMINDER,
    DAILY_SUMMARY,
    PLANNING_REMINDER,
    REVIEW_REMINDER,
    TASK_DUE_SOON
}
