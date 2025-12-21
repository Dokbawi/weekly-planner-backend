package com.planner.weekly.dto.response

import com.planner.weekly.domain.plan.PlanStatus
import com.planner.weekly.domain.plan.WeeklyPlan
import java.time.Instant
import java.time.LocalDate

data class WeeklyPlanResponse(
    val id: String,
    val userId: String,
    val weekStartDate: LocalDate,
    val weekEndDate: LocalDate,
    val status: PlanStatus,
    val dailyPlans: Map<LocalDate, DailyPlanResponse>,
    val createdAt: Instant,
    val confirmedAt: Instant?
) {
    companion object {
        fun from(plan: WeeklyPlan) = WeeklyPlanResponse(
            id = plan.id!!,
            userId = plan.userId,
            weekStartDate = plan.weekStartDate,
            weekEndDate = plan.weekEndDate,
            status = plan.status,
            dailyPlans = plan.dailyPlans.mapValues { DailyPlanResponse.from(it.value) },
            createdAt = plan.createdAt,
            confirmedAt = plan.confirmedAt
        )
    }
}

data class DailyPlanResponse(
    val date: LocalDate,
    val tasks: List<TaskResponse>,
    val notes: String?
) {
    companion object {
        fun from(dailyPlan: com.planner.weekly.domain.plan.DailyPlan) = DailyPlanResponse(
            date = dailyPlan.date,
            tasks = dailyPlan.tasks.map { TaskResponse.from(it) },
            notes = dailyPlan.notes
        )
    }
}
