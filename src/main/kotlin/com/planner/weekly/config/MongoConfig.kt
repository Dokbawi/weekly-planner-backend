package com.planner.weekly.config

import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.annotation.Configuration
import org.springframework.context.event.EventListener
import org.springframework.data.domain.Sort
import org.springframework.data.mongodb.core.MongoTemplate
import org.springframework.data.mongodb.core.index.Index

@Configuration
class MongoConfig(private val mongoTemplate: MongoTemplate) {

    @EventListener(ApplicationReadyEvent::class)
    fun createIndexes() {
        // users
        mongoTemplate.indexOps("users").ensureIndex(
            Index("email", Sort.Direction.ASC).unique()
        )

        // weekly_plans
        mongoTemplate.indexOps("weekly_plans").ensureIndex(
            Index()
                .on("userId", Sort.Direction.ASC)
                .on("weekStartDate", Sort.Direction.DESC)
                .unique()
        )

        // change_logs
        mongoTemplate.indexOps("change_logs").ensureIndex(
            Index()
                .on("weeklyPlanId", Sort.Direction.ASC)
                .on("changedAt", Sort.Direction.DESC)
        )

        // notifications
        mongoTemplate.indexOps("notifications").ensureIndex(
            Index()
                .on("userId", Sort.Direction.ASC)
                .on("isRead", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
        )
    }
}
