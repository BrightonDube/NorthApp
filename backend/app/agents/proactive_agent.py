import logging

from app.services.supabase import get_async_supabase_client
from app.services.notifications import send_push_notification
from app.services.groq_client import MODEL_FAST
from app.services.ai_service import AIService, AIRequest
from app.config import get_settings

logger = logging.getLogger(__name__)

CHECKIN_PROMPT_GENTLE = """You are a gentle, supportive life coach. A user hasn't checked in for a while.
Generate a SHORT, personalized re-engagement message (max 2 sentences).

Make it:
- Extremely warm and supportive
- Validating and understanding
- Reference their context if available
- End with a gentle, no-pressure invitation

User context: {context}
Their top goal: {goal}

Return ONLY the message text, nothing else."""

CHECKIN_PROMPT_BALANCED = """You are a balanced life coach. A user hasn't checked in for a while.
Generate a SHORT, personalized re-engagement message (max 2 sentences).

Make it:
- Warm but willing to challenge
- Slightly witty or memorable
- Reference their context if available
- End with an encouraging invitation to check in

User context: {context}
Their top goal: {goal}

Return ONLY the message text, nothing else."""

CHECKIN_PROMPT_FIRM = """You are a direct, no-nonsense life coach. A user hasn't checked in for a while.
Generate a SHORT, personalized re-engagement message (max 2 sentences).

Make it:
- Direct and accountable
- Challenge them without being harsh
- Reference their context if available
- End with a clear call to action

User context: {context}
Their top goal: {goal}

Return ONLY the message text, nothing else."""


async def get_user_firmness_level(user_id: str) -> int:
    """Get user's firmness level preference."""
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("profiles")
        .select("firmness_level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if result.data and result.data.get("firmness_level") is not None:
        return result.data["firmness_level"]
    return 5  # Default balanced


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
    """Generate a personalized check-in message based on user's firmness level."""
    settings = get_settings()
    ai = AIService(api_key=settings.groq_api_key)

    # Get user's firmness level to determine tone
    firmness_level = await get_user_firmness_level(user_id)
    
    # Select appropriate prompt based on firmness level
    if firmness_level <= 3:
        prompt_template = CHECKIN_PROMPT_GENTLE
    elif firmness_level <= 7:
        prompt_template = CHECKIN_PROMPT_BALANCED
    else:
        prompt_template = CHECKIN_PROMPT_FIRM

    context = await get_user_context_summary(user_id)
    goal = await get_user_top_goal(user_id)

    prompt = prompt_template.format(context=context, goal=goal)

    request = AIRequest(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=100,
        model=MODEL_FAST,
        stream=False,
    )
    response = await ai.complete(request)

    if not response.success:
        logger.warning("Check-in message generation failed for user %s: %s", user_id, response.error)
        return "Hey! Just checking in. How are things going?"

    return response.content.strip()


async def send_reengagement_notification(user_id: str) -> bool:
    message = await generate_checkin_message(user_id)
    return await send_push_notification(
        user_id=user_id,
        title="Your coach is thinking of you",
        body=message,
        data={"action": "open_chat"},
    )
