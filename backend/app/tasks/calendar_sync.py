from groq import AsyncGroq
from app.config import get_settings
from app.services.supabase import get_supabase_client
from app.services.calendar import fetch_today_events, get_user_tokens


async def summarize_calendar_events(events: list[dict]) -> str:
    if not events:
        return "No events scheduled today."

    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    events_text = "\n".join(
        [f"- {e.get('summary', 'Untitled')} at {e.get('start', 'unknown time')}" for e in events]
    )

    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {
                "role": "user",
                "content": (
                    f"Summarize today's calendar in 1-2 sentences for a life coach context:\n{events_text}"
                ),
            }
        ],
        temperature=0.3,
        max_tokens=100,
    )
    return response.choices[0].message.content.strip()


async def sync_all_calendars():
    print("[CalendarSync] Starting daily calendar sync...")
    supabase = get_supabase_client()

    # Get all users with connected Google Calendar
    result = (
        supabase.from_("profiles")
        .select("id")
        .not_.is_("google_calendar_tokens", "null")
        .execute()
    )

    if not result.data:
        print("[CalendarSync] No users with connected calendars")
        return

    count = 0
    for row in result.data:
        user_id = row["id"]
        try:
            events = await fetch_today_events(user_id)
            summary = await summarize_calendar_events(events)

            # Upsert into user_context as 'calendar' category
            supabase.from_("user_context").upsert(
                {
                    "user_id": user_id,
                    "category": "calendar",
                    "content": f"Today's schedule: {summary}",
                },
                on_conflict="user_id,category",
            ).execute()
            count += 1
        except Exception as e:
            print(f"[CalendarSync] Failed for user {user_id}: {e}")

    print(f"[CalendarSync] Synced {count} calendars")
