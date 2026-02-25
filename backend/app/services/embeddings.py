import httpx

from app.config import get_settings

GROQ_EMBEDDINGS_URL = "https://api.groq.com/openai/v1/embeddings"


async def create_embedding(text: str) -> list[float]:
    settings = get_settings()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GROQ_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_embedding_model,
                "input": text,
            },
        )

    resp.raise_for_status()
    data = resp.json().get("data", [])
    if not data:
        return []
    return data[0].get("embedding", [])

