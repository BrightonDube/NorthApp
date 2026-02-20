import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, AuthUser
from app.models.requests import ChatRequest
from app.agents.chat_agent import stream_chat_response, save_message
from app.agents.memory_agent import extract_and_store_facts
from app.services.supabase import get_supabase_client

router = APIRouter()


async def run_memory_extraction(message: str, user_id: str):
    try:
        count = await extract_and_store_facts(message, user_id)
        if count:
            print(f"[Memory] Stored {count} facts for user {user_id}")
    except Exception as e:
        print(f"[Memory] Background extraction failed: {e}")


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    user: AuthUser = Depends(get_current_user),
):
    supabase = get_supabase_client()

    # Verify session belongs to user
    session_result = (
        supabase.from_("chat_sessions")
        .select("id, user_id")
        .eq("id", body.session_id)
        .eq("user_id", user.id)
        .single()
        .execute()
    )
    if not session_result.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message first
    await save_message(body.session_id, "user", body.message)

    # Queue memory extraction in background (non-blocking)
    background_tasks.add_task(run_memory_extraction, body.message, user.id)

    attachments = [a.model_dump() for a in body.attachments] if body.attachments else None

    return StreamingResponse(
        stream_chat_response(
            user_id=user.id,
            session_id=body.session_id,
            coach_id=body.coach_id,
            message=body.message,
            attachments=attachments,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
