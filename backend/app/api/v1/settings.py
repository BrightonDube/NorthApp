from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.requests import UpdateSettingsRequest
from app.models.responses import SettingsResponse
from app.services.supabase import get_supabase_client

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint(user: AuthUser = Depends(get_current_user)):
    supabase = get_supabase_client()
    result = (
        supabase.from_("profiles")
        .select("id, firmness_level")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return SettingsResponse(
        user_id=result.data["id"],
        firmness_level=result.data.get("firmness_level") or 5,
    )


@router.patch("/settings", response_model=SettingsResponse)
async def update_settings_endpoint(
    body: UpdateSettingsRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = get_supabase_client()

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.from_("profiles")
        .update(update_data)
        .eq("id", user.id)
        .select("id, firmness_level")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return SettingsResponse(
        user_id=result.data["id"],
        firmness_level=result.data.get("firmness_level") or 5,
    )
