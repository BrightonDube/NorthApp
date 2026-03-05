"""Groq client singleton and canonical model constant registry.

Every module that needs a model identifier MUST import from here.
Do NOT define model strings inline elsewhere in the codebase.
"""

from groq import AsyncGroq

from app.config import get_settings

# ---------------------------------------------------------------------------
# Model constants – single source of truth for the entire backend
# ---------------------------------------------------------------------------
MODEL_COMPLEX = "llama-3.3-70b-versatile"       # Primary chat / coaching
MODEL_FAST = "llama-3.1-8b-instant"              # Background tasks (memory extraction, insights)
# deepseek-r1-distill-llama-70b was decommissioned by Groq; use versatile model instead
MODEL_REASONING = "llama-3.3-70b-versatile"       # Goal planning / complex reasoning
MODEL_SCOUT = "llama-4-scout"                    # Advanced reasoning & vision
MODEL_VISION = "llama-3.2-90b-vision-preview"    # Multimodal image analysis
MODEL_WHISPER = "whisper-large-v3"               # Speech-to-text
MODEL_TTS = "orpheus-english"                    # Text-to-speech

# Convenience alias used by ai_service.py – identical to MODEL_COMPLEX
MODEL_PRIMARY = MODEL_COMPLEX

# ---------------------------------------------------------------------------
# Singleton Groq client
# ---------------------------------------------------------------------------
_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    """Return a module-level singleton AsyncGroq client.

    The client is lazily initialised on first call using the Groq API key
    from application settings.  Subsequent calls return the same instance.
    """
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client

