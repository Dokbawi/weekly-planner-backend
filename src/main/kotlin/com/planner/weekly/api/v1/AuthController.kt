package com.planner.weekly.api.v1

import com.planner.weekly.domain.user.UserService
import com.planner.weekly.dto.request.LoginRequest
import com.planner.weekly.dto.request.RegisterRequest
import com.planner.weekly.dto.response.ApiResponse
import com.planner.weekly.dto.response.TokenResponse
import com.planner.weekly.dto.response.UserResponse
import com.planner.weekly.exception.ApiException
import com.planner.weekly.exception.ErrorCode
import com.planner.weekly.security.JwtTokenProvider
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "User authentication APIs")
class AuthController(
    private val userService: UserService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val passwordEncoder: PasswordEncoder
) {

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    fun register(@Valid @RequestBody request: RegisterRequest): ApiResponse<UserResponse> {
        val user = userService.register(request)
        return ApiResponse.ok(UserResponse.from(user))
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get JWT token")
    fun login(@Valid @RequestBody request: LoginRequest): ApiResponse<TokenResponse> {
        val user = try {
            userService.findByEmail(request.email)
        } catch (e: ApiException) {
            throw ApiException(ErrorCode.INVALID_CREDENTIALS)
        }

        if (!passwordEncoder.matches(request.password, user.password)) {
            throw ApiException(ErrorCode.INVALID_CREDENTIALS)
        }

        val token = jwtTokenProvider.generateToken(user.id!!, user.email)
        val response = TokenResponse(
            accessToken = token,
            expiresIn = jwtTokenProvider.getExpirationInSeconds()
        )

        return ApiResponse.ok(response)
    }
}
