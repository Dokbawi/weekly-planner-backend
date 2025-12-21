package com.planner.weekly.domain.plan

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.Instant
import java.time.LocalDate

@Document(collection = "weekly_plans")
data class WeeklyPlan(
    @Id
    val id: String? = null,
    val userId: String,
    val weekStartDate: LocalDate,
    val weekEndDate: LocalDate,
    val status: PlanStatus = PlanStatus.DRAFT,
    val dailyPlans: MutableMap<LocalDate, DailyPlan> = mutableMapOf(),
    val createdAt: Instant = Instant.now(),
    val confirmedAt: Instant? = null
) {
    init {
        // Initialize daily plans for the week if empty
        if (dailyPlans.isEmpty()) {
            var date = weekStartDate
            while (!date.isAfter(weekEndDate)) {
                dailyPlans[date] = DailyPlan(date = date)
                date = date.plusDays(1)
            }
        }
    }

    fun isDateInWeek(date: LocalDate): Boolean {
        return !date.isBefore(weekStartDate) && !date.isAfter(weekEndDate)
    }
}

enum class PlanStatus {
    DRAFT,
    CONFIRMED,
    ARCHIVED
}
