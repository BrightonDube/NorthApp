"""
Tests for monitoring and alerting functionality.
"""

import pytest
import time
from app.services.monitoring import MetricsCollector


@pytest.fixture
def collector():
    """Create a fresh metrics collector for each test."""
    return MetricsCollector(window_minutes=5)


def test_record_request(collector):
    """Test recording request metrics."""
    collector.record_request(
        duration=0.5,
        status_code=200,
        endpoint="/v1/chat/stream"
    )
    
    metrics = collector.get_request_metrics()
    assert metrics["total_requests"] == 1
    assert metrics["error_rate"] == 0.0


def test_record_error(collector):
    """Test recording errors."""
    collector.record_error(
        error_type="HTTPException",
        endpoint="/v1/chat/stream",
        details={"message": "Test error"}
    )
    
    metrics = collector.get_error_metrics()
    assert metrics["total_errors"] == 1
    assert "HTTPException" in metrics["errors_by_type"]


def test_record_llm_call(collector):
    """Test recording LLM API calls."""
    collector.record_llm_call(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        tokens=500,
        success=True,
        duration=1.2
    )
    
    metrics = collector.get_llm_metrics()
    assert metrics["total_calls"] == 1
    assert metrics["success_rate"] == 100.0
    assert metrics["total_tokens"] == 500


def test_error_rate_calculation(collector):
    """Test error rate calculation."""
    # Record 8 successful requests
    for _ in range(8):
        collector.record_request(0.5, 200, "/test")
    
    # Record 2 error requests
    for _ in range(2):
        collector.record_request(0.5, 500, "/test")
    
    metrics = collector.get_request_metrics()
    assert metrics["total_requests"] == 10
    assert metrics["error_rate"] == 20.0  # 2/10 = 20%


def test_response_time_percentiles(collector):
    """Test response time percentile calculations."""
    # Record requests with varying durations
    durations = [0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 2.5, 3.0]
    for duration in durations:
        collector.record_request(duration, 200, "/test")
    
    metrics = collector.get_request_metrics()
    assert metrics["response_time_p50"] > 0
    assert metrics["response_time_p95"] > metrics["response_time_p50"]
    assert metrics["response_time_p99"] >= metrics["response_time_p95"]  # >= because with small samples they can be equal


def test_alert_high_error_rate(collector):
    """Test high error rate alert."""
    # Record 10 requests with 60% error rate
    for _ in range(4):
        collector.record_request(0.5, 200, "/test")
    for _ in range(6):
        collector.record_request(0.5, 500, "/test")
    
    alerts = collector.check_alerts()
    
    # Should trigger high error rate alert
    alert_ids = [a["id"] for a in alerts]
    assert "high_error_rate" in alert_ids


def test_alert_slow_response_time(collector):
    """Test slow response time alert."""
    # Record requests with slow p95
    for _ in range(95):
        collector.record_request(1.0, 200, "/test")
    for _ in range(5):
        collector.record_request(4.0, 200, "/test")  # Slow requests
    
    alerts = collector.check_alerts()
    
    # Should trigger slow response time alert
    alert_ids = [a["id"] for a in alerts]
    assert "slow_response_time" in alert_ids


def test_alert_llm_failures(collector):
    """Test LLM API failure alert."""
    # Record 20 LLM calls with 90% success rate
    for _ in range(18):
        collector.record_llm_call("test-model", 100, True, 1.0)
    for _ in range(2):
        collector.record_llm_call("test-model", 100, False, 1.0, "API Error")
    
    alerts = collector.check_alerts()
    
    # Should trigger LLM failure alert (90% < 95%)
    alert_ids = [a["id"] for a in alerts]
    assert "llm_api_failures" in alert_ids


def test_alert_db_pool_exhausted(collector):
    """Test database pool exhaustion alert."""
    # Set pool metrics with 95% utilization
    collector.update_db_metrics(
        pool_size=20,
        active=19,
        idle=1
    )
    
    alerts = collector.check_alerts()
    
    # Should trigger pool exhaustion alert
    alert_ids = [a["id"] for a in alerts]
    assert "db_pool_exhausted" in alert_ids


