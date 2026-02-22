import httpx
from app.config import get_settings

STT_MODEL = "whisper-large-v3-turbo"
GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    settings = get_settings()

    mime = "audio/webm"
    if filename.endswith(".m4a"):
        mime = "audio/mp4"
    elif filename.endswith(".mp3"):
        mime = "audio/mpeg"
    elif filename.endswith(".wav"):
        mime = "audio/wav"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GROQ_STT_URL,
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            files={"file": (filename, audio_bytes, mime)},
            data={"model": STT_MODEL, "response_format": "json"},
        )

    resp.raise_for_status()
    return resp.json().get("text", "")
