package com.planner.weekly.domain.review

import com.planner.weekly.domain.changelog.ChangeLog
import com.planner.weekly.domain.changelog.ChangeType
import java.time.LocalDate

data class WeeklyReview(
    val weeklyPlanId: String,
    val weekStartDate: LocalDate,
    val weekEndDate: LocalDate,
    val statistics: ReviewStatistics,
    val dailyBreakdown: Map<LocalDate, DailyStatistics>,
    val changeHistory: List<ChangeLog>
)

data class ReviewStatistics(
    val totalPlanned: Int,
    val completed: Int,
    val cancelled: Int,
    val postponed: Int,
    val addedAfterConfirm: Int,
    val completionRate: Double,
    val totalChanges: Int,
    val changesByType: Map<ChangeType, Int>
)

data class DailyStatistics(
    val date: LocalDate,
    val totalTasks: Int,
    val completed: Int,
    val cancelled: Int,
    val postponed: Int,
    val pending: Int
)
