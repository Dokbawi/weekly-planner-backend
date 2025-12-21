package com.planner.weekly.exception

class ApiException(
    val errorCode: ErrorCode,
    override val message: String = errorCode.message
) : RuntimeException(message)
