import logging
from datetime import datetime

import pytz

from app.services.supabase import get_async_supabase_client
from app.agents.proactive_agent import generate_checkin_message
from app.services.notifications import send_push_notification

logger = logging.getLogger(__name__)


async def morning_goal_reminders():
    """
    Send morning reminders to users based on their timezone and preferences.
    
    This function:
    1. Queries users who have morning reminders enabled
    2. Checks if it's the right hour in each user's timezone
    3. Generates personalized messages based on their goals and firmness level
    4. Sends push notifications
    
    Validates: Requirements 6.2 (Morning Reminders)
    """
    logger.info("Running morning goal reminders...")
    supabase = await get_async_supabase_client()

    # Get users who have morning reminders enabled
    profiles_result = await (
        supabase.from_("profiles")
        .select("id, timezone, morning_reminder_time, morning_reminders_enabled")
        .eq("morning_reminders_enabled", True)
        .execute()
    )

    if not profiles_result.data:
        logger.info("No users with morning reminders enabled")
        return

    # Get active goals for all users
    goals_result = await (
        supabase.from_("goals")
        .select("user_id, title")
        .eq("status", "active")
        .execute()
    )

    # Group goals by user
    user_goals: dict[str, list[str]] = {}
    for row in goals_result.data:
        uid = row["user_id"]
        if uid not in user_goals:
            user_goals[uid] = []
        user_goals[uid].append(row["title"])

    count = 0
    skipped = 0
    
    for profile in profiles_result.data:
        user_id = profile["id"]
        user_timezone = profile.get("timezone", "UTC")
        reminder_hour = profile.get("morning_reminder_time", 9)
        
        try:
            # Get current time in user's timezone
            tz = pytz.timezone(user_timezone)
            user_local_time = datetime.now(tz)
            
            # Only send if it's the right hour in their timezone
            if user_local_time.hour != reminder_hour:
                skipped += 1
                continue
            
            # Generate personalized message based on goals and firmness level
            message = await generate_checkin_message(user_id)
            
            # Send push notification
            sent = await send_push_notification(
                user_id=user_id,
                title="Good morning! 🌅",
                body=message,
                data={"action": "open_goals"},
            )
            
            if sent:
                count += 1
                logger.info("Sent reminder to user %s at %s", user_id, user_local_time.strftime('%H:%M %Z'))
            
        except pytz.exceptions.UnknownTimeZoneError:
            logger.warning("Invalid timezone '%s' for user %s, falling back to UTC", user_timezone, user_id)
            # Fallback to UTC
            utc_time = datetime.now(pytz.UTC)
            if utc_time.hour == reminder_hour:
                try:
                    message = await generate_checkin_message(user_id)
                    sent = await send_push_notification(
                        user_id=user_id,
                        title="Good morning! 🌅",
                        body=message,
                        data={"action": "open_goals"},
                    )
                    if sent:
                        count += 1
                except Exception as e:
                    logger.warning("Reminder failed for user %s: %s", user_id, e)
        except Exception as e:
            logger.warning("Reminder failed for user %s: %s", user_id, e)

    logger.info("Sent %d morning reminders, skipped %d (wrong time)", count, skipped)
