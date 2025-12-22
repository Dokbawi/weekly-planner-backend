package com.planner.weekly.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import org.springframework.web.util.ContentCachingRequestWrapper
import org.springframework.web.util.ContentCachingResponseWrapper

@Component
class LoggingFilter : OncePerRequestFilter() {

    private val logger = LoggerFactory.getLogger(LoggingFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val startTime = System.currentTimeMillis()

        val wrappedRequest = ContentCachingRequestWrapper(request)
        val wrappedResponse = ContentCachingResponseWrapper(response)

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse)
        } finally {
            val duration = System.currentTimeMillis() - startTime
            logRequestResponse(wrappedRequest, wrappedResponse, duration)
            wrappedResponse.copyBodyToResponse()
        }
    }

    private fun logRequestResponse(
        request: ContentCachingRequestWrapper,
        response: ContentCachingResponseWrapper,
        duration: Long
    ) {
        val method = request.method
        val uri = request.requestURI
        val queryString = request.queryString?.let { "?$it" } ?: ""
        val status = response.status

        logger.info("[$status] $method $uri$queryString - ${getStatusText(status)} ($duration ms)")
    }

    private fun getStatusText(status: Int): String {
        return when (status) {
            in 200..299 -> "SUCCESS"
            in 400..499 -> "CLIENT_ERROR"
            in 500..599 -> "SERVER_ERROR"
            else -> "UNKNOWN"
        }
    }
}
