package com.planner.weekly.util

import com.planner.weekly.security.UserPrincipal
import org.springframework.security.core.context.SecurityContextHolder

fun getCurrentUserId(): String {
    val authentication = SecurityContextHolder.getContext().authentication
    val principal = authentication.principal as UserPrincipal
    return principal.id
}
