from app.services.supabase import get_async_supabase_client
from app.services.calendar import fetch_today_events
from app.services.groq_client import MODEL_FAST, get_groq_client


async def summarize_calendar_events(events: list[dict]) -> str:
    if not events:
        return "No events scheduled today."

    client = get_groq_client()

    events_text = "\n".join(
        [f"- {e.get('summary', 'Untitled')} at {e.get('start', 'unknown time')}" for e in events]
    )

    response = await client.chat.completions.create(
        model=MODEL_FAST,
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
    )
    return response.choices[0].message.content.strip()


async def sync_all_calendars():
    print("[CalendarSync] Starting daily calendar sync...")
    supabase = await get_async_supabase_client()

    # Get all users with connected Google Calendar
    result = await (
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
            print(f"[CalendarSync] Failed for user {user_id}: {e}")

    print(f"[CalendarSync] Synced {count} calendars")
