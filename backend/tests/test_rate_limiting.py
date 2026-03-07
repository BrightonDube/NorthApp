"""
Tests for rate limiting functionality.

This module tests the rate limiting service and middleware to ensure:
- Rate limits are enforced correctly
- Rate limit headers are present in responses
- Clear error messages are returned when limits are exceeded
- Legitimate users are not affected
"""

import pytest
import time
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.services.rate_limiter import (
    RateLimiter,
    RateLimitExceeded,
    RATE_LIMITS,
)
from app.services.cache import get_cache
from app.middleware.rate_limit import RateLimitMiddleware


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache = get_cache()
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def rate_limiter():
    """Create a fresh rate limiter instance for testing."""
    return RateLimiter()


@pytest.fixture
def test_app():
    """Create a test FastAPI app with rate limiting middleware."""
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)
    
    @app.get("/test/general")
    async def general_endpoint():
        return {"message": "success"}
    
    @app.post("/v1/chat/stream")
    async def chat_endpoint():
        return {"message": "chat response"}
    
    @app.post("/v1/chat/voice")
    async def voice_endpoint():
        return {"message": "voice response"}
    
    @app.get("/health")
    async def health_endpoint():
        return {"status": "ok"}
    
    return app


class TestRateLimiter:
    """Test the RateLimiter service."""
    
    def test_rate_limiter_allows_requests_within_limit(self, rate_limiter):
        """Test that requests within the limit are allowed."""
        identifier = "user123"
        endpoint = "test"
        limit = 5
        window = 60
        
        # Make 5 requests (within limit)
        for i in range(limit):
            is_allowed, remaining, retry_after = rate_limiter.check_rate_limit(
                identifier, endpoint, limit, window, increment=True
            )
            assert is_allowed is True
            assert remaining == limit - i - 1
            assert retry_after == 0
    
    def test_rate_limiter_blocks_requests_over_limit(self, rate_limiter):
        """Test that requests over the limit are blocked."""
        identifier = "user123"
        endpoint = "test"
        limit = 5
        window = 60
        
        # Make 5 requests (at limit)
        for _ in range(limit):
            rate_limiter.check_rate_limit(identifier, endpoint, limit, window, increment=True)
        
        # 6th request should be blocked
        is_allowed, remaining, retry_after = rate_limiter.check_rate_limit(
            identifier, endpoint, limit, window, increment=False
        )
        assert is_allowed is False
        assert remaining == 0
        assert retry_after > 0
    
    def test_rate_limiter_sliding_window(self, rate_limiter):
        """Test that the sliding window works correctly."""
        identifier = "user123"
        endpoint = "test"
        limit = 3
        window = 2  # 2 second window for faster testing
        
        # Make 3 requests
        for _ in range(limit):
            rate_limiter.check_rate_limit(identifier, endpoint, limit, window, increment=True)
        
        # 4th request should be blocked
        is_allowed, _, _ = rate_limiter.check_rate_limit(
            identifier, endpoint, limit, window, increment=False
        )
        assert is_allowed is False
        
        # Wait for window to expire
        time.sleep(2.1)
        
        # Should be allowed again
        is_allowed, remaining, _ = rate_limiter.check_rate_limit(
            identifier, endpoint, limit, window, increment=True
        )
        assert is_allowed is True
        assert remaining == limit - 1
    
    def test_rate_limiter_different_users(self, rate_limiter):
        """Test that rate limits are per-user."""
        endpoint = "test"
        limit = 3
        window = 60
        
        # User 1 makes 3 requests
        for _ in range(limit):
            rate_limiter.check_rate_limit("user1", endpoint, limit, window, increment=True)
        
        # User 1's 4th request should be blocked
        is_allowed, _, _ = rate_limiter.check_rate_limit(
            "user1", endpoint, limit, window, increment=False
        )
        assert is_allowed is False
        
        # User 2 should still be allowed
        is_allowed, remaining, _ = rate_limiter.check_rate_limit(
            "user2", endpoint, limit, window, increment=True
        )
        assert is_allowed is True
        assert remaining == limit - 1
    
    def test_rate_limiter_different_endpoints(self, rate_limiter):
        """Test that rate limits are per-endpoint."""
        identifier = "user123"
        limit = 3
        window = 60
        
        # Make 3 requests to endpoint1
        for _ in range(limit):
            rate_limiter.check_rate_limit(identifier, "endpoint1", limit, window, increment=True)
        
        # endpoint1 should be blocked
        is_allowed, _, _ = rate_limiter.check_rate_limit(
            identifier, "endpoint1", limit, window, increment=False
        )
        assert is_allowed is False
        
        # endpoint2 should still be allowed
        is_allowed, remaining, _ = rate_limiter.check_rate_limit(
            identifier, "endpoint2", limit, window, increment=True
        )
        assert is_allowed is True
        assert remaining == limit - 1
    
    def test_rate_limiter_increment_raises_exception(self, rate_limiter):
        """Test that increment raises exception when limit exceeded."""
        identifier = "user123"
        endpoint = "test"
        limit = 3
        window = 60
        
        # Make 3 requests
        for _ in range(limit):
            rate_limiter.increment(identifier, endpoint, limit, window)
        
        # 4th request should raise exception
        with pytest.raises(RateLimitExceeded) as exc_info:
            rate_limiter.increment(identifier, endpoint, limit, window)
        
        assert exc_info.value.limit == limit
        assert exc_info.value.window == window
        assert exc_info.value.retry_after > 0
    
    def test_rate_limiter_get_info(self, rate_limiter):
        """Test getting rate limit information."""
        identifier = "user123"
        endpoint = "test"
        limit = 5
        window = 60
        
        # Make 2 requests
        for _ in range(2):
            rate_limiter.check_rate_limit(identifier, endpoint, limit, window, increment=True)
        
        # Get info
        info = rate_limiter.get_rate_limit_info(identifier, endpoint, limit, window)
        
        assert info["limit"] == limit
        assert info["remaining"] == limit - 2
        assert info["window"] == window
        assert info["reset"] > time.time()


