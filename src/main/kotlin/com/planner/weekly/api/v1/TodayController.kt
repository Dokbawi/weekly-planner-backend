package com.planner.weekly.api.v1

import com.planner.weekly.domain.plan.WeeklyPlanService
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.dto.response.TaskResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/today")
@Tag(name = "Today", description = "Today's tasks API")
@SecurityRequirement(name = "bearerAuth")
class TodayController(
    private val weeklyPlanService: WeeklyPlanService
) {

    @GetMapping
    @Operation(summary = "Get today's tasks")
    fun getTodayTasks(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<List<TaskResponse>> {
        val tasks = weeklyPlanService.getTodayTasks(user.id)
        return ApiResponse.ok(tasks.map { TaskResponse.from(it) })
    }
}
