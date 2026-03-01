from fastapi import APIRouter, Depends
from app.dependencies import get_current_user, AuthUser
from app.services.gamification import award_xp, get_user_xp, update_streak, calculate_level
from app.models.responses import XPResponse
from app.models.requests import AwardXPRequest

router = APIRouter()


@router.post("/xp/award", response_model=XPResponse)
async def award_xp_endpoint(
    body: AwardXPRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Award XP (experience points) for completing specific actions.
    
    Grants XP for various user actions like completing tasks, maintaining streaks,
    and engaging with coaching features. Returns updated XP total and level.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    ```json
    {
      "event_type": "task_complete"
    }
    ```
    
    **Event Types & XP Values:**
    - `task_complete`: 10 XP - Complete a subtask
    - `goal_complete`: 50 XP - Complete a full goal
    - `check_in`: 5 XP - Complete daily check-in
    - `streak_bonus`: 25 XP - Maintain 7-day streak
    - `first_message`: 15 XP - Send first message to coach
    - `session_report`: 20 XP - Complete coaching session
    
    **Response:**
    ```json
    {
      "xp_earned": 10,
      "total_xp": 1260,
      "level": 8,
      "leveled_up": false
    }
    ```
    
    **Response Fields:**
    - `xp_earned`: XP awarded for this action
    - `total_xp`: New cumulative XP total
    - `level`: Current level after award
    - `leveled_up`: True if user just reached new level
    
    **Level Up Rewards:**
    - Visual celebration in UI
    - Unlock new features (future)
    - Achievement badges (future)
    - Increased motivation
    
    **Error Codes:**
    - `400 Bad Request`: Invalid event_type
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/xp/award" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{"event_type": "task_complete"}'
    ```
    
    **Automatic XP Awards:**
    Some endpoints automatically award XP:
    - `PATCH /v1/goals/{id}` - Awards XP when status changes to "completed"
    - `PATCH /v1/subtasks/{id}` - Awards XP when status changes to "completed"
    - `POST /v1/check-ins` - Awards XP and updates streak
    
    **Streak System:**
    - Check-ins update daily streak counter
    - 7-day streak awards bonus XP
    - Streaks reset if day is missed
    - Timezone-aware (user's local time)
    
    **Tips:**
    - Call this endpoint after user actions
    - Show XP gain animation in UI
    - Celebrate level ups prominently
    - Use XP to encourage engagement
    
    **Related Endpoints:**
    - `GET /v1/xp` - View current XP and level
    - `POST /v1/check-ins` - Auto-awards XP
    - `PATCH /v1/goals/{id}` - Auto-awards XP on completion
    """
    result = await award_xp(user.id, body.event_type)
    if body.event_type == "check_in":
        await update_streak(user.id)
    return XPResponse(**result)


@router.get("/xp", response_model=XPResponse)
async def get_xp(user: AuthUser = Depends(get_current_user)):
    """
    Get user's current XP (experience points), level, and progress.
    
    Retrieves gamification metrics showing user's total XP, current level, and
    progress toward next level. XP is earned through various actions like completing
    tasks, maintaining streaks, and engaging with coaching.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Response:**
    ```json
    {
      "xp_earned": 0,
      "total_xp": 1250,
      "level": 8,
      "leveled_up": false
    }
    ```
    
    **Response Fields:**
    - `xp_earned`: XP earned in this action (0 for GET requests)
    - `total_xp`: Cumulative XP across all time
    - `level`: Current level (calculated from total XP)
    - `leveled_up`: Whether user just leveled up (false for GET)
    
    **Level Calculation:**
    - Level 1: 0-99 XP
    - Level 2: 100-249 XP
    - Level 3: 250-499 XP
    - Level 4: 500-799 XP
    - Level 5: 800-1199 XP
    - Formula: XP required increases with each level
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/xp" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Use Cases:**
    - Display user level in UI
    - Show progress bars
    - Track engagement over time
    - Motivate continued usage
    
    **Related Endpoints:**
    - `POST /v1/xp/award` - Award XP for actions
    """
    data = await get_user_xp(user.id)
    total = data.get("total_xp", 0)
    return XPResponse(
        xp_earned=0,
        total_xp=total,
        level=calculate_level(total),
        leveled_up=False,
    )
