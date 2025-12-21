package com.planner.weekly.api.v1

import com.planner.weekly.domain.changelog.ChangeLog
import com.planner.weekly.domain.changelog.ChangeTrackingService
import com.planner.weekly.domain.plan.WeeklyPlanService
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/plans/{planId}/changes")
@Tag(name = "Change Logs", description = "Change history APIs")
@SecurityRequirement(name = "bearerAuth")
class ChangeLogController(
    private val changeTrackingService: ChangeTrackingService,
    private val weeklyPlanService: WeeklyPlanService
) {

    @GetMapping
    @Operation(summary = "Get all changes for a plan")
    fun getChanges(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String
    ): ApiResponse<List<ChangeLog>> {
        // Verify user owns this plan
        weeklyPlanService.getWeeklyPlan(planId, user.id)
        val changes = changeTrackingService.getChangesForPlan(planId)
        return ApiResponse.ok(changes)
    }

    @GetMapping("/by-date")
    @Operation(summary = "Get changes for a specific date")
    fun getChangesByDate(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate
    ): ApiResponse<List<ChangeLog>> {
        // Verify user owns this plan
        weeklyPlanService.getWeeklyPlan(planId, user.id)
        val changes = changeTrackingService.getChangesForDate(planId, date)
        return ApiResponse.ok(changes)
    }
}
