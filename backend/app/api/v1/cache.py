"""
Cache management API endpoints.

Provides endpoints to:
- View cache statistics
- Clear cache entries
- Invalidate specific cache keys
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user, AuthUser
from app.services.cache import (
    get_cache,
    make_user_context_key,
    make_user_firmness_key,
)

router = APIRouter(prefix="/cache", tags=["cache"])


class CacheStatsResponse(BaseModel):
    """Cache statistics response model."""
    hits: int
    misses: int
    evictions: int
    size: int
    hit_rate: float


class ClearCacheRequest(BaseModel):
    """Request to clear specific cache entries."""
    user_context: bool = False
    user_firmness: bool = False
    all: bool = False


@router.get("/stats", response_model=CacheStatsResponse)
async def get_cache_stats(
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Get cache statistics.
    
    Returns cache hit rate, size, and other metrics.
    
    **Authentication:** Required
    
    **Returns:**
    - hits: Number of cache hits
    - misses: Number of cache misses
    - evictions: Number of expired entries removed
    - size: Current number of cached entries
    - hit_rate: Cache hit rate as percentage
    """
    cache = get_cache()
    stats = cache.get_stats()

    return CacheStatsResponse(**stats)


@router.post("/clear")
async def clear_cache(
    request: ClearCacheRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Clear cache entries for the current user.
    
    Allows users to invalidate their cached data when they update
    their profile, context, or preferences.
    
    **Authentication:** Required
    
    **Request Body:**
    - user_context: Clear user context cache
    - user_firmness: Clear user firmness cache
    - all: Clear all user-specific caches
    
    **Returns:**
    - message: Success message
    - cleared: List of cache keys that were cleared
    """
    cache = get_cache()
    cleared_keys = []

    if request.all:
        # Clear all user-specific caches
        keys_to_clear = [
            make_user_context_key(current_user.id),
            make_user_firmness_key(current_user.id),
        ]
        for key in keys_to_clear:
            cache.delete(key)
            cleared_keys.append(key)
    else:
        # Clear specific caches
        if request.user_context:
            key = make_user_context_key(current_user.id)
            cache.delete(key)
            cleared_keys.append(key)

        if request.user_firmness:
            key = make_user_firmness_key(current_user.id)
            cache.delete(key)
            cleared_keys.append(key)

    return {
        "message": f"Cleared {len(cleared_keys)} cache entries",
        "cleared": cleared_keys,
    }


@router.post("/cleanup")
async def cleanup_expired_cache(
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Remove all expired cache entries.
    
    This is useful for freeing up memory by removing stale cache entries.
    Normally, expired entries are removed automatically when accessed.
    
    **Authentication:** Required
    
    **Returns:**
    - message: Success message
    - stats: Updated cache statistics
    """
    cache = get_cache()

    # Get stats before cleanup
    before_stats = cache.get_stats()
    before_size = before_stats["size"]

    # Cleanup expired entries
    cache.cleanup_expired()

    # Get stats after cleanup
    after_stats = cache.get_stats()
    after_size = after_stats["size"]

    removed = before_size - after_size

    return {
        "message": f"Removed {removed} expired cache entries",
        "stats": after_stats,
    }
