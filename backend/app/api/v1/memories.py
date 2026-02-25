from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user, AuthUser
from app.models.responses import MemoryResponse
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/memories", response_model=list[MemoryResponse])
async def list_memories(
    limit: int = 50,
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
