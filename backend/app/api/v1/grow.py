from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.requests import UpdateGrowStateRequest
from app.models.responses import GrowStateResponse
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/sessions/{session_id}/grow", response_model=GrowStateResponse)
async def get_grow_state(
    session_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Get the current GROW state for a chat session.
    
    Returns the current GROW stage (goal, reality, options, way_forward, complete),
    associated data, and last update timestamp.
    """
    supabase = await get_async_supabase_client()

    # Verify session ownership
    result = await (
        supabase.from_("chat_sessions")
        .select("grow_state, grow_data, grow_updated_at, user_id")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user owns this session
    if result.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return GrowStateResponse(
        state=result.data.get("grow_state") or "goal",
        data=result.data.get("grow_data") or {},
        updated_at=result.data.get("grow_updated_at"),
    )


@router.patch("/sessions/{session_id}/grow", response_model=GrowStateResponse)
async def update_grow_state(
    session_id: str,
    body: UpdateGrowStateRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Update the GROW state for a chat session.
    
    Allows manual progression through GROW stages or updating associated data.
    Validates that state transitions are valid (can't skip stages).
    """
    supabase = await get_async_supabase_client()

    # Verify session ownership and get current state
    existing = await (
        supabase.from_("chat_sessions")
        .select("grow_state, grow_data, user_id")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not existing.data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify user owns this session
    if existing.data.get("user_id") != user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    current_state = existing.data.get("grow_state") or "goal"
    new_state = body.grow_state

    # Validate state transitions
    valid_transitions = {
        "goal": ["goal", "reality"],
        "reality": ["goal", "reality", "options"],
        "options": ["reality", "options", "way_forward"],
        "way_forward": ["options", "way_forward", "complete"],
        "complete": ["complete", "goal"],  # Can restart or stay complete
    }

    if new_state not in valid_transitions.get(current_state, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state transition from '{current_state}' to '{new_state}'"
        )

    # Prepare update data
    update_data = {
        "grow_state": new_state,
        "grow_updated_at": "now()",
    }

    # Update grow_data if provided
    if body.grow_data is not None:
        update_data["grow_data"] = body.grow_data

    # Update database
    result = await (
        supabase.from_("chat_sessions")
        .update(update_data)
        .eq("id", session_id)
        .select("grow_state, grow_data, grow_updated_at")
        .single()
        .execute()
    )

    return GrowStateResponse(
        state=result.data.get("grow_state"),
        data=result.data.get("grow_data") or {},
        updated_at=result.data.get("grow_updated_at"),
    )
