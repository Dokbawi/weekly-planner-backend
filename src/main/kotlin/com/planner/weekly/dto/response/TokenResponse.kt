package com.planner.weekly.dto.response

data class TokenResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long
)
