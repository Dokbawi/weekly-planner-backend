package com.planner.weekly.security

import com.planner.weekly.domain.user.User
import org.springframework.security.core.GrantedAuthority
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.UserDetails

data class UserPrincipal(
    val id: String,
    val email: String,
    private val password: String,
    private val authorities: Collection<GrantedAuthority>
) : UserDetails {

    override fun getAuthorities(): Collection<GrantedAuthority> = authorities
    override fun getPassword(): String = password
    override fun getUsername(): String = email
    override fun isAccountNonExpired(): Boolean = true
    override fun isAccountNonLocked(): Boolean = true
    override fun isCredentialsNonExpired(): Boolean = true
    override fun isEnabled(): Boolean = true

    companion object {
        fun from(user: User): UserPrincipal {
            return UserPrincipal(
                id = user.id!!,
                email = user.email,
                password = user.password,
                authorities = listOf(SimpleGrantedAuthority("ROLE_USER"))
            )
        }
    }
}
