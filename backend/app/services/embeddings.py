import asyncio
import voyageai

from app.config import get_settings


def _normalize_dimensions(embedding: list[float], target_dimensions: int) -> list[float]:
    current_dimensions = len(embedding)
    if current_dimensions == target_dimensions:
        return embedding
    if current_dimensions > target_dimensions:
        return embedding[:target_dimensions]
    return embedding + [0.0] * (target_dimensions - current_dimensions)


async def create_embedding(text: str, input_type: str = "document") -> list[float]:
    settings = get_settings()
    if not settings.voyage_api_key:
        raise RuntimeError("VOYAGE_API_KEY is required for embeddings")

    client = voyageai.Client(api_key=settings.voyage_api_key)
    response = await asyncio.to_thread(
        client.embed,
        [text],
        model=settings.voyage_embedding_model,
        input_type=input_type,
    )

    if not response.embeddings:
        raise RuntimeError("Voyage embeddings response returned no vectors")

    embedding = response.embeddings[0]
    if not embedding:
        raise RuntimeError("Voyage embeddings response had empty embedding vector")

    return _normalize_dimensions(embedding, settings.memory_embedding_dimensions)
