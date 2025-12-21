package com.planner.weekly.api.v1

import com.planner.weekly.domain.notification.NotificationService
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.dto.response.NotificationResponse
import com.planner.weekly.security.UserPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Notification APIs")
@SecurityRequirement(name = "bearerAuth")
class NotificationController(
    private val notificationService: NotificationService
) {

    @GetMapping
    @Operation(summary = "Get all notifications")
    fun getNotifications(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<List<NotificationResponse>> {
        val notifications = notificationService.getUserNotifications(user.id)
        return ApiResponse.ok(notifications.map { NotificationResponse.from(it) })
    }

    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications")
    fun getUnreadNotifications(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<List<NotificationResponse>> {
        val notifications = notificationService.getUnreadNotifications(user.id)
        return ApiResponse.ok(notifications.map { NotificationResponse.from(it) })
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Get unread notification count")
    fun getUnreadCount(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<Long> {
        val count = notificationService.getUnreadCount(user.id)
        return ApiResponse.ok(count)
    }

    @PostMapping("/{notificationId}/read")
    @Operation(summary = "Mark a notification as read")
    fun markAsRead(
        @AuthenticationPrincipal user: UserPrincipal,
        @PathVariable notificationId: String
    ): ApiResponse<NotificationResponse> {
        val notification = notificationService.markAsRead(notificationId, user.id)
        return ApiResponse.ok(NotificationResponse.from(notification))
    }

    @PostMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    fun markAllAsRead(
        @AuthenticationPrincipal user: UserPrincipal
    ): ApiResponse<Unit> {
        notificationService.markAllAsRead(user.id)
        return ApiResponse.ok(Unit)
    }
}
