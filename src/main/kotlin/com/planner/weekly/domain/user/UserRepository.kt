package com.planner.weekly.domain.user

import org.springframework.data.mongodb.repository.MongoRepository
import java.time.DayOfWeek
import java.util.*

interface UserRepository : MongoRepository<User, String> {
    fun findByEmail(email: String): Optional<User>
    fun existsByEmail(email: String): Boolean
    fun findBySettingsPlanningDay(planningDay: DayOfWeek): List<User>
    fun findBySettingsReviewDay(reviewDay: DayOfWeek): List<User>
}
