package com.planner.weekly.domain.notification

import org.springframework.data.mongodb.repository.MongoRepository

interface NotificationRepository : MongoRepository<Notification, String> {
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Notification>
    fun findByUserIdAndIsReadOrderByCreatedAtDesc(userId: String, isRead: Boolean): List<Notification>
    fun countByUserIdAndIsRead(userId: String, isRead: Boolean): Long
}
