import httpx
from app.config import get_settings

TTS_MODEL = "canopylabs/orpheus-v1-english"
GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech"

# Orpheus supports: tara, leah, jess, leo, dan, mia, zac, zoe
VALID_VOICES = {"tara", "leah", "jess", "leo", "dan", "mia", "zac", "zoe"}
DEFAULT_VOICE = "leah"


async def synthesize_speech(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    if voice not in VALID_VOICES:
        voice = DEFAULT_VOICE

    settings = get_settings()

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            GROQ_TTS_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": TTS_MODEL,
                "input": text,
                "voice": voice,
                "response_format": "mp3",
            },
        )

    resp.raise_for_status()
    return resp.content
