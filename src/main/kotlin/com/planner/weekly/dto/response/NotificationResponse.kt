package com.planner.weekly.dto.response

import com.planner.weekly.domain.notification.Notification
import com.planner.weekly.domain.notification.NotificationType
import java.time.Instant

data class NotificationResponse(
    val id: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: Instant
) {
    companion object {
        fun from(notification: Notification) = NotificationResponse(
            id = notification.id!!,
            type = notification.type,
            title = notification.title,
            message = notification.message,
            isRead = notification.isRead,
            createdAt = notification.createdAt
        )
    }
}
