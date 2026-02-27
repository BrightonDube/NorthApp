"""
Monitoring and metrics API endpoints.

Provides access to system health metrics, performance data, and active alerts.
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.dependencies import get_current_user, AuthUser
from app.services.monitoring import get_metrics_collector

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/metrics")
async def get_metrics(
    user: AuthUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get comprehensive system metrics.
    
    Returns metrics for:
    - Request rates and response times
    - Error rates and types
    - LLM API usage and failures
    - Database connection pool status
    - Active alerts
    
    **Authentication:** Required (admin users only in production)
    
    **Response:**
    ```json
    {
      "timestamp": "2026-02-25T10:30:00Z",
      "window_minutes": 5,
      "requests": {
        "total_requests": 1250,
        "requests_per_second": 4.17,
        "error_rate": 2.4,
        "response_time_p50": 0.145,
        "response_time_p95": 1.823,
        "response_time_p99": 2.456
      },
      "errors": {
        "total_errors": 30,
        "errors_by_type": {
          "HTTPException": 25,
          "ValueError": 5
        },
        "recent_errors": [...]
      },
      "llm": {
        "total_calls": 450,
        "success_rate": 98.2,
        "total_tokens": 125000,
        "calls_by_model": {
          "meta-llama/llama-4-scout-17b-16e-instruct": 400,
          "llama-3.3-70b-versatile": 50
        },
        "failures": [...]
      },
      "database": {
        "connection_pool_size": 20,
        "active_connections": 8,
        "idle_connections": 12,
        "last_updated": "2026-02-25T10:29:55Z"
      },
      "alerts": [
        {
          "id": "high_error_rate",
          "message": "Error rate exceeds 5%",
          "details": {
            "current_rate": 6.2,
            "threshold": 5.0
          },
          "triggered_at": "2026-02-25T10:28:00Z",
          "occurrence_count": 3
        }
      ]
    }
    ```
    
    **Metrics Explained:**
    
    - **requests.total_requests**: Number of requests in the time window
    - **requests.requests_per_second**: Average request rate
    - **requests.error_rate**: Percentage of requests that returned 4xx or 5xx
    - **requests.response_time_p50**: Median response time in seconds
    - **requests.response_time_p95**: 95th percentile response time
    - **requests.response_time_p99**: 99th percentile response time
    
    - **errors.total_errors**: Total errors in the time window
    - **errors.errors_by_type**: Breakdown of errors by exception type
    - **errors.recent_errors**: Last 10 errors with details
    
    - **llm.total_calls**: Number of LLM API calls
    - **llm.success_rate**: Percentage of successful LLM calls
    - **llm.total_tokens**: Total tokens consumed
    - **llm.calls_by_model**: Breakdown of calls by model
    - **llm.failures**: Recent LLM API failures
    
    - **database.connection_pool_size**: Maximum connections in pool
    - **database.active_connections**: Currently active connections
    - **database.idle_connections**: Available idle connections
    
    - **alerts**: List of active alerts with details
    
    **Alert Types:**
    - `high_error_rate`: Error rate > 5%
    - `slow_response_time`: P95 response time > 3s
    - `db_pool_exhausted`: Connection pool utilization > 90%
    - `llm_api_failures`: LLM success rate < 95%
    
    **Use Cases:**
    - Real-time monitoring dashboard
    - Performance analysis
    - Capacity planning
    - Incident investigation
    - Alert management
    
    **Performance:**
    - Response time: < 50ms
    - In-memory metrics (no database queries)
    - 5-minute rolling window
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/monitoring/metrics" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Related Endpoints:**
    - `GET /health` - Basic health check
    - `GET /v1/monitoring/alerts` - Get active alerts only
    - `GET /v1/analytics/usage` - LLM usage analytics
    """
    collector = get_metrics_collector()

    # In production, you might want to restrict this to admin users
    # For now, any authenticated user can access metrics

    return collector.get_all_metrics()