def test_alert_deduplication(collector):
    """Test alert deduplication with cooldown."""
    # Trigger high error rate
    for _ in range(10):
        collector.record_request(0.5, 500, "/test")
    
    # First check should trigger alert
    alerts1 = collector.check_alerts()
    assert len(alerts1) > 0
    
    # Immediate second check should not trigger (cooldown)
    alerts2 = collector.check_alerts()
    assert len(alerts2) == 0  # In cooldown


def test_time_window_filtering(collector):
    """Test that old metrics are filtered out."""
    # Record a request
    collector.record_request(0.5, 200, "/test")
    
    # Verify it's counted
    metrics1 = collector.get_request_metrics()
    assert metrics1["total_requests"] == 1
    
    # Manually set timestamp to be outside window
    if collector._requests:
        collector._requests[0]["timestamp"] = time.time() - (collector.window_seconds + 60)
    
    # Should be filtered out now
    metrics2 = collector.get_request_metrics()
    assert metrics2["total_requests"] == 0


def test_llm_metrics_by_model(collector):
    """Test LLM metrics breakdown by model."""
    # Record calls to different models
    collector.record_llm_call("model-a", 100, True, 1.0)
    collector.record_llm_call("model-a", 150, True, 1.2)
    collector.record_llm_call("model-b", 200, True, 0.8)
    
    metrics = collector.get_llm_metrics()
    
    assert metrics["total_calls"] == 3
    assert metrics["total_tokens"] == 450
    assert metrics["calls_by_model"]["model-a"] == 2
    assert metrics["calls_by_model"]["model-b"] == 1


def test_get_all_metrics(collector):
    """Test getting all metrics at once."""
    # Record some data
    collector.record_request(0.5, 200, "/test")
    collector.record_error("TestError", "/test")
    collector.record_llm_call("test-model", 100, True, 1.0)
    collector.update_db_metrics(20, 5, 15)
    
    # Get all metrics
    all_metrics = collector.get_all_metrics()
    
    # Verify structure
    assert "timestamp" in all_metrics
    assert "window_minutes" in all_metrics
    assert "requests" in all_metrics
    assert "errors" in all_metrics
    assert "llm" in all_metrics
    assert "database" in all_metrics
    assert "alerts" in all_metrics


def test_empty_metrics(collector):
    """Test metrics with no data."""
    metrics = collector.get_request_metrics()
    
    assert metrics["total_requests"] == 0
    assert metrics["requests_per_second"] == 0.0
    assert metrics["error_rate"] == 0.0
    assert metrics["response_time_p50"] == 0.0


def test_db_metrics_update(collector):
    """Test database metrics update."""
    from datetime import datetime
    
    collector.update_db_metrics(
        pool_size=20,
        active=8,
        idle=12
    )
    
    metrics = collector.get_db_metrics()
    
    assert metrics["connection_pool_size"] == 20
    assert metrics["active_connections"] == 8
    assert metrics["idle_connections"] == 12
    assert isinstance(metrics["last_updated"], datetime)


def test_recent_errors_limit(collector):
    """Test that recent errors are limited to 10."""
    # Record 20 errors
    for i in range(20):
        collector.record_error(f"Error{i}", "/test")
    
    metrics = collector.get_error_metrics()
    
    # Should only return last 10
    assert len(metrics["recent_errors"]) == 10


def test_llm_failures_limit(collector):
    """Test that LLM failures are limited to 10."""
    # Record 20 failures
    for i in range(20):
        collector.record_llm_call("test-model", 100, False, 1.0, f"Error {i}")
    
    metrics = collector.get_llm_metrics()
    
    # Should only return last 10
    assert len(metrics["failures"]) == 10


def test_requests_per_second_calculation(collector):
    """Test requests per second calculation."""
    # Record 300 requests (should be 1 req/sec over 5 min window)
    for _ in range(300):
        collector.record_request(0.5, 200, "/test")
    
    metrics = collector.get_request_metrics()
    
    # 300 requests / 300 seconds = 1 req/sec
    assert metrics["requests_per_second"] == pytest.approx(1.0, rel=0.1)
