package com.planner.weekly.api.v1

import com.planner.weekly.domain.review.WeeklyReview
import com.planner.weekly.domain.review.WeeklyReviewService
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/plans/{planId}/review")
@Tag(name = "Weekly Review", description = "Weekly review APIs")
@SecurityRequirement(name = "bearerAuth")
class ReviewController(
    private val weeklyReviewService: WeeklyReviewService
) {

    @GetMapping
    @Operation(summary = "Generate weekly review for a plan")
    fun getReview(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable planId: String
    ): ApiResponse<WeeklyReview> {
        val review = weeklyReviewService.generateReview(planId, user.id)
        return ApiResponse.ok(review)
    }
}
