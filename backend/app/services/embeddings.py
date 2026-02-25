import asyncio
import voyageai

from app.config import get_settings
from app.services.cache import (
    get_cache,
    make_embedding_key,
    TTL_EMBEDDING,
)


def _normalize_dimensions(embedding: list[float], target_dimensions: int) -> list[float]:
    current_dimensions = len(embedding)
    if current_dimensions == target_dimensions:
        return embedding
    if current_dimensions > target_dimensions:
        return embedding[:target_dimensions]
    return embedding + [0.0] * (target_dimensions - current_dimensions)


async def create_embedding(text: str, input_type: str = "document") -> list[float]:
    """
    Create an embedding for the given text with caching.
    
    Args:
        text: The text to embed
        input_type: The type of input ("document" or "query")
        
    Returns:
        The embedding vector
    """
    cache = get_cache()
    cache_key = make_embedding_key(text)

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - generate embedding
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

    normalized_embedding = _normalize_dimensions(embedding, settings.memory_embedding_dimensions)

    # Cache the result (embeddings are deterministic)
    cache.set(cache_key, normalized_embedding, TTL_EMBEDDING)

    return normalized_embedding
