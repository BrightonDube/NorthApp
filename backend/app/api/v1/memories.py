from fastapi import APIRouter, Depends, HTTPException, Query
from app.dependencies import get_current_user, AuthUser
from app.models.responses import MemoryResponse
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/memories", response_model=list[MemoryResponse])
async def list_memories(
    limit: int = Query(default=50, ge=1, le=100),
    user: AuthUser = Depends(get_current_user),
):
    """
    Retrieve user's stored memories extracted from past conversations.
    
    Memories are automatically extracted facts about the user (values, goals, preferences,
    constraints) that help personalize future coaching conversations. The system uses
    RAG (Retrieval-Augmented Generation) to inject relevant memories into AI prompts.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Query Parameters:**
    - `limit` (integer, optional): Maximum number of memories to return (default: 50, max: 100)
    
    **Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "content": "Values honesty and transparency in relationships",
        "category": "values",
        "importance": "high",
        "created_at": "2026-02-24T10:30:00Z"
      }
    ]
    ```
    
    **Memory Categories:**
    - `values`: Core beliefs and principles
    - `goals`: Aspirations and objectives
    - `projects`: Current work or initiatives
    - `constraints`: Limitations or challenges
    - `preferences`: Likes, dislikes, and tendencies
    
    **Importance Levels:**
    - `high`: Frequently referenced, core to identity
    - `medium`: Relevant but not central
    - `low`: Contextual or situational
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    curl -X GET "https://api.example.com/v1/memories?limit=20" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **How Memories Work:**
    1. User sends messages in chat
    2. Background agent extracts key facts
    3. Facts stored with vector embeddings
    4. Relevant memories retrieved via semantic search
    5. Top 5 memories injected into AI prompts
    
    **Privacy & Control:**
    - Users can view all stored memories
    - Users can delete individual memories
    - Memories are isolated per user (never shared)
    - Automatic deduplication prevents redundancy
    
    **Related Endpoints:**
    - `DELETE /v1/memories/{id}` - Delete a specific memory
    - `POST /v1/chat/stream` - Memories auto-injected here
    """
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("memories")
        .select("id, content, category, importance, created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


@router.delete("/memories/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Delete a specific memory from the user's memory store.
    
    Allows users to remove incorrect, outdated, or unwanted memories. Once deleted,
    the memory will no longer be retrieved or injected into future AI conversations.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Path Parameters:**
    - `memory_id` (string, required): UUID of the memory to delete
    
    **Response:**
    - Status: `204 No Content` (successful deletion)
    - No response body
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `404 Not Found`: Memory not found or doesn't belong to user
    
    **Example Usage:**
    ```bash
    curl -X DELETE "https://api.example.com/v1/memories/550e8400-e29b-41d4-a716-446655440000" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Use Cases:**
    - Remove incorrect facts extracted by AI
    - Delete outdated information (old goals, past constraints)
    - Clear sensitive information
    - Manage memory storage
    
    **Important Notes:**
    - Deletion is permanent and cannot be undone
    - Memory will be immediately removed from future retrievals
    - Does not affect past conversations (history preserved)
    - User can only delete their own memories
    
    **Related Endpoints:**
    - `GET /v1/memories` - List all memories
    - `POST /v1/chat/stream` - Memories auto-injected here
    """
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("memories")
        .delete()
        .eq("id", memory_id)
        .eq("user_id", user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Memory not found")



@router.get("/insights")
async def list_insights(
    coach_id: str | None = None,
    limit: int = 20,
    user: AuthUser = Depends(get_current_user),
):
    """
    Retrieve conversation insights extracted from completed coaching sessions.
    
    Insights are high-level takeaways, breakthroughs, and patterns identified from
    entire conversations (not individual messages). They provide a summary of key
    learnings and progress over time.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Query Parameters:**
    - `coach_id` (string, optional): Filter insights by specific coach
    - `limit` (integer, optional): Maximum number of insights to return (default: 20, max: 50)
    
    **Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "insight": "User realized they've been avoiding difficult conversations due to fear of conflict",
        "confidence": 0.9,
        "session_id": "660e8400-e29b-41d4-a716-446655440001",
        "coach_id": "leadership-eq",
        "created_at": "2026-02-24T10:30:00Z"
      }
    ]
    ```
    
    **Confidence Levels:**
    - `0.9-1.0`: Explicitly stated by user or clearly evident
    - `0.7-0.9`: Strongly implied or demonstrated
    - Only insights with confidence >= 0.7 are stored
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    
    **Example Usage:**
    ```bash
    # Get all insights
    curl -X GET "https://api.example.com/v1/insights" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    
    # Get insights from specific coach
    curl -X GET "https://api.example.com/v1/insights?coach_id=strategic-thinking" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Insight Types:**
    - Breakthroughs or realizations
    - Patterns in thinking or behavior
    - Commitments or decisions made
    - Progress toward goals
    - Shifts in perspective
    - Action items agreed upon
    
    **Related Endpoints:**
    - `POST /v1/sessions/{id}/insights` - Extract insights from a session
    - `DELETE /v1/insights/{id}` - Delete a specific insight
    - `GET /v1/memories` - View individual facts/memories
    """
    supabase = await get_async_supabase_client()
    
    query = (
        supabase.from_("conversation_insights")
        .select("id, insight, confidence, session_id, coach_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(min(limit, 50))
    )
    
    if coach_id:
        query = query.eq("coach_id", coach_id)
    
    result = await query.execute()
    return result.data or []


@router.delete("/insights/{insight_id}", status_code=204)
async def delete_insight(
    insight_id: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Delete a specific conversation insight.
    
    Allows users to remove incorrect or unwanted insights extracted from conversations.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Path Parameters:**
    - `insight_id` (string, required): UUID of the insight to delete
    
    **Response:**
    - Status: `204 No Content` (successful deletion)
    - No response body
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `404 Not Found`: Insight not found or doesn't belong to user
    
    **Example Usage:**
    ```bash
    curl -X DELETE "https://api.example.com/v1/insights/550e8400-e29b-41d4-a716-446655440000" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Important Notes:**
    - Deletion is permanent and cannot be undone
    - Does not affect the original conversation
    - User can only delete their own insights
    
    **Related Endpoints:**
    - `GET /v1/insights` - List all insights
    - `POST /v1/sessions/{id}/insights` - Extract new insights
    """
    supabase = await get_async_supabase_client()
    
    result = await (
        supabase.from_("conversation_insights")
        .delete()
        .eq("id", insight_id)
        .eq("user_id", user.id)
        .execute()
    )
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Insight not found")
