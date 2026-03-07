"""Centralised AI service wrapping the Groq SDK with retry logic and monitoring.

All LLM interactions in the backend should flow through this module so that
retries, timeouts, metrics, and error handling are consistent everywhere.
"""

from typing import AsyncGenerator, Optional
from dataclasses import dataclass
import time
import asyncio
import logging

from groq import AsyncGroq

from app.services.groq_client import (          # canonical model registry
    MODEL_PRIMARY,
    MODEL_FAST,
    MODEL_SCOUT,
    MODEL_VISION,
    MODEL_WHISPER,
    MODEL_TTS,
)

# Re-export so callers can do `from app.services.ai_service import MODEL_PRIMARY`
__all__ = [
    "AIService", "AIRequest", "AIResponse", "AIServiceError",
    "MODEL_PRIMARY", "MODEL_FAST", "MODEL_SCOUT",
    "MODEL_VISION", "MODEL_WHISPER", "MODEL_TTS",
]

# ---------------------------------------------------------------------------
# Tuning knobs
# ---------------------------------------------------------------------------
DEFAULT_TEMPERATURE: float = 0.7
DEFAULT_MAX_TOKENS: int = 1024
DEFAULT_TIMEOUT: int = 30
MAX_RETRIES: int = 3
RETRY_DELAY_BASE: float = 1.0  # seconds, doubled on each retry

logger = logging.getLogger(__name__)


@dataclass
class AIRequest:
    """Request to AI service"""
    messages: list[dict]
    temperature: float = DEFAULT_TEMPERATURE
    max_tokens: int = DEFAULT_MAX_TOKENS
    model: str = MODEL_PRIMARY
    stream: bool = True


@dataclass
class AIResponse:
    """Response from AI service"""
    content: str
    model: str
    tokens_used: int
    duration_ms: int
    success: bool
    error: Optional[str] = None


class AIServiceError(Exception):
    """Raised when AI service fails"""
    pass


class AIService:
    """
    Centralized AI service for all LLM interactions.
    
    Why this exists:
    - Single point of failure/success for AI calls
    - Consistent error handling across the app
    - Built-in retry logic with exponential backoff
    - Automatic logging and monitoring
    - Easy to test with mocks
    - Multimodal support (text, voice, vision)
    
    Design decisions:
    - Uses Groq exclusively (Llama 3.3 70B, Whisper, TTS, Vision)
    - Streaming by default for better UX
    - Timeout protection to prevent hanging
    - Structured errors for client handling
    """
    
    def __init__(self, api_key: str):
        self.client = AsyncGroq(api_key=api_key)
        self._metrics = []  # For monitoring
    
    async def stream_completion(
        self,
        request: AIRequest
    ) -> AsyncGenerator[str, None]:
        """
        Stream AI completion with retry logic.

        Retry strategy:
        - The *connection* to Groq (creating the stream object) is retryable
          because no data has been yielded to the caller yet.
        - Once we start yielding chunks we are past the point of no return;
          an error during iteration is raised immediately because the caller
          already received partial data and retrying would produce duplicates.

        Args:
            request: AI request configuration

        Yields:
            Content chunks as they arrive

        Raises:
            AIServiceError: If all connection attempts fail or iteration breaks.
        """
        start_time = time.time()

        # ------------------------------------------------------------------
        # Phase 1 — Establish the stream (retryable)
        # ------------------------------------------------------------------
        stream = None
        last_error: Exception | None = None

        for attempt in range(MAX_RETRIES):
            try:
                stream = await self.client.chat.completions.create(
                    model=request.model,
                    messages=request.messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    timeout=DEFAULT_TIMEOUT,
                    stream=True,
                )
                break  # connection succeeded
            except Exception as e:
                last_error = e
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(
                        "AI stream connection attempt %d failed, retrying in %.1fs: %s",
                        attempt + 1, delay, e,
                    )
                    await asyncio.sleep(delay)
                # else: fall through, stream remains None

        if stream is None:
            self._log_failure(request, str(last_error))
            raise AIServiceError(
                f"AI service failed after {MAX_RETRIES} connection attempts: {last_error}"
            )

        # ------------------------------------------------------------------
        # Phase 2 — Iterate chunks (NOT retryable — data already flowing)
        # ------------------------------------------------------------------
        full_response = ""
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    full_response += delta
                    yield delta
        except Exception as e:
            # Partial data may have been yielded; log and raise so the
            # caller (chat_agent) can emit an error event to the client.
            self._log_failure(request, str(e))
            raise AIServiceError(f"AI stream interrupted: {e}") from e

        # ------------------------------------------------------------------
        # Phase 3 — Record success metrics
        # ------------------------------------------------------------------
        duration = (time.time() - start_time) * 1000
        self._log_success(request, full_response, duration)
    
    async def complete(
        self,
        request: AIRequest
    ) -> AIResponse:
        """
        Non-streaming completion (for background tasks).
        
        Args:
            request: AI request configuration
            
        Returns:
            Complete AI response
            
        Raises:
            AIServiceError: If all retries fail
        """
        for attempt in range(MAX_RETRIES):
            try:
                start_time = time.time()
                
                response = await self.client.chat.completions.create(
                    model=request.model,
                    messages=request.messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    timeout=DEFAULT_TIMEOUT,
                    stream=False,
                )
                
                # Extract response content
                content = response.choices[0].message.content
                tokens_used = response.usage.total_tokens if response.usage else 0
                
                # Calculate duration
                duration = (time.time() - start_time) * 1000
                
                # Success - log metrics
                self._log_success(request, content, duration)
                
                return AIResponse(
                    content=content,
                    model=request.model,
                    tokens_used=tokens_used,
                    duration_ms=int(duration),
                    success=True,
                    error=None
                )
                
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    # Retry with exponential backoff
                    delay = RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(
                        "AI complete attempt %d failed, retrying in %.1fs: %s",
                        attempt + 1, delay, e,
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    # Final failure
                    duration = (time.time() - start_time) * 1000
                    self._log_failure(request, str(e))
                    
                    return AIResponse(
                        content="",
                        model=request.model,
                        tokens_used=0,
                        duration_ms=int(duration),
                        success=False,
                        error=str(e)
                    )
    
    def _log_success(self, request: AIRequest, response: str, duration: float):
        """Log successful AI call for monitoring"""
        logger.info(
            "AI request successful",
            extra={
                "model": request.model,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "response_length": len(response),
                "duration_ms": duration,
            }
        )
        
        # Store metrics for monitoring
        self._metrics.append({
            "timestamp": time.time(),
            "model": request.model,
            "duration_ms": duration,
            "success": True,
        })
    
    def _log_failure(self, request: AIRequest, error: str):
        """Log failed AI call for debugging"""
        logger.error(
            "AI request failed",
            extra={
                "model": request.model,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "error": error,
            }
        )
        
        # Store metrics for monitoring
        self._metrics.append({
            "timestamp": time.time(),
            "model": request.model,
            "success": False,
            "error": error,
        })
