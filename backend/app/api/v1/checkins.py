import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, AuthUser
from app.models.requests import CreateCheckInRequest
from app.models.responses import CheckInResponse
from app.services.supabase import get_async_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/check-ins", response_model=list[CheckInResponse])
async def list_check_ins(
    limit: int = Query(default=30, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
):
    """
    List user's daily check-ins (morning and evening reflections).
    
    Retrieves check-in history showing mood, energy, priorities, reflections, and gratitude.
    Check-ins help track patterns and maintain self-awareness.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Query Parameters:**
    - `limit` (integer, optional): Maximum number of check-ins to return (1-100, default: 30)
    
    **Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "user-uuid",
        "mood": 4,
        "energy": 3,
        "priorities": ["Finish project proposal", "Exercise", "Call mom"],
        "reflection": "Feeling productive but a bit tired",
        "gratitude": "Grateful for supportive team",
        "type": "morning",
        "created_at": "2026-02-25T09:00:00Z"
      }
    ]
    ```
    
    **Check-In Types:**
    - `morning`: Start-of-day intention setting
    - `evening`: End-of-day reflection
    
    **Mood Scale (1-5):**
    - 1: Very low, struggling
    - 2: Below average, challenging
    - 3: Neutral, okay
    - 4: Good, positive
    - 5: Excellent, thriving
    
    **Energy Scale (1-5):**
    - 1: Exhausted, depleted
    - 2: Low energy, tired
    - 3: Moderate, manageable
    - 4: Energized, capable
    - 5: High energy, peak state
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/check-ins?limit=7" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Use Cases:**
    - Track mood and energy patterns
    - Review past priorities
    - Identify trends over time
    - Maintain gratitude practice
    
    **Related Endpoints:**
    - `POST /v1/check-ins` - Create new check-in
    - `POST /v1/xp/award` - Check-ins award XP
    """
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
    """
    Create a new daily check-in (morning or evening).
    
    Records mood, energy, priorities, reflection, and gratitude. Check-ins help maintain
    self-awareness and track patterns over time. Completing check-ins awards XP.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    ```json
    {
      "mood": 4,
      "energy": 3,
      "priorities": ["Finish project proposal", "Exercise", "Call mom"],
      "reflection": "Feeling productive but a bit tired",
      "gratitude": "Grateful for supportive team",
      "type": "morning"
    }
    ```
    
    **Required Fields:**
    - `mood` (integer): 1-5 scale
    - `energy` (integer): 1-5 scale
    - `type` (string): "morning" or "evening"
    
    **Optional Fields:**
    - `priorities` (array): List of priorities for the day
    - `reflection` (string): Personal reflection
    - `gratitude` (string): What you're grateful for
    
    **Morning Check-In Focus:**
    - Set intentions for the day
    - Identify top priorities
    - Assess starting energy
    - Express gratitude
    
    **Evening Check-In Focus:**
    - Reflect on the day
    - Acknowledge accomplishments
    - Process emotions
    - Practice gratitude
    
    **Response:**
    Returns the created check-in with generated ID and timestamp.
    
    **Error Codes:**
    - `400 Bad Request`: Invalid request body or values out of range
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/check-ins" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{
        "mood": 4,
        "energy": 3,
        "priorities": ["Write code", "Exercise"],
        "reflection": "Ready for a productive day",
        "gratitude": "Grateful for good health",
        "type": "morning"
      }'
    ```
    
    **Tips:**
    - Be honest with mood and energy ratings
    - Keep priorities to 3-5 items
    - Write reflections in first person
    - Gratitude can be simple or profound
    
    **Gamification:**
    - Awards XP for completing check-ins
    - Contributes to daily streak
    - Unlocks insights over time
    
    **Related Endpoints:**
    - `GET /v1/check-ins` - View check-in history
    - `POST /v1/xp/award` - Award XP manually
    """
    try:
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

        row = result.data
        if not row:
            lookup = await (
                supabase.from_("check_ins")
                .select("id, user_id, mood, energy, priorities, reflection, gratitude, type, created_at")
                .eq("user_id", user.id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if lookup.data:
                row = lookup.data[0]

        if not row:
            logger.error("Check-in insert returned no data for user %s", user.id)
            raise HTTPException(status_code=500, detail="Failed to save check-in")

        return {
            "id": row["id"],
            "user_id": row["user_id"],
            "mood": row["mood"],
            "energy": row["energy"],
            "priorities": row.get("priorities") or [],
            "reflection": row.get("reflection") or "",
            "gratitude": row.get("gratitude") or "",
            "type": row["type"],
            "created_at": row["created_at"],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to create check-in for user %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="Failed to save check-in. Please try again.")
