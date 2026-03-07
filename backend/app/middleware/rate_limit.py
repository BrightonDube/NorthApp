"""
Rate limiting middleware for FastAPI.

IMPORTANT — Why this is a pure ASGI middleware instead of BaseHTTPMiddleware:
    Starlette's BaseHTTPMiddleware buffers the entire HTTP response body
    before forwarding it to the client.  This silently breaks SSE /
    StreamingResponse endpoints (e.g. /v1/chat/stream) because the client
    never receives chunks until the full AI response has been generated.

    A pure ASGI middleware intercepts the send channel directly, allowing
    each response body chunk to flow through to the client without any
    intermediate buffering while still being able to inject headers.
"""

import json
import time
import logging

from starlette.types import ASGIApp, Receive, Scope, Send

from app.services.rate_limiter import get_rate_limiter, RATE_LIMITS

logger = logging.getLogger(__name__)

# Paths that bypass rate limiting entirely.
_EXEMPT_PATH_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")


def _get_endpoint_type(path: str) -> str:
    """Map a URL path to one of our three rate-limit buckets."""
    if "/chat/stream" in path:
        return "chat"
    if "/chat/voice" in path or "/voice/" in path:
        return "voice"
    return "general"


def _get_client_ip(scope: Scope) -> str:
    """Extract the client IP address from the ASGI scope."""
    client = scope.get("client")
    if client:
        return client[0]
    return "unknown"


class RateLimitMiddleware:
    """
    Pure-ASGI rate limiting middleware — zero response buffering.

    Checks the per-user/IP sliding-window counter BEFORE forwarding the
    request.  If the limit is exceeded a 429 JSON response is returned
    immediately without touching the downstream app.

    When the request is allowed, rate-limit headers are injected into the
    'http.response.start' event so they appear on every response, including
    streaming ones, without buffering the body.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app
        self.rate_limiter = get_rate_limiter()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Only apply rate limiting to HTTP requests.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path: str = scope.get("path", "")

        # Exempt paths skip rate limiting entirely.
        if any(path.startswith(p) for p in _EXEMPT_PATH_PREFIXES):
            await self.app(scope, receive, send)
            return

        # Determine the rate-limit bucket for this path.
        endpoint_type = _get_endpoint_type(path)
        rate_config = RATE_LIMITS[endpoint_type]

        # Use IP address as the identifier (user ID is not yet available at
        # the ASGI layer — authentication happens inside the route handler).
        identifier = f"ip:{_get_client_ip(scope)}"

        try:
            is_allowed, remaining, retry_after = self.rate_limiter.check_rate_limit(
                identifier=identifier,
                endpoint=endpoint_type,
                limit=rate_config["limit"],
                window=rate_config["window"],
                increment=True,
            )
        except Exception as exc:
            # If the rate-limiter itself errors, fail open so we don't block
            # legitimate traffic due to a cache outage.
            logger.error("Rate limiter error, failing open: %s", exc)
            await self.app(scope, receive, send)
            return

        if not is_allowed:
            logger.warning(
                "Rate limit exceeded for %s on %s endpoint. Retry after %ds",
                identifier,
                endpoint_type,
                retry_after,
            )
            reset_time = int(time.time() + retry_after)
            body = json.dumps({
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
            }).encode()

            # Send a compliant 429 response directly via the ASGI send channel.
            await send({
                "type": "http.response.start",
                "status": 429,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(body)).encode()),
                    (b"x-ratelimit-limit", str(rate_config["limit"]).encode()),
                    (b"x-ratelimit-remaining", b"0"),
                    (b"x-ratelimit-reset", str(reset_time).encode()),
                    (b"retry-after", str(retry_after).encode()),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": body,
                "more_body": False,
            })
            return

        # Request is allowed — wrap send to inject rate-limit headers into
        # the response-start event without buffering the body at all.
        limit_info = self.rate_limiter.get_rate_limit_info(
            identifier=identifier,
            endpoint=endpoint_type,
            limit=rate_config["limit"],
            window=rate_config["window"],
        )

        async def send_with_headers(message: dict) -> None:
            """Inject rate-limit headers into the response-start event only."""
            if message["type"] == "http.response.start":
                extra_headers = [
                    (b"x-ratelimit-limit", str(limit_info["limit"]).encode()),
                    (b"x-ratelimit-remaining", str(limit_info["remaining"]).encode()),
                    (b"x-ratelimit-reset", str(limit_info["reset"]).encode()),
                ]
                message = {
                    **message,
                    "headers": list(message.get("headers", [])) + extra_headers,
                }
            # Forward every message (including body chunks) immediately.
            await send(message)

        await self.app(scope, receive, send_with_headers)
