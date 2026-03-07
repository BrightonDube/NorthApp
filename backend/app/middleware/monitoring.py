"""
Monitoring middleware for tracking request metrics and performance.

IMPORTANT — Why this is a pure ASGI middleware instead of BaseHTTPMiddleware:
    Starlette's BaseHTTPMiddleware fully buffers the response body before
    passing it to the next handler.  That is fatal for Server-Sent Events
    (SSE) / StreamingResponse because the client never receives any chunks
    until the entire AI response has been generated — defeating the whole
    point of streaming.

    By implementing __call__ directly against the ASGI (scope/receive/send)
    interface we intercept only the 'http.response.start' event (which
    carries the status code) and let every 'http.response.body' chunk pass
    through immediately without buffering.
"""

import time
import logging

from starlette.types import ASGIApp, Receive, Scope, Send

from app.services.monitoring import get_metrics_collector

logger = logging.getLogger(__name__)


class MonitoringMiddleware:
    """
    Pure-ASGI monitoring middleware — zero response buffering.

    Records per-request duration and status code via MetricsCollector.
    Adds an X-Response-Time header to every response.
    Logs a warning for requests that exceed 2 seconds.

    Design note: We deliberately do NOT subclass BaseHTTPMiddleware because
    that class re-wraps the send channel in a way that accumulates the full
    body in memory.  Streaming endpoints (chat, panic) would silently break.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.collector = get_metrics_collector()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Only instrument HTTP requests; pass everything else straight through.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        endpoint: str = scope.get("path", "unknown")

        # status_code will be captured when we see the http.response.start event.
        captured_status: list[int] = []

        async def send_wrapper(message: dict) -> None:
            """
            Intercept ASGI send messages so we can read the status code from
            the 'http.response.start' event and add our timing header.
            All messages are forwarded to the real send channel immediately —
            no buffering occurs.
            """
            if message["type"] == "http.response.start":
                captured_status.append(message.get("status", 0))

                # Append our timing header.  The headers list is a list of
                # (name_bytes, value_bytes) tuples; we must not mutate the
                # original tuple so we build a fresh list.
                duration_so_far = time.time() - start_time
                extra_header = (
                    b"x-response-time",
                    f"{duration_so_far:.3f}s".encode(),
                )
                original_headers = list(message.get("headers", []))
                message = {
                    **message,
                    "headers": original_headers + [extra_header],
                }

            # Forward immediately — this is what keeps SSE working.
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            duration = time.time() - start_time
            self.collector.record_error(
                error_type=type(exc).__name__,
                endpoint=endpoint,
                details={"message": str(exc), "duration": duration},
            )
            logger.error(
                "Request failed: %s",
                endpoint,
                extra={"endpoint": endpoint, "error": str(exc), "duration": duration},
                exc_info=True,
            )
            raise
        finally:
            duration = time.time() - start_time
            status_code = captured_status[0] if captured_status else 0

            self.collector.record_request(
                duration=duration,
                status_code=status_code,
                endpoint=endpoint,
            )

            if duration > 2.0:
                logger.warning(
                    "Slow request detected: %s (%.3fs, status=%d)",
                    endpoint,
                    duration,
                    status_code,
                )
