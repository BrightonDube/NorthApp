from groq import AsyncGroq

from app.config import get_settings

# Model mapping used across the app.
MODEL_COMPLEX = "llama-3.3-70b-versatile"
MODEL_FAST = "llama-3.1-8b-instant"
MODEL_REASONING = "deepseek-r1-distill-llama-70b"

_client: AsyncGroq | None = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncGroq(api_key=settings.groq_api_key)
    return _client

