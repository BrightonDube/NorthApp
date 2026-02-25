"""
Rate limiting middleware for FastAPI.

This middleware applies rate limits to API endpoints to prevent abuse
and ensure fair usage. It adds rate limit headers to all responses and
returns 429 status code when limits are exceeded.
"""

import time
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import logging

from app.services.rate_limiter import (
    get_rate_limiter,
    RATE_LIMITS,
)

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce rate limits on API endpoints.
    
    This middleware:
    - Applies different rate limits based on endpoint type
    - Adds rate limit headers to all responses
    - Returns 429 status code when limits are exceeded
    - Exempts health check and documentation endpoints
    """

    def __init__(self, app: ASGIApp):
        """
        Initialize rate limit middleware.
        
        Args:
            app: The ASGI application
        """
        super().__init__(app)
        self.rate_limiter = get_rate_limiter()

    def _get_endpoint_type(self, path: str) -> str:
        """
        Determine the endpoint type for rate limiting.
        
        Args:
            path: Request path
            
        Returns:
            Endpoint type ('chat', 'voice', or 'general')
        """
        if "/chat/stream" in path:
            return "chat"
        elif "/chat/voice" in path or "/voice/" in path:
            return "voice"
        else:
            return "general"

    def _should_skip_rate_limit(self, path: str) -> bool:
        """
        Check if rate limiting should be skipped for this path.
        
        Args:
            path: Request path
            
        Returns:
            True if rate limiting should be skipped
        """
        # Skip rate limiting for these paths
        exempt_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]
        return any(path.startswith(exempt) for exempt in exempt_paths)

    def _get_user_identifier(self, request: Request) -> str:
        """
        Extract user identifier from request.
        
        Tries to get user ID from JWT token, falls back to IP address.
        
        Args:
            request: The request object
            
        Returns:
            User identifier (user_id or IP address)
        """
        # Try to get user ID from request state (set by auth middleware)
        if hasattr(request.state, "user") and hasattr(request.state.user, "id"):
            return request.state.user.id

        # Fall back to IP address for unauthenticated requests
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    def _add_rate_limit_headers(
        self, response: Response, limit_info: dict
    ) -> Response:
        """
        Add rate limit headers to response.
        
        Args:
            response: The response object
            limit_info: Rate limit information
            
        Returns:
            Response with rate limit headers
        """
        response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(limit_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(limit_info["reset"])
        return response

    async def dispatch(self, request: Request, call_next):
        """
        Process request and apply rate limiting.
        
        Args:
            request: The incoming request
            call_next: The next middleware or endpoint
            
        Returns:
            Response with rate limit headers
        """
        # Skip rate limiting for exempt paths
        if self._should_skip_rate_limit(request.url.path):
            return await call_next(request)

        # Get user identifier
        identifier = self._get_user_identifier(request)

        # Determine endpoint type and rate limit
        endpoint_type = self._get_endpoint_type(request.url.path)
        rate_config = RATE_LIMITS[endpoint_type]

        try:
            # Check and increment rate limit
            is_allowed, remaining, retry_after = self.rate_limiter.check_rate_limit(
                identifier=identifier,
                endpoint=endpoint_type,
                limit=rate_config["limit"],
                window=rate_config["window"],
                increment=True,  # Increment on check
            )

            if not is_allowed:
                # Rate limit exceeded
                logger.warning(
                    f"Rate limit exceeded for {identifier} on {endpoint_type} endpoint. "
                    f"Retry after {retry_after}s"
                )

                reset_time = int(time.time() + retry_after)

                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": (
                                f"Rate limit exceeded: {rate_config['limit']} requests "
                                f"per {rate_config['window']} seconds. "
                                f"Please try again in {retry_after} seconds."
                            ),
                            "details": {
                                "limit": rate_config["limit"],
                                "window": rate_config["window"],
                                "retry_after": retry_after,
                            },
                        }
                    },
                    headers={
                        "X-RateLimit-Limit": str(rate_config["limit"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                        "Retry-After": str(retry_after),
                    },
                )

            # Process request
            response = await call_next(request)

            # Add rate limit headers to response (get current info without incrementing)
            limit_info = self.rate_limiter.get_rate_limit_info(
                identifier=identifier,
                endpoint=endpoint_type,
                limit=rate_config["limit"],
                window=rate_config["window"],
            )
            response = self._add_rate_limit_headers(response, limit_info)

            return response

        except Exception as e:
            # Log error but don't block request
            logger.error(f"Rate limiting error: {e}", exc_info=True)
            # Continue without rate limiting on error
            return await call_next(request)
