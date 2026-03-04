from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.api.v1.router import router as v1_router
from app.tasks.scheduler import start_scheduler, stop_scheduler
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.monitoring import MonitoringMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application...")
    try:
        start_scheduler()
    except Exception as exc:
        # Log but do NOT re-raise — the /health endpoint must remain reachable
        # so Railway can confirm the container is alive while we diagnose.
        logger.critical("Scheduler failed to start: %s", exc, exc_info=True)
    yield
    logger.info("Shutting down application...")
    try:
        stop_scheduler()
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Settings initialization — wrapped in try/except so the /health endpoint
# remains reachable even when env vars are misconfigured.  This lets Railway
# healthchecks pass while we diagnose missing variables in the deploy logs.
# ---------------------------------------------------------------------------
import os

_REQUIRED_ENV_VARS = [
    "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "GROQ_API_KEY", "VOYAGE_API_KEY",
]

_startup_ok = True
try:
    settings = get_settings()
except Exception as exc:
    _startup_ok = False
    logger.critical("Failed to load settings: %s", exc)
    logger.critical(
        "Environment variable status: %s",
        {v: ("SET" if os.environ.get(v) else "MISSING") for v in _REQUIRED_ENV_VARS},
    )
    # Create a minimal settings-like object so the module can finish loading
    settings = None  # type: ignore[assignment]

if _startup_ok:
    # Log env-var presence at startup for diagnostics (values are NOT logged)
    logger.info(
        "Environment variable status: %s",
        {v: ("SET" if os.environ.get(v) else "MISSING") for v in _REQUIRED_ENV_VARS},
    )

# Initialize Sentry if DSN is provided
if settings and getattr(settings, 'sentry_dsn', None):
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profiles_sample_rate=settings.sentry_profiles_sample_rate,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ],
        # Send PII (Personally Identifiable Information) - set to False in production
        send_default_pii=False,
        # Attach stack traces to messages
        attach_stacktrace=True,
    )
    logger.info("Sentry error tracking initialized")
else:
    logger.warning("Sentry DSN not configured - error tracking disabled")

app = FastAPI(
    title="North AI Coaching API",
    version="1.0.0",
    description="""
# North AI Coaching API

A FastAPI-based backend system that implements Socratic coaching methodology through intelligent AI agents.

## Overview

The North AI Coaching API provides personalized AI coaching through Socratic questioning, helping users
discover insights through self-reflection rather than receiving direct answers. The system integrates
multiple LLM providers, implements RAG for long-term memory, and provides real-time streaming responses.

## Key Features

### 🎯 Socratic Coaching
- AI never provides direct solutions, only powerful questions
- Adapts to user's firmness level (0-10 scale)
- Implements GROW model coaching framework
- Multiple specialized coaches (Strategic, Leadership, Writing, etc.)

### 🧠 Long-Term Memory
- Automatic fact extraction from conversations
- Vector-based semantic search (RAG)
- Personalized context injection
- User-controlled memory management

### 🎙️ Voice Interface
- Speech-to-text via Groq Whisper Large v3
- Text-to-speech via Groq TTS (Orpheus)
- Pro subscription feature

### 📊 Goal Tracking
- Create and manage goals with subtasks
- Progress tracking and XP rewards
- AI-powered goal planning
- Daily check-ins

### 🔄 Real-Time Streaming
- Server-Sent Events (SSE) for instant feedback
- First token < 1 second
- Natural conversation flow

## Authentication

All endpoints (except `/health`) require JWT authentication via Supabase Auth.

**Header Format:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Getting a Token:**
1. User authenticates via Supabase Auth (mobile app)
2. Supabase returns JWT access token
3. Include token in Authorization header
4. Backend validates token and extracts user_id

## Error Handling

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Common Error Codes:**
- `INVALID_TOKEN` (401): JWT token invalid or expired
- `FORBIDDEN` (403): User lacks required permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT` (429): Too many requests
- `LLM_ERROR` (503): LLM API temporarily unavailable
- `INTERNAL_ERROR` (500): Unexpected server error

## Rate Limits

- 60 requests/minute per user (general endpoints)
- 10 chat messages/minute per user
- 5 voice transcriptions/minute per user

## API Endpoints

### Chat & Coaching
- `POST /v1/chat/stream` - Stream AI coaching responses
- `POST /v1/chat/voice` - Transcribe audio to text (Pro)
- `POST /v1/chat/voice/response` - Generate audio response (Pro)

### Memory Management
- `GET /v1/memories` - List user's memories
- `DELETE /v1/memories/{id}` - Delete a memory

### Settings
- `GET /v1/settings` - Get user settings
- `PATCH /v1/settings` - Update settings

### Goals & Tasks
- `GET /v1/goals` - List goals
- `POST /v1/goals` - Create goal
- `PATCH /v1/goals/{id}` - Update goal
- `DELETE /v1/goals/{id}` - Delete goal
- `POST /v1/goals/{id}/subtasks` - Add subtask
- `PATCH /v1/subtasks/{id}` - Update subtask

### GROW Model
- `GET /v1/sessions/{id}/grow` - Get GROW state
- `PATCH /v1/sessions/{id}/grow` - Update GROW state

### Check-Ins
- `GET /v1/check-ins` - List check-ins
- `POST /v1/check-ins` - Create check-in

### AI Agents
- `POST /v1/agent/plan` - AI goal planning
- `POST /v1/agent/panic` - Crisis support
- `POST /v1/agent/curate` - Resource curation

### Analytics
- `GET /v1/analytics/usage` - LLM usage metrics

### Gamification
- `GET /v1/xp` - Get user XP and level
- `POST /v1/xp/award` - Award XP for actions

### Integrations
- `GET /v1/integrations/calendar/auth` - Google Calendar OAuth
- `GET /v1/integrations/calendar/callback` - OAuth callback
- `GET /v1/integrations/calendar/events` - Fetch calendar events

## Performance

- API response time p95 < 2 seconds
- First token in stream < 1 second
- Memory extraction completes within 30 seconds
- Supports 100+ concurrent users

## Support

For issues or questions:
- GitHub: [repository-url]
- Email: support@example.com
- Documentation: https://docs.example.com
""",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add monitoring middleware (before rate limiting to track all requests)
app.add_middleware(MonitoringMiddleware)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

app.include_router(v1_router, prefix="/v1")


# ---------------------------------------------------------------------------
# DO NOT REMOVE: Required by Railway for deployment health checks.
# This endpoint MUST remain lightweight (no DB, no auth) and always return
# 200 OK so Railway can confirm the container is alive.  The app binds to
# 0.0.0.0:$PORT — see railway.toml startCommand.
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """
    Health check endpoint for monitoring and load balancers.
    
    Returns the API status and version. This endpoint does not require authentication
    and is used by monitoring systems, load balancers, and deployment platforms.
    
    **Authentication:** Not required
    
    **Response:**
    ```json
    {
      "status": "ok",
      "version": "1.0.0"
    }
    ```
    
    **Status Values:**
    - `ok`: API is healthy and accepting requests
    - `degraded`: API is operational but experiencing issues
    - `down`: API is not operational
    
    **Use Cases:**
    - Railway health checks
    - Load balancer health probes
    - Uptime monitoring
    - Deployment verification
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/health"
    ```
    
    **Performance:**
    - Response time: < 50ms
    - No database queries
    - Minimal resource usage
    
    **Related Endpoints:**
    - `GET /docs` - Interactive API documentation
    - `GET /openapi.json` - OpenAPI specification
    """
    status = "ok" if _startup_ok else "degraded"
    return {"status": status, "version": "1.0.0", "deployed": "2026-03-03-01:40"}
