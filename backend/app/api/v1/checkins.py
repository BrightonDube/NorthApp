from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, AuthUser
from app.models.requests import CreateCheckInRequest
from app.models.responses import CheckInResponse
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/check-ins", response_model=list[CheckInResponse])
async def list_check_ins(
    limit: int = Query(default=30, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("check_ins")
        .select("id, user_id, mood, energy, priorities, reflection, gratitude, type, created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


@router.post("/check-ins", response_model=CheckInResponse)
async def create_check_in(
    body: CreateCheckInRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("check_ins")
        .insert(
            {
                "user_id": user.id,
                "mood": body.mood,
                "energy": body.energy,
                "priorities": body.priorities,
                "reflection": body.reflection,
                "gratitude": body.gratitude,
                "type": body.type,
            }
        )
        .select("id, user_id, mood, energy, priorities, reflection, gratitude, type, created_at")
        .single()
        .execute()
    )
    return result.data