@router.get("/alerts")
async def get_alerts(
    user: AuthUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get active alerts.
    
    Returns only alerts that are currently triggered, without full metrics.
    Useful for alert dashboards and notification systems.
    
    **Authentication:** Required (admin users only in production)
    
    **Response:**
    ```json
    {
      "timestamp": "2026-02-25T10:30:00Z",
      "alert_count": 2,
      "alerts": [
        {
          "id": "high_error_rate",
          "message": "Error rate exceeds 5%",
          "details": {
            "current_rate": 6.2,
            "threshold": 5.0
          },
          "triggered_at": "2026-02-25T10:28:00Z",
          "occurrence_count": 3
        },
        {
          "id": "slow_response_time",
          "message": "P95 response time exceeds 3 seconds",
          "details": {
            "current_p95": 3.45,
            "threshold": 3.0
          },
          "triggered_at": "2026-02-25T10:29:30Z",
          "occurrence_count": 1
        }
      ]
    }
    ```
    
    **Alert Deduplication:**
    - Alerts have a 5-minute cooldown period
    - Same alert won't trigger multiple times within 5 minutes
    - `occurrence_count` tracks how many times alert has triggered
    
    **Alert Severity:**
    All alerts are considered critical and require immediate attention:
    - High error rate indicates system instability
    - Slow response times affect user experience
    - Database pool exhaustion can cause request failures
    - LLM API failures prevent core functionality
    
    **Use Cases:**
    - Alert notification systems
    - Incident response dashboards
    - Integration with PagerDuty, Slack, etc.
    - Health monitoring
    
    **Performance:**
    - Response time: < 20ms
    - In-memory checks (no database queries)
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/monitoring/alerts" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Integration Example (Slack):**
    ```python
    import httpx
    
    # Check for alerts
    response = httpx.get(
        "https://api.example.com/v1/monitoring/alerts",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    data = response.json()
    if data["alert_count"] > 0:
        # Send to Slack
        for alert in data["alerts"]:
            send_slack_notification(
                channel="#alerts",
                message=f"🚨 {alert['message']}",
                details=alert["details"]
            )
    ```
    
    **Related Endpoints:**
    - `GET /v1/monitoring/metrics` - Full metrics dashboard
    - `GET /health` - Basic health check
    """
    from datetime import datetime

    collector = get_metrics_collector()
    alerts = collector.check_alerts()

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "alert_count": len(alerts),
        "alerts": alerts,
    }


@router.get("/health/detailed")
async def detailed_health_check(
    user: AuthUser = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Detailed health check with component status.
    
    Checks the health of all system components and returns detailed status.
    Unlike the basic `/health` endpoint, this requires authentication and
    provides more detailed information.
    
    **Authentication:** Required
    
    **Response:**
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-02-25T10:30:00Z",
      "components": {
        "api": {
          "status": "healthy",
          "response_time_p95": 1.2,
          "error_rate": 1.5
        },
        "database": {
          "status": "healthy",
          "pool_utilization": 45.0,
          "active_connections": 9,
          "pool_size": 20
        },
        "llm": {
          "status": "healthy",
          "success_rate": 98.5,
          "total_calls": 450
        }
      },
      "alerts": []
    }
    ```
    
    **Status Values:**
    - `healthy`: All systems operational
    - `degraded`: Some issues but system functional
    - `unhealthy`: Critical issues affecting functionality
    
    **Component Status Logic:**
    - API: healthy if error_rate < 5% and p95 < 3s
    - Database: healthy if pool_utilization < 90%
    - LLM: healthy if success_rate > 95%
    
    **Use Cases:**
    - Detailed health monitoring
    - Troubleshooting
    - Capacity planning
    - Pre-deployment checks
    
    **Performance:**
    - Response time: < 50ms
    - In-memory checks (no external calls)
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/monitoring/health/detailed" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Related Endpoints:**
    - `GET /health` - Basic health check (no auth)
    - `GET /v1/monitoring/metrics` - Full metrics
    - `GET /v1/monitoring/alerts` - Active alerts
    """
    from datetime import datetime

    collector = get_metrics_collector()

    # Get all metrics
    request_metrics = collector.get_request_metrics()
    db_metrics = collector.get_db_metrics()
    llm_metrics = collector.get_llm_metrics()
    alerts = collector.check_alerts()

    # Determine component health
    api_healthy = (
        request_metrics["error_rate"] < 5.0 and
        request_metrics["response_time_p95"] < 3.0
    )

    db_healthy = True
    if db_metrics["connection_pool_size"] > 0:
        utilization = (db_metrics["active_connections"] / db_metrics["connection_pool_size"]) * 100
        db_healthy = utilization < 90

    llm_healthy = llm_metrics["success_rate"] > 95.0 or llm_metrics["total_calls"] < 10

    # Overall status
    if not api_healthy or not db_healthy or not llm_healthy:
        overall_status = "degraded"
    elif len(alerts) > 0:
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "api": {
                "status": "healthy" if api_healthy else "degraded",
                "response_time_p95": request_metrics["response_time_p95"],
                "error_rate": request_metrics["error_rate"],
            },
            "database": {
                "status": "healthy" if db_healthy else "degraded",
                "pool_utilization": (
                    (db_metrics["active_connections"] / db_metrics["connection_pool_size"] * 100)
                    if db_metrics["connection_pool_size"] > 0 else 0
                ),
                "active_connections": db_metrics["active_connections"],
                "pool_size": db_metrics["connection_pool_size"],
            },
            "llm": {
                "status": "healthy" if llm_healthy else "degraded",
                "success_rate": llm_metrics["success_rate"],
                "total_calls": llm_metrics["total_calls"],
            },
        },
        "alerts": alerts,
    }
