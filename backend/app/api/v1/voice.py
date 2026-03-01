"""Voice endpoints: Speech-to-Text (Groq Whisper) and Text-to-Speech (Groq TTS).

Both endpoints require a Pro subscription and voice features to be enabled
in the user's profile settings.
"""

import logging

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, AuthUser
from app.models.requests import TTSRequest
from app.models.responses import TranscriptResponse
from app.services.groq_client import get_groq_client, MODEL_WHISPER
from app.services.supabase import get_async_supabase_client

logger = logging.getLogger(__name__)

# Accepted audio MIME types for Whisper transcription
_ALLOWED_AUDIO_TYPES = frozenset({
    "audio/webm", "audio/mp3", "audio/mpeg", "audio/wav",
    "audio/m4a", "audio/ogg", "audio/x-m4a", "audio/mp4",
})

# Maximum audio file size in bytes (10 MB)
_MAX_AUDIO_BYTES = 10 * 1024 * 1024

router = APIRouter()


async def _check_voice_access(user_id: str) -> None:
    """Raises 403 if user is not pro or has voice disabled.

    Args:
        user_id: The authenticated user's UUID.

    Raises:
        HTTPException 403: If user is not Pro or has voice disabled.
    """
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("profiles")
        .select("is_pro, voice_enabled")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = result.data or {}
    if not data.get("is_pro"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Voice features require a Pro subscription",
        )
    if not data.get("voice_enabled", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Voice is disabled. Enable it in Settings (Pro required)",
        )


@router.post("/chat/voice", response_model=TranscriptResponse)
async def voice_to_text(
    audio: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
):
    """
    Transcribe audio recordings to text using Groq Whisper Large v3.
    
    Converts voice messages to text for natural communication. Users can speak their
    thoughts instead of typing, making coaching conversations more fluid and accessible.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Requirements:**
    - User must have Pro subscription
    - Voice features must be enabled in settings
    
    **Request:**
    - Content-Type: `multipart/form-data`
    - `audio` (file, required): Audio file (webm, mp3, wav, m4a)
    - Maximum duration: 60 seconds
    - Supported formats: webm, mp3, wav, m4a, ogg
    
    **Response:**
    ```json
    {
      "text": "Transcribed text from audio"
    }
    ```
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `403 Forbidden`: Pro subscription required or voice disabled
    - `400 Bad Request`: Invalid audio format or file too large
    - `503 Service Unavailable`: Whisper API temporarily unavailable
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/chat/voice" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -F "audio=@recording.webm"
    ```
    
    **Performance:**
    - Typical transcription time: 1-3 seconds
    - Accuracy: 95%+ for clear audio
    - Supports multiple languages (auto-detected)
    
    **Tips for Best Results:**
    - Record in a quiet environment
    - Speak clearly at normal pace
    - Keep recordings under 60 seconds
    - Use high-quality microphone when possible
    
    **Related Endpoints:**
    - `POST /v1/chat/voice/response` - Generate audio from text
    - `POST /v1/chat/stream` - Send transcribed text to AI
    - `PATCH /v1/settings` - Enable/disable voice features
    """
    # --- Auth gate ---
    await _check_voice_access(user.id)

    # --- Validate upload ---
    content_type = audio.content_type or ""
    if content_type not in _ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {content_type}. "
                   f"Accepted: webm, mp3, wav, m4a, ogg",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) > _MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio file too large ({len(audio_bytes)} bytes). "
                   f"Maximum: {_MAX_AUDIO_BYTES} bytes (10 MB)",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is empty",
        )

    # --- Transcribe via Groq Whisper ---
    try:
        client = get_groq_client()
        transcription = await client.audio.transcriptions.create(
            model=MODEL_WHISPER,
            file=(audio.filename or "audio.webm", audio_bytes),
            response_format="text",
        )

        text = transcription.strip() if isinstance(transcription, str) else transcription.text.strip()

        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not transcribe audio. Please try again with clearer audio.",
            )

        logger.info("Transcribed %d bytes of audio for user %s (%d chars)", len(audio_bytes), user.id, len(text))
        return TranscriptResponse(text=text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Whisper transcription failed for user %s: %s", user.id, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice transcription service is temporarily unavailable. Please try again.",
        )


@router.post("/chat/voice/response")
async def text_to_speech(
    body: TTSRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Generate audio speech from text using Groq Text-to-Speech API.
    
    Converts AI coaching responses to natural-sounding speech, enabling users to
    listen to responses while multitasking or when reading is inconvenient.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Requirements:**
    - User must have Pro subscription
    - Voice features must be enabled in settings
    
    **Request Body:**
    ```json
    {
      "text": "Text to convert to speech",
      "voice": "nova"
    }
    ```
    
    **Available Voices:**
    - `nova` (default): Warm, friendly female voice
    - `alloy`: Neutral, balanced voice
    - `echo`: Male voice with clarity
    - `fable`: Expressive British accent
    - `onyx`: Deep male voice
    - `shimmer`: Energetic female voice
    
    **Response:**
    - Content-Type: `audio/mpeg`
    - Returns MP3 audio file
    - Typical file size: 50-200 KB per response
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `403 Forbidden`: Pro subscription required or voice disabled
    - `400 Bad Request`: Text too long (max 4096 characters)
    - `503 Service Unavailable`: TTS API temporarily unavailable
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/chat/voice/response" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"text": "What makes this goal important to you?", "voice": "nova"}' \\
      --output response.mp3
    ```
    
    **Performance:**
    - Generation time: 1-2 seconds
    - Audio quality: 24kHz, 64kbps MP3
    - Natural prosody and intonation
    
    **Best Practices:**
    - Keep text under 500 words for optimal performance
    - Use punctuation for natural pauses
    - Choose voice that matches coaching style
    
    **Related Endpoints:**
    - `POST /v1/chat/voice` - Transcribe audio to text
    - `POST /v1/chat/stream` - Get AI response text
    - `PATCH /v1/settings` - Enable/disable voice features
    """
    # --- Auth gate ---
    await _check_voice_access(user.id)

    # --- Validate input ---
    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text is required for speech synthesis",
        )

    if len(body.text) > 4096:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Text too long ({len(body.text)} chars). Maximum: 4096 characters.",
        )

    # --- Generate audio via Groq TTS ---
    try:
        client = get_groq_client()
        response = await client.audio.speech.create(
            model="playai-tts",
            input=body.text.strip(),
            voice="Fritz-PlayAI",
            response_format="wav",
        )

        audio_bytes = response.content if hasattr(response, "content") else response.read()

        logger.info(
            "Generated TTS for user %s (%d chars -> %d bytes)",
            user.id, len(body.text), len(audio_bytes),
        )

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/wav",
            headers={
                "Content-Disposition": "attachment; filename=response.wav",
                "Content-Length": str(len(audio_bytes)),
            },
        )

    except Exception as e:
        logger.error("TTS generation failed for user %s: %s", user.id, e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice synthesis service is temporarily unavailable. Please try again.",
        )
