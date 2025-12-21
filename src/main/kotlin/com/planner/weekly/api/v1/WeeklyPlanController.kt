package com.planner.weekly.api.v1

import com.planner.weekly.domain.plan.WeeklyPlanService
import com.planner.weekly.dto.request.CreateWeeklyPlanRequest
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.dto.response.WeeklyPlanResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/plans")
@Tag(name = "Weekly Plans", description = "Weekly plan management APIs")
@SecurityRequirement(name = "bearerAuth")
class WeeklyPlanController(
    private val weeklyPlanService: WeeklyPlanService
) {

    @PostMapping
    @Operation(summary = "Create a new weekly plan")
    fun createPlan(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestBody request: CreateWeeklyPlanRequest
    ): ApiResponse<WeeklyPlanResponse> {
        val plan = weeklyPlanService.createWeeklyPlan(user.id, request.weekStartDate)
        return ApiResponse.ok(WeeklyPlanResponse.from(plan))
    }

    @GetMapping
    @Operation(summary = "Get all weekly plans for current user")
    fun getPlans(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<List<WeeklyPlanResponse>> {
        val plans = weeklyPlanService.getUserPlans(user.id)
        return ApiResponse.ok(plans.map { WeeklyPlanResponse.from(it) })
    }

    @GetMapping("/{planId}")
    @Operation(summary = "Get a specific weekly plan")
    fun getPlan(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String
    ): ApiResponse<WeeklyPlanResponse> {
        val plan = weeklyPlanService.getWeeklyPlan(planId, user.id)
        return ApiResponse.ok(WeeklyPlanResponse.from(plan))
    }

    @GetMapping("/by-date")
    @Operation(summary = "Get weekly plan by date")
    fun getPlanByDate(
        @AuthenticationPrincipal user: UserPrincipal,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate
    ): ApiResponse<WeeklyPlanResponse> {
        val plan = weeklyPlanService.getWeeklyPlanByDate(user.id, date)
        return ApiResponse.ok(WeeklyPlanResponse.from(plan))
    }

    @PostMapping("/{planId}/confirm")
    @Operation(summary = "Confirm a weekly plan")
    fun confirmPlan(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String
    ): ApiResponse<WeeklyPlanResponse> {
        val plan = weeklyPlanService.confirmPlan(planId, user.id)
        return ApiResponse.ok(WeeklyPlanResponse.from(plan))
    }
}
