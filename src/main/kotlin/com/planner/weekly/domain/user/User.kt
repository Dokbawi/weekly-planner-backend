package com.planner.weekly.domain.user

import org.springframework.data.annotation.Id
import org.springframework.data.mongodb.core.mapping.Document
import java.time.DayOfWeek
import java.time.Instant

@Document(collection = "users")
data class User(
    @Id
    val id: String? = null,
    val email: String,
    val password: String,
    val name: String,
    val settings: UserSettings = UserSettings(),
    val createdAt: Instant = Instant.now(),
    val updatedAt: Instant = Instant.now()
)

data class UserSettings(
    val timezone: String = "Asia/Seoul",
    val planningDay: DayOfWeek = DayOfWeek.SUNDAY,
    val reviewDay: DayOfWeek = DayOfWeek.SATURDAY,
    val defaultReminderMinutes: Int = 30
)
