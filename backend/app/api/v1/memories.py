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
