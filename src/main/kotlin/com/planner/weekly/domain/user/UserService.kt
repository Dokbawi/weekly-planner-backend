package com.planner.weekly.domain.user

import com.planner.weekly.dto.request.RegisterRequest
import com.planner.weekly.exception.ApiException
import com.planner.weekly.exception.ErrorCode
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class UserService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder
) {

    fun register(request: RegisterRequest): User {
        if (userRepository.existsByEmail(request.email)) {
            throw ApiException(ErrorCode.EMAIL_ALREADY_EXISTS)
        }

        val user = User(
            email = request.email,
            password = passwordEncoder.encode(request.password),
            name = request.name
        )

        return userRepository.save(user)
    }

    fun findByEmail(email: String): User {
        return userRepository.findByEmail(email)
            .orElseThrow { ApiException(ErrorCode.USER_NOT_FOUND) }
    }

    fun findById(id: String): User {
        return userRepository.findById(id)
            .orElseThrow { ApiException(ErrorCode.USER_NOT_FOUND) }
    }

    fun updateSettings(userId: String, settings: UserSettings): User {
        val user = findById(userId)
        val updatedUser = user.copy(
            settings = settings,
            updatedAt = Instant.now()
        )
        return userRepository.save(updatedUser)
    }
}
