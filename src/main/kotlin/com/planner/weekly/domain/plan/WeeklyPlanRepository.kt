package com.planner.weekly.domain.plan

import org.springframework.data.mongodb.repository.MongoRepository
import java.time.LocalDate
import java.util.*

interface WeeklyPlanRepository : MongoRepository<WeeklyPlan, String> {
    fun findByUserIdAndWeekStartDate(userId: String, weekStartDate: LocalDate): Optional<WeeklyPlan>
    fun findByUserIdOrderByWeekStartDateDesc(userId: String): List<WeeklyPlan>
    fun findByUserIdAndStatus(userId: String, status: PlanStatus): List<WeeklyPlan>
    fun existsByUserIdAndWeekStartDate(userId: String, weekStartDate: LocalDate): Boolean
}
