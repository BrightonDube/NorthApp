import logging

from app.services.supabase import get_async_supabase_client
from app.agents.proactive_agent import send_reengagement_notification

logger = logging.getLogger(__name__)


async def check_inactive_users():
    logger.info("Running inactivity check...")
    supabase = await get_async_supabase_client()

    # Find users whose last message was >24h ago and haven't been notified today
    result = await supabase.rpc("get_inactive_users", {"hours_threshold": 24}).execute()

    if not result.data:
        logger.info("No inactive users found")
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
            logger.warning("Re-engagement failed for user %s: %s", user_id, e)

    logger.info("Sent %d re-engagement notifications", count)
