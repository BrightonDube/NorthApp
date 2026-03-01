"""
Monitoring and alerting service for tracking errors, performance, and system health.

This module provides comprehensive monitoring capabilities including:
- Error tracking and reporting
- Performance metrics collection
- Alert threshold monitoring
- Health check aggregation
"""

import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque
from threading import Lock

logger = logging.getLogger(__name__)


class MetricsCollector:
    """
    Collects and aggregates application metrics in-memory.
    
    Tracks:
    - Request counts and rates
    - Response times (p50, p95, p99)
    - Error rates
    - LLM API usage and failures
    - Database connection pool status
    """

    def __init__(self, window_minutes: int = 5):
        self.window_minutes = window_minutes
        self.window_seconds = window_minutes * 60

        # Thread-safe locks
        self._lock = Lock()

        # Request metrics (timestamp, duration, status)
        self._requests: deque = deque(maxlen=10000)

        # Error tracking (timestamp, error_type, endpoint)
        self._errors: deque = deque(maxlen=1000)

        # LLM API metrics (timestamp, model, tokens, success)
        self._llm_calls: deque = deque(maxlen=5000)

        # Database metrics
        self._db_metrics: Dict[str, Any] = {
            "connection_pool_size": 0,
            "active_connections": 0,
            "idle_connections": 0,
            "last_updated": None,
        }

        # Alert state tracking
        self._alert_state: Dict[str, Dict] = defaultdict(lambda: {
            "triggered": False,
            "triggered_at": None,
            "count": 0,
        })

    def record_request(self, duration: float, status_code: int, endpoint: str):
        """Record a completed HTTP request."""
        with self._lock:
            self._requests.append({
                "timestamp": time.time(),
                "duration": duration,
                "status_code": status_code,
                "endpoint": endpoint,
            })

    def record_error(self, error_type: str, endpoint: str, details: Optional[Dict] = None):
        """Record an error occurrence."""
        with self._lock:
            self._errors.append({
                "timestamp": time.time(),
                "error_type": error_type,
                "endpoint": endpoint,
                "details": details or {},
            })

    def record_llm_call(
        self,
        model: str,
        tokens: int,
        success: bool,
        duration: float,
        error: Optional[str] = None
    ):
        """Record an LLM API call."""
        with self._lock:
            self._llm_calls.append({
                "timestamp": time.time(),
                "model": model,
                "tokens": tokens,
                "success": success,
                "duration": duration,
                "error": error,
            })

    def update_db_metrics(
        self,
        pool_size: int,
        active: int,
        idle: int
    ):
        """Update database connection pool metrics."""
        with self._lock:
            self._db_metrics.update({
                "connection_pool_size": pool_size,
                "active_connections": active,
                "idle_connections": idle,
                "last_updated": datetime.now(timezone.utc),
            })

    def _get_recent_items(self, items: deque, window_seconds: Optional[int] = None) -> List[Dict]:
        """Get items within the time window."""
        if window_seconds is None:
            window_seconds = self.window_seconds

        cutoff = time.time() - window_seconds
        return [item for item in items if item["timestamp"] >= cutoff]

    def get_request_metrics(self) -> Dict[str, Any]:
        """Calculate request metrics for the time window."""
        with self._lock:
            recent_requests = self._get_recent_items(self._requests)

        if not recent_requests:
            return {
                "total_requests": 0,
                "requests_per_second": 0.0,
                "error_rate": 0.0,
                "response_time_p50": 0.0,
                "response_time_p95": 0.0,
                "response_time_p99": 0.0,
            }

        total = len(recent_requests)
        errors = sum(1 for r in recent_requests if r["status_code"] >= 400)
        durations = sorted([r["duration"] for r in recent_requests])

        return {
            "total_requests": total,
            "requests_per_second": total / self.window_seconds,
            "error_rate": (errors / total * 100) if total > 0 else 0.0,
            "response_time_p50": durations[int(len(durations) * 0.5)] if durations else 0.0,
            "response_time_p95": durations[int(len(durations) * 0.95)] if durations else 0.0,
            "response_time_p99": durations[int(len(durations) * 0.99)] if durations else 0.0,
        }

    def get_error_metrics(self) -> Dict[str, Any]:
        """Get error breakdown by type."""
        with self._lock:
            recent_errors = self._get_recent_items(self._errors)

        error_counts = defaultdict(int)
        for error in recent_errors:
            error_counts[error["error_type"]] += 1

        return {
            "total_errors": len(recent_errors),
            "errors_by_type": dict(error_counts),
            "recent_errors": recent_errors[-10:],  # Last 10 errors
        }

    def get_llm_metrics(self) -> Dict[str, Any]:
        """Get LLM API usage metrics."""
        with self._lock:
            recent_calls = self._get_recent_items(self._llm_calls)

        if not recent_calls:
            return {
                "total_calls": 0,
                "success_rate": 100.0,
                "total_tokens": 0,
                "calls_by_model": {},
                "failures": [],
            }

        total = len(recent_calls)
        successes = sum(1 for c in recent_calls if c["success"])
        total_tokens = sum(c["tokens"] for c in recent_calls)

        calls_by_model = defaultdict(int)
        for call in recent_calls:
            calls_by_model[call["model"]] += 1

        failures = [
            {
                "model": c["model"],
                "error": c["error"],
                "timestamp": datetime.fromtimestamp(c["timestamp"]).isoformat(),
            }
            for c in recent_calls if not c["success"]
        ]

        return {
            "total_calls": total,
            "success_rate": (successes / total * 100) if total > 0 else 100.0,
            "total_tokens": total_tokens,
            "calls_by_model": dict(calls_by_model),
            "failures": failures[-10:],  # Last 10 failures
        }

    def get_db_metrics(self) -> Dict[str, Any]:
        """Get database connection pool metrics."""
        with self._lock:
            return self._db_metrics.copy()

    def check_alerts(self) -> List[Dict[str, Any]]:
        """
        Check if any alert thresholds are exceeded.
        
        Returns list of active alerts.
        """
        alerts = []

        # Check error rate
        request_metrics = self.get_request_metrics()
        if request_metrics["error_rate"] > 5.0:
            alert = self._create_alert(
                "high_error_rate",
                "Error rate exceeds 5%",
                {
                    "current_rate": request_metrics["error_rate"],
                    "threshold": 5.0,
                }
            )
            if alert:
                alerts.append(alert)

        # Check response time
        if request_metrics["response_time_p95"] > 3.0:
            alert = self._create_alert(
                "slow_response_time",
                "P95 response time exceeds 3 seconds",
                {
                    "current_p95": request_metrics["response_time_p95"],
                    "threshold": 3.0,
                }
            )
            if alert:
                alerts.append(alert)

        # Check database connection pool
        db_metrics = self.get_db_metrics()
        if db_metrics["connection_pool_size"] > 0:
            utilization = (db_metrics["active_connections"] / db_metrics["connection_pool_size"]) * 100
            if utilization > 90:
                alert = self._create_alert(
                    "db_pool_exhausted",
                    "Database connection pool near exhaustion",
                    {
                        "utilization": utilization,
                        "active": db_metrics["active_connections"],
                        "pool_size": db_metrics["connection_pool_size"],
                    }
                )
                if alert:
                    alerts.append(alert)

        # Check LLM API failures
        llm_metrics = self.get_llm_metrics()
        if llm_metrics["success_rate"] < 95.0 and llm_metrics["total_calls"] > 10:
            alert = self._create_alert(
                "llm_api_failures",
                "LLM API success rate below 95%",
                {
                    "success_rate": llm_metrics["success_rate"],
                    "total_calls": llm_metrics["total_calls"],
                    "recent_failures": llm_metrics["failures"][:3],
                }
            )
            if alert:
                alerts.append(alert)

        return alerts

    def _create_alert(self, alert_id: str, message: str, details: Dict) -> Optional[Dict]:
        """
        Create an alert if it hasn't been triggered recently.
        
        Implements alert deduplication with 5-minute cooldown.
        """
        with self._lock:
            state = self._alert_state[alert_id]
            now = datetime.now(timezone.utc)

            # Check if alert is in cooldown period (5 minutes)
            if state["triggered"]:
                if state["triggered_at"] and (now - state["triggered_at"]) < timedelta(minutes=5):
                    # Still in cooldown, don't trigger again
                    return None

            # Trigger alert
            state["triggered"] = True
            state["triggered_at"] = now
            state["count"] += 1

            return {
                "id": alert_id,
                "message": message,
                "details": details,
                "triggered_at": now.isoformat(),
                "occurrence_count": state["count"],
            }

    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all metrics in a single call."""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "window_minutes": self.window_minutes,
            "requests": self.get_request_metrics(),
            "errors": self.get_error_metrics(),
            "llm": self.get_llm_metrics(),
            "database": self.get_db_metrics(),
            "alerts": self.check_alerts(),
        }


# Global metrics collector instance
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create the global metrics collector instance."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector(window_minutes=5)
    return _metrics_collector


async def check_alerts_periodically():
    """
    Background task to check alerts periodically.
    
    This should be called by the scheduler to check for alert conditions
    and log them for external monitoring systems to pick up.
    """
    collector = get_metrics_collector()
    alerts = collector.check_alerts()

    if alerts:
        logger.warning(
            "Active alerts detected",
            extra={
                "alert_count": len(alerts),
                "alerts": alerts,
            }
        )

        # In production, you would send these to:
        # - Slack webhook
        # - PagerDuty
        # - Email
        # - SMS
        for alert in alerts:
            logger.critical(
                f"ALERT: {alert['message']}",
                extra=alert
            )
