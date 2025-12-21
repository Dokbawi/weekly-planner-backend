package com.planner.weekly.exception

import org.springframework.http.HttpStatus

enum class ErrorCode(
    val status: HttpStatus,
    val code: String,
    val message: String
) {
    // Auth
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "AUTH001", "Invalid email or password"),
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "AUTH002", "Token has expired"),
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "AUTH003", "Invalid token"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH004", "Unauthorized access"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER001", "User not found"),
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "USER002", "Email already exists"),

    // WeeklyPlan
    PLAN_NOT_FOUND(HttpStatus.NOT_FOUND, "PLAN001", "Weekly plan not found"),
    PLAN_ALREADY_EXISTS(HttpStatus.CONFLICT, "PLAN002", "Weekly plan already exists for this week"),
    PLAN_NOT_CONFIRMED(HttpStatus.BAD_REQUEST, "PLAN003", "Plan is not confirmed yet"),
    PLAN_ALREADY_CONFIRMED(HttpStatus.BAD_REQUEST, "PLAN004", "Plan is already confirmed"),

    // Task
    TASK_NOT_FOUND(HttpStatus.NOT_FOUND, "TASK001", "Task not found"),
    INVALID_TASK_STATUS(HttpStatus.BAD_REQUEST, "TASK002", "Invalid task status transition"),
    INVALID_TARGET_DATE(HttpStatus.BAD_REQUEST, "TASK003", "Target date must be within the week"),

    // Notification
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOTIF001", "Notification not found"),

    // General
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "GEN001", "Validation error"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "GEN002", "Internal server error")
}
