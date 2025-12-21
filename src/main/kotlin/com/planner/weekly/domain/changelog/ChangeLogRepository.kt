package com.planner.weekly.domain.changelog

import org.springframework.data.mongodb.repository.MongoRepository
import java.time.LocalDate

interface ChangeLogRepository : MongoRepository<ChangeLog, String> {
    fun findByWeeklyPlanIdOrderByChangedAtDesc(weeklyPlanId: String): List<ChangeLog>
    fun findByUserIdOrderByChangedAtDesc(userId: String): List<ChangeLog>
    fun findByWeeklyPlanIdAndTargetDate(weeklyPlanId: String, targetDate: LocalDate): List<ChangeLog>
    fun countByWeeklyPlanIdAndChangeType(weeklyPlanId: String, changeType: ChangeType): Long
}
