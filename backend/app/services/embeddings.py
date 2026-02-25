import httpx

from app.config import get_settings

GROQ_EMBEDDINGS_URL = "https://api.groq.com/openai/v1/embeddings"


def _normalize_dimensions(embedding: list[float], target_dimensions: int) -> list[float]:
    current_dimensions = len(embedding)
    if current_dimensions == target_dimensions:
        return embedding
    if current_dimensions > target_dimensions:
        return embedding[:target_dimensions]
    return embedding + [0.0] * (target_dimensions - current_dimensions)


async def create_embedding(text: str) -> list[float]:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is required for embeddings")

    payload = {
        "model": settings.groq_embedding_model,
        "input": text,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            GROQ_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code >= 400:
        raise RuntimeError(
            f"Groq embeddings request failed ({resp.status_code}): {resp.text}"
        )

    resp.raise_for_status()
    data = resp.json().get("data", [])
    if not data:
        raise RuntimeError("Groq embeddings response returned no vectors")

    embedding = data[0].get("embedding", [])
    if not embedding:
        raise RuntimeError("Groq embeddings response had empty embedding vector")

    return _normalize_dimensions(embedding, settings.memory_embedding_dimensions)
