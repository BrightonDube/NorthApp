import logging

from app.services.supabase import get_async_supabase_client
from app.services.calendar import fetch_today_events
from app.services.groq_client import MODEL_FAST
from app.services.ai_service import AIService, AIRequest
from app.config import get_settings

logger = logging.getLogger(__name__)


async def summarize_calendar_events(events: list[dict]) -> str:
    """Summarise a list of calendar events into a short coaching-context string."""
    if not events:
        return "No events scheduled today."

    settings = get_settings()
    ai = AIService(api_key=settings.groq_api_key)

    events_text = "\n".join(
        [f"- {e.get('summary', 'Untitled')} at {e.get('start', 'unknown time')}" for e in events]
    )

    request = AIRequest(
        messages=[
            {
                "role": "user",
                "content": (
                    f"Summarize today's calendar in 1-2 sentences for a life coach context:\n{events_text}"
                ),
            }
        ],
        temperature=0.45,
        max_tokens=100,
        model=MODEL_FAST,
        stream=False,
    )
    response = await ai.complete(request)

    if not response.success:
        logger.warning("Calendar summarization failed: %s", response.error)
        return f"You have {len(events)} events today."

    return response.content.strip()


async def sync_all_calendars():
    logger.info("Starting daily calendar sync...")
    supabase = await get_async_supabase_client()

    # Get all users with connected Google Calendar
    result = await (
        supabase.from_("profiles")
        .select("id")
        .not_.is_("google_calendar_tokens", "null")
        .execute()
    )

    if not result.data:
        logger.info("No users with connected calendars")
        return

    count = 0
    for row in result.data:
        user_id = row["id"]
        try:
            events = await fetch_today_events(user_id)
            summary = await summarize_calendar_events(events)

            # Upsert into user_context as 'calendar' category
            await supabase.from_("user_context").upsert(
                {
                    "user_id": user_id,
                    "category": "calendar",
                    "content": f"Today's schedule: {summary}",
                },
                on_conflict="user_id,category",
            ).execute()
            count += 1
        except Exception as e:
            logger.warning("Calendar sync failed for user %s: %s", user_id, e)

    logger.info("Synced %d calendars", count)
