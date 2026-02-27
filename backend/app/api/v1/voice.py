from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status

from app.dependencies import get_current_user, AuthUser
from app.models.requests import TTSRequest
from app.models.responses import TranscriptResponse
# TODO: Implement multimodal features using Groq (Task 7a)
# from app.services.voice_stt import transcribe_audio  # DELETED - will be replaced with Groq Whisper
# from app.services.voice_tts import synthesize_speech  # DELETED - will be replaced with Groq TTS
from app.services.supabase import get_async_supabase_client

router = APIRouter()


async def _check_voice_access(user_id: str) -> None:
    """Raises 403 if user is not pro or has voice disabled."""
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
    Transcribe audio recordings to text using Groq Whisper API.
    
    **Status:** Not yet implemented. Will be implemented in Task 7a using Groq Whisper Large v3.
    
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
    # TODO: Implement using Groq Whisper Large v3 (Task 7a.1)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voice transcription will be implemented using Groq Whisper in Task 7a"
    )


@router.post("/chat/voice/response")
async def text_to_speech(
    body: TTSRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Generate audio speech from text using Groq Text-to-Speech API.
    
    **Status:** Not yet implemented. Will be implemented in Task 7a using Groq TTS models.
    
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
    # TODO: Implement using Groq TTS models (Task 7a.2)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Voice synthesis will be implemented using Groq TTS in Task 7a"
    )
