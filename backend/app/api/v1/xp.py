from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, AuthUser
from app.services.gamification import award_xp, get_user_xp, update_streak
from app.models.responses import XPResponse
from app.models.requests import AwardXPRequest

router = APIRouter()


@router.post("/xp/award", response_model=XPResponse)
async def award_xp_endpoint(
    body: AwardXPRequest,
    user: AuthUser = Depends(get_current_user),
):
    result = await award_xp(user.id, body.event_type)
    if body.event_type == "check_in":
        await update_streak(user.id)
    return XPResponse(**result)


@router.get("/xp", response_model=XPResponse)
async def get_xp(user: AuthUser = Depends(get_current_user)):
    data = await get_user_xp(user.id)
    from app.services.gamification import calculate_level
    total = data.get("total_xp", 0)
    return XPResponse(
        xp_earned=0,
        total_xp=total,
        level=calculate_level(total),
        leveled_up=False,
    )
