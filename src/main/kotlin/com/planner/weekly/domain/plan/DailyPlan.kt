package com.planner.weekly.domain.plan

import java.time.LocalDate

data class DailyPlan(
    val date: LocalDate,
    val tasks: MutableList<Task> = mutableListOf(),
    val notes: String? = null
)
