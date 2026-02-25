"""
Monitoring middleware for tracking request metrics and performance.
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.services.monitoring import get_metrics_collector

logger = logging.getLogger(__name__)


class MonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track request metrics and performance.
    
    Records:
    - Request duration
    - Status codes
    - Endpoint paths
    - Errors
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.collector = get_metrics_collector()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and record metrics."""
        start_time = time.time()

        # Get endpoint path
        endpoint = request.url.path

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Record metrics
            self.collector.record_request(
                duration=duration,
                status_code=response.status_code,
                endpoint=endpoint,
            )

            # Add performance headers
            response.headers["X-Response-Time"] = f"{duration:.3f}s"

            # Log slow requests
            if duration > 2.0:
                logger.warning(
                    f"Slow request detected: {endpoint}",
                    extra={
                        "endpoint": endpoint,
                        "duration": duration,
                        "status_code": response.status_code,
                    }
                )

            return response

        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time

            # Record error
            self.collector.record_error(
                error_type=type(e).__name__,
                endpoint=endpoint,
                details={
                    "message": str(e),
                    "duration": duration,
                }
            )

            # Log error
            logger.error(
                f"Request failed: {endpoint}",
                extra={
                    "endpoint": endpoint,
                    "error": str(e),
                    "duration": duration,
                },
                exc_info=True,
            )

            # Re-raise to let FastAPI handle it
            raise
