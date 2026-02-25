from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, AuthUser
from app.models.requests import ChatRequest
from app.agents.chat_agent import stream_chat_response, save_message
from app.agents.memory_agent import extract_and_store_facts
from app.services.supabase import get_async_supabase_client

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
    """
    Stream AI coaching responses in real-time using Server-Sent Events (SSE).
    
    This endpoint implements the core Socratic coaching experience, streaming AI responses
    word-by-word for natural conversation flow. The AI never provides direct answers but
    guides users through self-discovery using powerful questions.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    - `session_id` (string, required): UUID of the chat session
    - `coach_id` (string, required): UUID of the coach specialization
    - `message` (string, required): User's message text
    - `attachments` (array, optional): Images or documents to analyze
    
    **Response:** Server-Sent Events stream
    - Content-Type: `text/event-stream`
    - Each event contains: `{"type": "token", "content": "word"}`
    - Final event: `{"type": "done"}`
    
    **Features:**
    - Streams responses for immediate feedback (first token < 1s)
    - Automatically extracts and stores memories in background
    - Adapts to user's firmness level (0-10 scale)
    - Integrates GROW model coaching framework
    - Retrieves relevant past memories via RAG
    - Supports multimodal input (images, screenshots)
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `404 Not Found`: Session not found or doesn't belong to user
    - `503 Service Unavailable`: LLM API temporarily unavailable
    
    **Example Request:**
    ```json
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "coach_id": "strategic-thinking",
      "message": "I'm struggling to prioritize my goals",
      "attachments": []
    }
    ```
    
    **Example Response Stream:**
    ```
    data: {"type": "token", "content": "What"}
    data: {"type": "token", "content": " makes"}
    data: {"type": "token", "content": " prioritization"}
    data: {"type": "token", "content": " challenging"}
    data: {"type": "token", "content": " for"}
    data: {"type": "token", "content": " you"}
    data: {"type": "token", "content": " right"}
    data: {"type": "token", "content": " now"}
    data: {"type": "token", "content": "?"}
    data: {"type": "done"}
    ```
    
    **Performance:**
    - First token typically arrives within 1 second
    - Full response streams in 2-5 seconds depending on length
    - Background memory extraction completes within 30 seconds
    
    **Related Endpoints:**
    - `POST /v1/chat/voice` - Transcribe audio to text
    - `POST /v1/chat/voice/response` - Generate audio response
    - `GET /v1/sessions/{id}/grow` - View GROW coaching stage
    """
    supabase = await get_async_supabase_client()

    # Verify session belongs to user
    session_result = await (
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
