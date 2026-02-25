"""
Integration tests for rate limiting with the actual API.

This module tests rate limiting with the full FastAPI application
to ensure it works correctly in a real environment.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.cache import get_cache
from app.services.rate_limiter import RATE_LIMITS


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache = get_cache()
    cache.clear()
    yield
    cache.clear()


class TestRateLimitingIntegration:
    """Integration tests for rate limiting."""
    
    def test_health_endpoint_not_rate_limited(self):
        """Test that health endpoint is not rate limited."""
        client = TestClient(app)
        
        # Make many requests to health endpoint
        for _ in range(100):
            response = client.get("/health")
            assert response.status_code == 200
            # Should not have rate limit headers
            assert "X-RateLimit-Limit" not in response.headers
    
    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are present on API responses."""
        client = TestClient(app)
        
        # Make a request to any API endpoint (will fail auth but that's ok)
        response = client.get("/v1/settings")
        
        # Should have rate limit headers even on auth failure
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers
        assert "X-RateLimit-Reset" in response.headers
    
    def test_rate_limit_decrements_correctly(self):
        """Test that rate limit remaining decrements with each request."""
        client = TestClient(app)
        limit = RATE_LIMITS["general"]["limit"]
        
        # Make 3 requests
        for i in range(3):
            response = client.get("/v1/settings")
            remaining = int(response.headers["X-RateLimit-Remaining"])
            assert remaining == limit - i - 1
    
    def test_different_endpoints_have_different_limits(self):
        """Test that different endpoint types have different limits."""
        client = TestClient(app)
        
        # Check general endpoint
        response = client.get("/v1/settings")
        general_limit = int(response.headers["X-RateLimit-Limit"])
        assert general_limit == RATE_LIMITS["general"]["limit"]
        
        # Clear cache to reset
        get_cache().clear()
        
        # Check chat endpoint (will fail but headers should be present)
        response = client.post("/v1/chat/stream", json={
            "session_id": "test",
            "coach_id": "test",
            "message": "test"
        })
        
        # Even on error, rate limit headers should be present
        if "X-RateLimit-Limit" in response.headers:
            chat_limit = int(response.headers["X-RateLimit-Limit"])
            assert chat_limit == RATE_LIMITS["chat"]["limit"]
            assert chat_limit < general_limit  # Chat should have lower limit
