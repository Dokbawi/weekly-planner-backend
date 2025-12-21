package com.planner.weekly.util

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters

object DateUtils {
    private val DEFAULT_TIMEZONE = ZoneId.of("Asia/Seoul")

    fun getWeekStartDate(date: LocalDate): LocalDate {
        return date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    }

    fun getWeekEndDate(date: LocalDate): LocalDate {
        return date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
    }

    fun getCurrentWeekStartDate(timezone: ZoneId = DEFAULT_TIMEZONE): LocalDate {
        val today = LocalDate.now(timezone)
        return getWeekStartDate(today)
    }

    fun isDateInWeek(date: LocalDate, weekStartDate: LocalDate): Boolean {
        val weekEndDate = getWeekEndDate(weekStartDate)
        return !date.isBefore(weekStartDate) && !date.isAfter(weekEndDate)
    }
}
