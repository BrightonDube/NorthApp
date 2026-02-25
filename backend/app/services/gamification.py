from datetime import datetime, timezone
from app.services.supabase import get_async_supabase_client

LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000]

XP_REWARDS: dict = {
    "task_complete": 50,
    "check_in": 10,
    "goal_complete": 200,
    "first_message": 20,
    "session_report": 30,
    "streak_bonus": None,  # calculated dynamically
}


def calculate_level(total_xp: int) -> int:
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1
    return level


async def get_user_xp(user_id: str) -> dict:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("user_xp")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if result.data:
        return result.data
    # Create row if not exists
    insert = await (
        supabase.from_("user_xp")
        .insert({"user_id": user_id})
        .select()
        .single()
        .execute()
    )
    return insert.data


async def award_xp(user_id: str, event_type: str, multiplier: int = 1) -> dict:
    supabase = await get_async_supabase_client()

    user_xp_data = await get_user_xp(user_id)
    current_total = user_xp_data.get("total_xp", 0)
    current_streak = user_xp_data.get("current_streak", 0)
    current_level = calculate_level(current_total)

    if event_type == "streak_bonus":
        xp = current_streak * 5
    else:
        xp = XP_REWARDS.get(event_type, 0)

    xp = xp * multiplier

    if xp <= 0:
        return {"xp_earned": 0, "total_xp": current_total, "level": current_level, "leveled_up": False}

    # Record XP event
    await supabase.from_("xp_events").insert({
        "user_id": user_id,
        "event_type": event_type,
        "xp_amount": xp,
    }).execute()

    # Update totals
    new_total = current_total + xp
    new_level = calculate_level(new_total)
    leveled_up = new_level > current_level

    await supabase.from_("user_xp").upsert({
        "user_id": user_id,
        "total_xp": new_total,
        "level": new_level,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {
        "xp_earned": xp,
        "total_xp": new_total,
        "level": new_level,
        "leveled_up": leveled_up,
    }


async def update_streak(user_id: str) -> int:
    supabase = await get_async_supabase_client()
    user_xp_data = await get_user_xp(user_id)

    current_streak = user_xp_data.get("current_streak", 0)
    longest_streak = user_xp_data.get("longest_streak", 0)
    new_streak = current_streak + 1
    new_longest = max(longest_streak, new_streak)

    await supabase.from_("user_xp").upsert({
        "user_id": user_id,
        "current_streak": new_streak,
        "longest_streak": new_longest,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return new_streak
