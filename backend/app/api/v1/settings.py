from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.requests import UpdateSettingsRequest
from app.models.responses import SettingsResponse
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint(user: AuthUser = Depends(get_current_user)):
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("profiles")
        .select("id, firmness_level, voice_enabled")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return SettingsResponse(
        user_id=result.data["id"],
        firmness_level=result.data.get("firmness_level") or 5,
        voice_enabled=result.data.get("voice_enabled") or False,
    )


@router.patch("/settings", response_model=SettingsResponse)
async def update_settings_endpoint(
    body: UpdateSettingsRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Only pro users can enable voice
    if update_data.get("voice_enabled") is True:
        profile = await (
            supabase.from_("profiles")
            .select("is_pro")
            .eq("id", user.id)
            .single()
            .execute()
        )
        if not profile.data or not profile.data.get("is_pro"):
            raise HTTPException(
                status_code=403,
                detail="Voice features require a Pro subscription",
            )

    result = await (
        supabase.from_("profiles")
        .update(update_data)
        .eq("id", user.id)
        .select("id, firmness_level, voice_enabled")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return SettingsResponse(
        user_id=result.data["id"],
        firmness_level=result.data.get("firmness_level") or 5,
        voice_enabled=result.data.get("voice_enabled") or False,
    )
