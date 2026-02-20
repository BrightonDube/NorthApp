from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import Response

from app.dependencies import get_current_user, AuthUser
from app.models.requests import TTSRequest
from app.models.responses import TranscriptResponse
from app.services.voice_stt import transcribe_audio
from app.services.voice_tts import synthesize_speech

router = APIRouter()


@router.post("/chat/voice", response_model=TranscriptResponse)
async def voice_to_text(
    audio: UploadFile = File(...),
    user: AuthUser = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    filename = audio.filename or "audio.webm"
    text = await transcribe_audio(audio_bytes, filename)
    return TranscriptResponse(text=text)


@router.post("/chat/voice/response")
async def text_to_speech(
    body: TTSRequest,
    user: AuthUser = Depends(get_current_user),
):
    audio_bytes = await synthesize_speech(body.text, body.voice)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=response.mp3"},
    )
