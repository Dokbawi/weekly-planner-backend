package com.planner.weekly.dto.request

import java.time.LocalDate

data class CreateWeeklyPlanRequest(
    val weekStartDate: LocalDate
)

data class UpdateDailyNotesRequest(
    val notes: String?
)
