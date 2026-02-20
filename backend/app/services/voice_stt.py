from openai import AsyncOpenAI
from app.services.embeddings import get_openai_client


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    client = get_openai_client()

    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, audio_bytes, "audio/webm"),
    )

    return transcript.text
