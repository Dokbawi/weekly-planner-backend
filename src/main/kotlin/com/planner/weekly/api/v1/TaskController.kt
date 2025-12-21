package com.planner.weekly.api.v1

import com.planner.weekly.domain.plan.WeeklyPlanService
import com.planner.weekly.dto.request.CreateTaskRequest
import com.planner.weekly.dto.request.MoveTaskRequest
import com.planner.weekly.dto.request.UpdateTaskRequest
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.dto.response.TaskResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import java.time.LocalDate

@RestController
@RequestMapping("/api/v1/plans/{planId}/tasks")
@Tag(name = "Tasks", description = "Task management APIs")
@SecurityRequirement(name = "bearerAuth")
class TaskController(
    private val weeklyPlanService: WeeklyPlanService
) {

    @PostMapping
    @Operation(summary = "Add a new task to a specific date")
    fun addTask(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate,
        @Valid @RequestBody request: CreateTaskRequest
    ): ApiResponse<TaskResponse> {
        val task = weeklyPlanService.addTask(planId, user.id, date, request)
        return ApiResponse.ok(TaskResponse.from(task))
    }

    @PutMapping("/{taskId}")
    @Operation(summary = "Update a task")
    fun updateTask(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String,
        @PathVariable taskId: String,
        @RequestBody request: UpdateTaskRequest
    ): ApiResponse<TaskResponse> {
        val task = weeklyPlanService.updateTask(planId, user.id, taskId, request)
        return ApiResponse.ok(TaskResponse.from(task))
    }

    @DeleteMapping("/{taskId}")
    @Operation(summary = "Delete a task")
    fun deleteTask(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String,
        @PathVariable taskId: String,
        @RequestParam(required = false) reason: String?
    ): ApiResponse<Unit> {
        weeklyPlanService.deleteTask(planId, user.id, taskId, reason)
        return ApiResponse.ok(Unit)
    }

    @PostMapping("/{taskId}/move")
    @Operation(summary = "Move a task to another day")
    fun moveTask(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String,
        @PathVariable taskId: String,
        @RequestBody request: MoveTaskRequest
    ): ApiResponse<TaskResponse> {
        val task = weeklyPlanService.moveTask(planId, user.id, taskId, request.targetDate, request.reason)
        return ApiResponse.ok(TaskResponse.from(task))
    }
}
