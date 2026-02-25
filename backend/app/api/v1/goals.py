from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.requests import CreateGoalRequest, UpdateGoalRequest, CreateSubtaskRequest, UpdateSubtaskRequest
from app.models.responses import GoalResponse, SubtaskResponse
from app.services.supabase import get_async_supabase_client
from app.services.gamification import award_xp

router = APIRouter()


@router.get("/goals", response_model=list[GoalResponse])
async def list_goals(
    status: str | None = None,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()
    query = (
        supabase.from_("goals")
        .select("*, subtasks(*)")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
    )
    if status:
        query = query.eq("status", status)

    result = await query.execute()
    return result.data or []


@router.post("/goals", response_model=GoalResponse, status_code=201)
async def create_goal(
    body: CreateGoalRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()
    insert_data = {
        "user_id": user.id,
        "title": body.title,
        "category": body.category,
        "difficulty": body.difficulty,
    }
    if body.description:
        insert_data["description"] = body.description
    if body.deadline:
        insert_data["deadline"] = body.deadline
    if body.coach_id:
        insert_data["coach_id"] = body.coach_id

    result = await (
        supabase.from_("goals")
        .insert(insert_data)
        .select("*, subtasks(*)")
        .single()
        .execute()
    )
    return result.data


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    body: UpdateGoalRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()

    # Verify ownership
    existing = await (
        supabase.from_("goals")
        .select("id, status, user_id")
        .eq("id", goal_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await (
        supabase.from_("goals")
        .update(update_data)
        .eq("id", goal_id)
        .select("*, subtasks(*)")
        .single()
        .execute()
    )

    # Award XP if goal just completed
    if body.status == "completed" and existing.data.get("status") != "completed":
        await award_xp(user.id, "goal_complete")

    return result.data


@router.delete("/goals/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("goals")
        .delete()
        .eq("id", goal_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")


@router.post("/goals/{goal_id}/subtasks", response_model=SubtaskResponse, status_code=201)
async def create_subtask(
    goal_id: str,
    body: CreateSubtaskRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()

    # Verify goal ownership
    goal = await (
        supabase.from_("goals")
        .select("id")
        .eq("id", goal_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    insert_data = {
        "goal_id": goal_id,
        "user_id": user.id,
        "title": body.title,
        "order_index": body.order_index,
    }
    if body.due_date:
        insert_data["due_date"] = body.due_date

    result = await (
        supabase.from_("subtasks")
        .insert(insert_data)
        .select()
        .single()
        .execute()
    )
    return result.data


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskResponse)
async def update_subtask(
    subtask_id: str,
    body: UpdateSubtaskRequest,
    user: AuthUser = Depends(get_current_user),
):
    supabase = await get_async_supabase_client()

    existing = await (
        supabase.from_("subtasks")
        .select("id, status, user_id")
        .eq("id", subtask_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Subtask not found")

    update_data = body.model_dump(exclude_none=True)
    if body.status == "completed":
        from datetime import datetime, timezone
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()

    result = await (
        supabase.from_("subtasks")
        .update(update_data)
        .eq("id", subtask_id)
        .select()
        .single()
        .execute()
    )

    # Award XP if task just completed
    if body.status == "completed" and existing.data.get("status") != "completed":
        await award_xp(user.id, "task_complete")

    return result.data