class TestRateLimitMiddleware:
    """Test the rate limiting middleware."""
    
    def test_middleware_adds_rate_limit_headers(self, test_app):
        """Test that rate limit headers are added to responses."""
        client = TestClient(test_app)
        response = client.get("/test/general")
        
        assert response.status_code == 200
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
    
    def test_middleware_enforces_general_rate_limit(self, test_app):
        """Test that general rate limit is enforced."""
        client = TestClient(test_app)
        limit = RATE_LIMITS["general"]["limit"]
        
        # Make requests up to limit
        for i in range(limit):
            response = client.get("/test/general")
            assert response.status_code == 200
            remaining = int(response.headers["X-RateLimit-Remaining"])
            assert remaining == limit - i - 1
        
        # Next request should be rate limited
        response = client.get("/test/general")
        assert response.status_code == 429
        assert "Retry-After" in response.headers
        
        data = response.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "retry_after" in data["error"]["details"]
    
    def test_middleware_enforces_chat_rate_limit(self, test_app):
        """Test that chat rate limit is enforced."""
        client = TestClient(test_app)
        limit = RATE_LIMITS["chat"]["limit"]
        
        # Make requests up to limit
        for _ in range(limit):
            response = client.post("/v1/chat/stream")
            assert response.status_code == 200
        
        # Next request should be rate limited
        response = client.post("/v1/chat/stream")
        assert response.status_code == 429
    
    def test_middleware_enforces_voice_rate_limit(self, test_app):
        """Test that voice rate limit is enforced."""
        client = TestClient(test_app)
        limit = RATE_LIMITS["voice"]["limit"]
        
        # Make requests up to limit
        for _ in range(limit):
            response = client.post("/v1/chat/voice")
            assert response.status_code == 200
        
        # Next request should be rate limited
        response = client.post("/v1/chat/voice")
        assert response.status_code == 429
    
    def test_middleware_skips_health_endpoint(self, test_app):
        """Test that health endpoint is not rate limited."""
        client = TestClient(test_app)
        
        # Make many requests to health endpoint
        for _ in range(100):
            response = client.get("/health")
            assert response.status_code == 200
            # Should not have rate limit headers
            assert "X-RateLimit-Limit" not in response.headers
    
    def test_middleware_error_message_format(self, test_app):
        """Test that error messages are clear and helpful."""
        client = TestClient(test_app)
        limit = RATE_LIMITS["general"]["limit"]
        
        # Exceed rate limit
        for _ in range(limit + 1):
            response = client.get("/test/general")
        
        # Check error format
        data = response.json()
        assert "error" in data
        assert "code" in data["error"]
        assert "message" in data["error"]
        assert "details" in data["error"]
        
        # Check error details
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "Rate limit exceeded" in data["error"]["message"]
        assert data["error"]["details"]["limit"] == limit
        assert data["error"]["details"]["retry_after"] > 0


class TestRateLimitConfiguration:
    """Test rate limit configuration."""
    
    def test_rate_limit_configs_exist(self):
        """Test that all rate limit configurations are defined."""
        assert "general" in RATE_LIMITS
        assert "chat" in RATE_LIMITS
        assert "voice" in RATE_LIMITS
    
    def test_general_rate_limit_config(self):
        """Test general rate limit configuration."""
        config = RATE_LIMITS["general"]
        assert config["limit"] == 60
        assert config["window"] == 60
    
    def test_chat_rate_limit_config(self):
        """Test chat rate limit configuration."""
        config = RATE_LIMITS["chat"]
        assert config["limit"] == 10
        assert config["window"] == 60
    
    def test_voice_rate_limit_config(self):
        """Test voice rate limit configuration."""
        config = RATE_LIMITS["voice"]
        assert config["limit"] == 5
        assert config["window"] == 60
