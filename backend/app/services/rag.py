from app.services.embeddings import create_embedding
from app.services.supabase import get_async_supabase_client


async def retrieve_relevant_memories(
    user_id: str,
    query: str,
    limit: int = 5,
    threshold: float = 0.7,
) -> list[dict]:
    query_embedding = await create_embedding(query)
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

    return result.data or []


async def format_memories_for_prompt(memories: list[dict]) -> str:
    if not memories:
        return ""

    lines = ["## Relevant memories about this user:"]
    for m in memories:
        importance_marker = "⭐" if m.get("importance") == "high" else "-"
        lines.append(f"{importance_marker} [{m.get('category', 'fact')}] {m['content']}")

    return "\n".join(lines)
