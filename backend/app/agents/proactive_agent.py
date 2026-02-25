from groq import AsyncGroq
from app.config import get_settings
from app.services.supabase import get_async_supabase_client
from app.services.notifications import send_push_notification

CHECKIN_PROMPT = """You are a proactive life coach. A user hasn't checked in for a while.
Generate a SHORT, personalized re-engagement message (max 2 sentences).

Make it:
- Warm but not pushy
- Slightly witty or memorable
- Reference their context if available
- End with a gentle invitation to check in

User context: {context}
Their top goal: {goal}

Return ONLY the message text, nothing else."""


async def get_user_top_goal(user_id: str) -> str:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("goals")
        .select("title")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["title"]
    return "your goals"


async def get_user_context_summary(user_id: str) -> str:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("user_context")
        .select("category, content")
        .eq("user_id", user_id)
        .limit(5)
        .execute()
    )
    if not result.data:
        return "No context available"
    return "; ".join([f"{r['category']}: {r['content']}" for r in result.data])


async def generate_checkin_message(user_id: str) -> str:
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    context = await get_user_context_summary(user_id)
    goal = await get_user_top_goal(user_id)

    prompt = CHECKIN_PROMPT.format(context=context, goal=goal)

    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=100,
    )

    return response.choices[0].message.content.strip()


async def send_reengagement_notification(user_id: str) -> bool:
    message = await generate_checkin_message(user_id)
    return await send_push_notification(
        user_id=user_id,
        title="Your coach is thinking of you",
        body=message,
        data={"action": "open_chat"},
    )
