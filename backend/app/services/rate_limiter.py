"""
Rate limiting service for the Socratic AI Engine.

This module provides rate limiting functionality to prevent abuse and ensure
fair usage across all users. It uses the existing cache service for storage
and implements a sliding window algorithm for accurate rate limiting.

Rate Limits:
- General endpoints: 60 requests/minute per user
- Chat messages: 10 messages/minute per user
- Voice transcriptions: 5 transcriptions/minute per user
"""

import time
from typing import Optional
from app.services.cache import get_cache


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded."""

    def __init__(self, limit: int, window: int, retry_after: int):
        """
        Initialize rate limit exception.
        
        Args:
            limit: The rate limit (requests per window)
            window: The time window in seconds
            retry_after: Seconds until the user can retry
        """
        self.limit = limit
        self.window = window
        self.retry_after = retry_after
        super().__init__(
            f"Rate limit exceeded: {limit} requests per {window} seconds. "
            f"Retry after {retry_after} seconds."
        )


class RateLimiter:
    """
    Rate limiter using sliding window algorithm.
    
    This implementation uses the cache service to store request timestamps
    and implements a sliding window to accurately track request rates.
    """

    def __init__(self):
        """Initialize the rate limiter."""
        self.cache = get_cache()

    def _get_key(self, identifier: str, endpoint: str) -> str:
        """
        Generate cache key for rate limiting.
        
        Args:
            identifier: User ID or IP address
            endpoint: Endpoint identifier (e.g., 'general', 'chat', 'voice')
            
        Returns:
            Cache key for rate limiting
        """
        return f"rate_limit:{endpoint}:{identifier}"

    def _get_requests(self, key: str) -> list[float]:
        """
        Get list of request timestamps from cache.
        
        Args:
            key: Cache key
            
        Returns:
            List of request timestamps
        """
        requests = self.cache.get(key)
        return requests if requests is not None else []

    def _clean_old_requests(
        self, requests: list[float], window: int
    ) -> list[float]:
        """
        Remove requests older than the time window.
        
        Args:
            requests: List of request timestamps
            window: Time window in seconds
            
        Returns:
            Filtered list of recent requests
        """
        current_time = time.time()
        cutoff_time = current_time - window
        return [req for req in requests if req > cutoff_time]

    def check_rate_limit(
        self,
        identifier: str,
        endpoint: str,
        limit: int,
        window: int = 60,
        increment: bool = True,
    ) -> tuple[bool, int, int]:
        """
        Check if request is within rate limit.
        
        Args:
            identifier: User ID or IP address
            endpoint: Endpoint identifier
            limit: Maximum requests allowed in window
            window: Time window in seconds (default: 60)
            increment: Whether to increment the counter (default: True)
            
        Returns:
            Tuple of (is_allowed, remaining, retry_after)
            - is_allowed: Whether the request is allowed
            - remaining: Number of requests remaining in window
            - retry_after: Seconds until rate limit resets (0 if allowed)
        """
        key = self._get_key(identifier, endpoint)

        # Get existing requests
        requests = self._get_requests(key)

        # Clean old requests
        requests = self._clean_old_requests(requests, window)

        # Check if limit exceeded
        if len(requests) >= limit:
            # Calculate retry_after (time until oldest request expires)
            oldest_request = min(requests)
            retry_after = int(window - (time.time() - oldest_request)) + 1
            return False, 0, retry_after

        # Only increment if requested
        if increment:
            # Add current request
            current_time = time.time()
            requests.append(current_time)

            # Store updated requests (TTL = window + buffer)
            self.cache.set(key, requests, ttl_seconds=window + 10)

        # Calculate remaining requests
        remaining = limit - len(requests)

        return True, remaining, 0

    def increment(
        self,
        identifier: str,
        endpoint: str,
        limit: int,
        window: int = 60,
    ):
        """
        Increment rate limit counter and raise exception if exceeded.
        
        Args:
            identifier: User ID or IP address
            endpoint: Endpoint identifier
            limit: Maximum requests allowed in window
            window: Time window in seconds (default: 60)
            
        Raises:
            RateLimitExceeded: If rate limit is exceeded
        """
        is_allowed, remaining, retry_after = self.check_rate_limit(
            identifier, endpoint, limit, window
        )

        if not is_allowed:
            raise RateLimitExceeded(limit, window, retry_after)

    def get_rate_limit_info(
        self,
        identifier: str,
        endpoint: str,
        limit: int,
        window: int = 60,
    ) -> dict:
        """
        Get rate limit information without incrementing.
        
        Args:
            identifier: User ID or IP address
            endpoint: Endpoint identifier
            limit: Maximum requests allowed in window
            window: Time window in seconds (default: 60)
            
        Returns:
            Dictionary with rate limit information
        """
        # Use check_rate_limit with increment=False
        _, remaining, _ = self.check_rate_limit(
            identifier, endpoint, limit, window, increment=False
        )

        reset_time = int(time.time() + window)

        return {
            "limit": limit,
            "remaining": remaining,
            "reset": reset_time,
            "window": window,
        }


# Global rate limiter instance
_rate_limiter_instance: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """
    Get the global rate limiter instance.
    
    Returns:
        The global RateLimiter instance
    """
    global _rate_limiter_instance
    if _rate_limiter_instance is None:
        _rate_limiter_instance = RateLimiter()
    return _rate_limiter_instance


# Rate limit configurations
RATE_LIMITS = {
    "general": {"limit": 60, "window": 60},  # 60 requests/minute
    "chat": {"limit": 10, "window": 60},  # 10 messages/minute
    "voice": {"limit": 5, "window": 60},  # 5 transcriptions/minute
}
