from app.services.embeddings import create_embedding
from app.services.supabase import get_async_supabase_client
from app.services.cache import (
    get_cache,
    make_memory_search_key,
    TTL_MEMORY_SEARCH,
)


async def retrieve_relevant_memories(
    user_id: str,
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> list[dict]:
    """
    Retrieve relevant memories for a user with caching.
    
    Args:
        user_id: The user's UUID
        query: The search query
        limit: Maximum number of memories to return
        threshold: Similarity threshold (0-1)
        
    Returns:
        List of relevant memory dictionaries
    """
    cache = get_cache()
    cache_key = make_memory_search_key(user_id, query)

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - perform search
    query_embedding = await create_embedding(query, input_type="query")
    if not query_embedding:
        return []

    supabase = await get_async_supabase_client()
    result = await supabase.rpc(
        "match_memories",
        {
            "query_embedding": query_embedding,
            "match_user_id": user_id,
            "match_count": limit,
            "match_threshold": threshold,
        },
    ).execute()

    memories = result.data or []

    # Cache the result
    cache.set(cache_key, memories, TTL_MEMORY_SEARCH)

    return memories


async def format_memories_for_prompt(memories: list[dict]) -> str:
    if not memories:
        return ""

    lines = ["## Relevant memories about this user:"]
    for m in memories:
        importance_marker = "⭐" if m.get("importance") == "high" else "-"
        lines.append(f"{importance_marker} [{m.get('category', 'fact')}] {m['content']}")

    return "\n".join(lines)
