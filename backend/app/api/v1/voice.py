from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import Response

from app.dependencies import get_current_user, AuthUser
from app.models.requests import TTSRequest
from app.models.responses import TranscriptResponse
from app.services.voice_stt import transcribe_audio
from app.services.voice_tts import synthesize_speech
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
    await _check_voice_access(user.id)
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"
    text = await transcribe_audio(audio_bytes, filename)
    return TranscriptResponse(text=text)


@router.post("/chat/voice/response")
async def text_to_speech(
    body: TTSRequest,
    user: AuthUser = Depends(get_current_user),
):
    await _check_voice_access(user.id)
    audio_bytes = await synthesize_speech(body.text, body.voice)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=response.mp3"},
    )
