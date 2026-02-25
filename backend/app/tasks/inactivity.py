from app.services.supabase import get_async_supabase_client
from app.agents.proactive_agent import send_reengagement_notification


async def check_inactive_users():
    print("[Inactivity] Running check...")
    supabase = await get_async_supabase_client()

    # Find users whose last message was >24h ago and haven't been notified today
    result = await supabase.rpc("get_inactive_users", {"hours_threshold": 24}).execute()

    if not result.data:
        print("[Inactivity] No inactive users found")
        return

    count = 0
    for user in result.data:
        user_id = user.get("user_id") or user.get("id")
        if not user_id:
            continue
        try:
            sent = await send_reengagement_notification(user_id)
            if sent:
                count += 1
        except Exception as e:
            print(f"[Inactivity] Failed for user {user_id}: {e}")

    print(f"[Inactivity] Sent {count} re-engagement notifications")
