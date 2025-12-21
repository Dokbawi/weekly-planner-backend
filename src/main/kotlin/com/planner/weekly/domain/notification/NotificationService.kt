package com.planner.weekly.domain.notification

import com.planner.weekly.exception.ApiException
import com.planner.weekly.exception.ErrorCode
import org.springframework.stereotype.Service

@Service
class NotificationService(
    private val notificationRepository: NotificationRepository
) {

    fun createNotification(
        userId: String,
        type: NotificationType,
        title: String,
        message: String,
        relatedPlanId: String? = null,
        relatedTaskId: String? = null
    ): Notification {
        val notification = Notification(
            userId = userId,
            type = type,
            title = title,
            message = message,
            relatedPlanId = relatedPlanId,
            relatedTaskId = relatedTaskId
        )
        return notificationRepository.save(notification)
    }

    fun getUserNotifications(userId: String): List<Notification> {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
    }

    fun getUnreadNotifications(userId: String): List<Notification> {
        return notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false)
    }

    fun getUnreadCount(userId: String): Long {
        return notificationRepository.countByUserIdAndIsRead(userId, false)
    }

    fun markAsRead(notificationId: String, userId: String): Notification {
        val notification = notificationRepository.findById(notificationId)
            .orElseThrow { ApiException(ErrorCode.NOTIFICATION_NOT_FOUND) }

        if (notification.userId != userId) {
            throw ApiException(ErrorCode.UNAUTHORIZED)
        }

        val updatedNotification = notification.copy(isRead = true)
        return notificationRepository.save(updatedNotification)
    }

    fun markAllAsRead(userId: String) {
        val unread = notificationRepository.findByUserIdAndIsReadOrderByCreatedAtDesc(userId, false)
        val updated = unread.map { it.copy(isRead = true) }
        notificationRepository.saveAll(updated)
    }
}
