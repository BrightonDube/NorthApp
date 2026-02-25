from supabase import create_client, Client
from supabase._async.client import AsyncClient, create_client as create_async_client
from functools import lru_cache
from app.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Synchronous Supabase client (legacy - use get_async_supabase_client for async code)"""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


# Cached async client instance
_async_client: AsyncClient | None = None


async def get_async_supabase_client() -> AsyncClient:
    """Async Supabase client for use in async functions"""
    global _async_client
    if _async_client is None:
        settings = get_settings()
        _async_client = await create_async_client(settings.supabase_url, settings.supabase_service_key)
    return _async_client
