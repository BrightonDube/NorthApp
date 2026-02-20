import json
from groq import AsyncGroq
from app.config import get_settings
from app.services.supabase import get_supabase_client
from app.services.rag import retrieve_relevant_memories, format_memories_for_prompt

PERSONA_PROMPTS = {
    "gentle": (
        "You are an extremely supportive and gentle coach. "
        "Always validate feelings first. Never push back or challenge. "
        "Offer encouragement and gentle suggestions only."
    ),
    "balanced": (
        "You are a balanced coach — warm and supportive, but willing to "
        "challenge the user when needed. You celebrate wins and gently "
        "call out excuses. You ask powerful questions."
    ),
    "tough": (
        "You are a tough-love coach. No excuses accepted. "
        "You hold the user to their commitments, call out self-sabotage directly, "
        "and push them to do better. You still care — but you show it through honesty."
    ),
}


def get_persona_prompt(firmness_level: int) -> str:
    if firmness_level <= 3:
        return PERSONA_PROMPTS["gentle"]
    elif firmness_level <= 7:
        return PERSONA_PROMPTS["balanced"]
    else:
        return PERSONA_PROMPTS["tough"]


async def get_user_firmness(user_id: str) -> int:
    supabase = get_supabase_client()
    result = (
        supabase.from_("profiles")
        .select("firmness_level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if result.data and result.data.get("firmness_level") is not None:
        return result.data["firmness_level"]
    return 5


async def get_coach_system_prompt(coach_id: str) -> str:
    supabase = get_supabase_client()
    result = (
        supabase.from_("coaches")
        .select("system_prompt, name")
        .eq("id", coach_id)
        .single()
        .execute()
    )
    if result.data:
        return result.data.get("system_prompt", "You are a helpful life coach.")
    return "You are a helpful life coach."


async def get_user_context_text(user_id: str) -> str:
    supabase = get_supabase_client()
    result = (
        supabase.from_("user_context")
        .select("category, content")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return ""

    sections: dict[str, list[str]] = {}
    for item in result.data:
        cat = item["category"]
        sections.setdefault(cat, []).append(item["content"])

    lines = ["## User Context:"]
    for cat, items in sections.items():
        lines.append(f"**{cat.title()}**: {', '.join(items)}")
    return "\n".join(lines)


async def get_conversation_history(session_id: str, limit: int = 20) -> list[dict]:
    supabase = get_supabase_client()
    result = (
        supabase.from_("messages")
        .select("role, content")
        .eq("chat_session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    if not result.data:
        return []
    return list(reversed(result.data))


async def save_message(session_id: str, role: str, content: str) -> str:
    supabase = get_supabase_client()
    result = (
        supabase.from_("messages")
        .insert({"chat_session_id": session_id, "role": role, "content": content})
        .select("id")
        .single()
        .execute()
    )
    return result.data["id"] if result.data else ""


def build_multimodal_content(message: str, attachments: list | None) -> str | list:
    if not attachments:
        return message

    image_attachments = [a for a in attachments if a.get("type") == "image" and a.get("base64")]
    if not image_attachments:
        return message

    parts = [{"type": "text", "text": message}]
    for img in image_attachments:
        parts.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img.get('mime_type', 'image/jpeg')};base64,{img['base64']}"
            },
        })
    return parts


async def stream_chat_response(
    user_id: str,
    session_id: str,
    coach_id: str,
    message: str,
    attachments: list | None = None,
):
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    firmness = await get_user_firmness(user_id)
    coach_prompt = await get_coach_system_prompt(coach_id)
    user_context = await get_user_context_text(user_id)
    memories = await retrieve_relevant_memories(user_id, message)
    memory_text = await format_memories_for_prompt(memories)
    history = await get_conversation_history(session_id)

    persona = get_persona_prompt(firmness)
    system_prompt = f"{coach_prompt}\n\n{persona}"
    if user_context:
        system_prompt += f"\n\n{user_context}"
    if memory_text:
        system_prompt += f"\n\n{memory_text}"

    user_content = build_multimodal_content(message, attachments)

    has_images = isinstance(user_content, list)
    model = "meta-llama/llama-4-scout-17b-16e-instruct" if has_images else "meta-llama/llama-4-scout-17b-16e-instruct"

    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": user_content},
    ]

    full_response = ""

    async with client.chat.completions.stream(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=1024,
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_response += delta
                yield f"data: {json.dumps({'type': 'token', 'data': delta})}\n\n"

    saved_id = await save_message(session_id, "assistant", full_response)
    yield f"data: {json.dumps({'type': 'done', 'data': {'messageId': saved_id}})}\n\n"
