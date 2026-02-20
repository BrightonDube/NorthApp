from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, AuthUser
from app.models.requests import GoalPlanRequest, PanicRequest
from app.models.responses import GoalPlanResponse
from app.agents.goal_planner import generate_goal_plan
from app.agents.panic_agent import stream_panic_response
from app.agents.curator_agent import curate_resources
from app.agents.proactive_agent import get_user_context_summary

router = APIRouter()


@router.post("/agent/plan", response_model=GoalPlanResponse)
async def plan_goal(
    body: GoalPlanRequest,
    user: AuthUser = Depends(get_current_user),
):
    context = body.context
    if not context:
        context = await get_user_context_summary(user.id)

    plan = await generate_goal_plan(body.goal_description, context)
    return GoalPlanResponse(**plan)


@router.post("/agent/panic")
async def panic_mode(
    body: PanicRequest,
    user: AuthUser = Depends(get_current_user),
):
    return StreamingResponse(
        stream_panic_response(
            user_id=user.id,
            initial_message=body.initial_message,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/curate")
async def curate(
    query: str,
    user: AuthUser = Depends(get_current_user),
):
    context = await get_user_context_summary(user.id)
    result = await curate_resources(query, context)
    return result
