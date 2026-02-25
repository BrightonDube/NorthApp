from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.requests import UpdateSettingsRequest
from app.models.responses import SettingsResponse
from app.services.supabase import get_async_supabase_client
from app.services.cache import get_cache, make_user_firmness_key

router = APIRouter()


@router.get("/settings", response_model=SettingsResponse)
async def get_settings_endpoint(user: AuthUser = Depends(get_current_user)):
    """
    Retrieve user's coaching preferences and settings.
    
    Returns personalization settings that control the coaching experience,
    including firmness level and voice feature availability.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Response:**
    ```json
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "firmness_level": 5,
      "voice_enabled": false
    }
    ```
    
    **Settings Explained:**
    
    **Firmness Level (0-10):**
    - `0-3`: Gentle, supportive, validates feelings
    - `4-7`: Balanced, warm but willing to challenge
    - `8-10`: Direct, no excuses, high accountability
    
    This setting controls how the AI coach communicates:
    - Low firmness: "That sounds really challenging. What feels manageable?"
    - High firmness: "What's stopping you? Let's cut through the excuses."
    
    **Voice Enabled:**
    - `true`: Voice features (STT/TTS) are active
    - `false`: Voice features disabled or unavailable
    - Requires Pro subscription to enable
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `404 Not Found`: User profile not found
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/settings" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Related Endpoints:**
    - `PATCH /v1/settings` - Update settings
    - `POST /v1/chat/stream` - Settings applied here
    """
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
    """
    Update user's coaching preferences and settings.
    
    Allows users to customize their coaching experience by adjusting firmness level
    and enabling/disabling voice features.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    ```json
    {
      "firmness_level": 7,
      "voice_enabled": true
    }
    ```
    
    All fields are optional - only include fields you want to update.
    
    **Firmness Level (0-10):**
    - `0-3`: Gentle & Supportive
      - Validates feelings extensively
      - Offers gentle suggestions
      - Focuses on emotional safety
      - Example: "That sounds really hard. What would feel supportive right now?"
    
    - `4-7`: Balanced & Challenging
      - Warm but willing to push
      - Balances support with accountability
      - Questions assumptions gently
      - Example: "I hear you. What would it take to move forward anyway?"
    
    - `8-10`: Direct & Accountable
      - No excuses accepted
      - Direct confrontation of patterns
      - High expectations
      - Example: "You've said this before. What's actually stopping you?"
    
    **Voice Enabled:**
    - Requires Pro subscription to set to `true`
    - Returns `403 Forbidden` if non-Pro user tries to enable
    - When enabled, unlocks STT and TTS endpoints
    
    **Response:**
    ```json
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "firmness_level": 7,
      "voice_enabled": true
    }
    ```
    
    **Error Codes:**
    - `400 Bad Request`: No fields provided or invalid values
    - `401 Unauthorized`: Invalid or missing JWT token
    - `403 Forbidden`: Pro subscription required for voice features
    - `404 Not Found`: User profile not found
    
    **Example Usage:**
    ```bash
    curl -X PATCH "https://api.example.com/v1/settings" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"firmness_level": 8}'
    ```
    
    **Tips:**
    - Start with firmness level 5 and adjust based on preference
    - Higher firmness works well for accountability goals
    - Lower firmness better for emotional processing
    - Settings apply immediately to new conversations
    
    **Related Endpoints:**
    - `GET /v1/settings` - View current settings
    - `POST /v1/chat/stream` - Settings applied here
    """
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

    # Invalidate cache if firmness level was updated
    if "firmness_level" in update_data:
        cache = get_cache()
        cache.delete(make_user_firmness_key(user.id))

    return SettingsResponse(
        user_id=result.data["id"],
        firmness_level=result.data.get("firmness_level") or 5,
        voice_enabled=result.data.get("voice_enabled") or False,
    )
