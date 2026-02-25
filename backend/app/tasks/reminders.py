from app.services.supabase import get_async_supabase_client
from app.agents.proactive_agent import generate_checkin_message
from app.services.notifications import send_push_notification


async def morning_goal_reminders():
    print("[Reminders] Running morning goal reminders...")
    supabase = await get_async_supabase_client()

    # Get users with active goals
    result = await (
        supabase.from_("goals")
        .select("user_id, title")
        .eq("status", "active")
        .execute()
    )

    if not result.data:
        print("[Reminders] No active goals found")
        return

    # Group by user, take their most recent goal
    user_goals: dict[str, str] = {}
    for row in result.data:
        uid = row["user_id"]
        if uid not in user_goals:
            user_goals[uid] = row["title"]

    count = 0
    for user_id, goal_title in user_goals.items():
        try:
            message = await generate_checkin_message(user_id)
            sent = await send_push_notification(
                user_id=user_id,
                title="Morning check-in",
                body=message,
                data={"action": "open_goals"},
            )
            if sent:
                count += 1
        except Exception as e:
            print(f"[Reminders] Failed for user {user_id}: {e}")

    print(f"[Reminders] Sent {count} morning reminders")
