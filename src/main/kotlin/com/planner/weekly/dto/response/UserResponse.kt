package com.planner.weekly.dto.response

import com.planner.weekly.domain.user.User
import java.time.DayOfWeek

data class UserResponse(
    val id: String,
    val email: String,
    val name: String,
    val settings: UserSettingsResponse
) {
    companion object {
        fun from(user: User) = UserResponse(
            id = user.id!!,
            email = user.email,
            name = user.name,
            settings = UserSettingsResponse(
                timezone = user.settings.timezone,
                planningDay = user.settings.planningDay,
                reviewDay = user.settings.reviewDay,
                defaultReminderMinutes = user.settings.defaultReminderMinutes
            )
        )
    }
}

data class UserSettingsResponse(
    val timezone: String,
    val planningDay: DayOfWeek,
    val reviewDay: DayOfWeek,
    val defaultReminderMinutes: Int
)
