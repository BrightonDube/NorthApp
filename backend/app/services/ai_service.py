# app/services/ai_service.py

from typing import AsyncGenerator, Optional
from dataclasses import dataclass
import time
import asyncio
import logging
from groq import AsyncGroq

# Constants
MODEL_PRIMARY = "llama-3.3-70b-versatile"
MODEL_SCOUT = "llama-4-scout"  # For advanced reasoning and vision
MODEL_FAST = "llama-3.1-8b-instant"
MODEL_WHISPER = "whisper-large-v3"
MODEL_TTS = "orpheus-english"  # Or latest Groq voice model
MODEL_VISION = "llama-3.2-90b-vision-preview"  # Or llama-4-scout

DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 1024
DEFAULT_TIMEOUT = 30
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1.0  # seconds

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
        
        Args:
            request: AI request configuration
            
        Yields:
            Content chunks as they arrive
            
        Raises:
            AIServiceError: If all retries fail
        """
        for attempt in range(MAX_RETRIES):
            try:
                start_time = time.time()
                
                stream = await self.client.chat.completions.create(
                    model=request.model,
                    messages=request.messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    timeout=DEFAULT_TIMEOUT,
                    stream=True,
                )
                
                full_response = ""
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        full_response += delta
                        yield delta
                
                # Success - log metrics
                duration = (time.time() - start_time) * 1000
                self._log_success(request, full_response, duration)
                return
                
            except Exception as e:
                if attempt < MAX_RETRIES - 1:
                    # Retry with exponential backoff
                    delay = RETRY_DELAY_BASE * (2 ** attempt)
                    logger.warning(
                        f"AI service attempt {attempt + 1} failed, retrying in {delay}s: {e}"
                    )
                    await asyncio.sleep(delay)
                    continue
                else:
                    # Final failure
                    self._log_failure(request, str(e))
                    raise AIServiceError(
                        f"AI service failed after {MAX_RETRIES} attempts: {e}"
                    )
    
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
                        f"AI service attempt {attempt + 1} failed, retrying in {delay}s: {e}"
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
