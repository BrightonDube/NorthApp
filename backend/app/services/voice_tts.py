from openai import AsyncOpenAI
from app.services.embeddings import get_openai_client

VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
DEFAULT_VOICE = "nova"


async def synthesize_speech(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    if voice not in VALID_VOICES:
        voice = DEFAULT_VOICE

    client = get_openai_client()

    response = await client.audio.speech.create(
        model="tts-1",
        voice=voice,
        input=text,
        response_format="mp3",
    )

    return response.content
