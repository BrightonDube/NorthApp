"""
In-memory caching service for the Socratic AI Engine.

This module provides a simple in-memory cache with TTL (time-to-live) support
to reduce LLM costs and improve response times by caching:
- Coach system prompts
- User context
- Embeddings for common queries
- User firmness levels

The cache uses a dictionary-based approach with automatic expiration.
"""

import time
from typing import Any, Optional
from datetime import datetime, timezone
import hashlib


class CacheEntry:
    """Represents a single cache entry with expiration."""

    def __init__(self, value: Any, ttl_seconds: int):
        """
        Initialize a cache entry.
        
        Args:
            value: The value to cache
            ttl_seconds: Time-to-live in seconds
        """
        self.value = value
        self.expires_at = time.time() + ttl_seconds
        self.created_at = datetime.now(timezone.utc)
        self.hits = 0

    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        return time.time() > self.expires_at

    def record_hit(self):
        """Record a cache hit for analytics."""
        self.hits += 1


class CacheService:
    """
    In-memory cache service with TTL support.
    
    This is a simple implementation suitable for single-instance deployments.
    For multi-instance deployments, consider Redis or similar.
    """

    def __init__(self):
        """Initialize the cache service."""
        self._cache: dict[str, CacheEntry] = {}
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
        }

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: The cache key
            
        Returns:
            The cached value if found and not expired, None otherwise
        """
        entry = self._cache.get(key)

        if entry is None:
            self._stats["misses"] += 1
            return None

        if entry.is_expired():
            # Remove expired entry
            del self._cache[key]
            self._stats["misses"] += 1
            self._stats["evictions"] += 1
            return None

        # Cache hit
        entry.record_hit()
        self._stats["hits"] += 1
        return entry.value

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """
        Set a value in the cache.
        
        Args:
            key: The cache key
            value: The value to cache
            ttl_seconds: Time-to-live in seconds (default: 5 minutes)
        """
        self._cache[key] = CacheEntry(value, ttl_seconds)

    def delete(self, key: str):
        """
        Delete a value from the cache.
        
        Args:
            key: The cache key
        """
        if key in self._cache:
            del self._cache[key]

    def clear(self):
        """Clear all cache entries."""
        self._cache.clear()
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
        }

    def get_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            dict with hits, misses, evictions, size, and hit_rate
        """
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = (
            self._stats["hits"] / total_requests if total_requests > 0 else 0.0
        )

        return {
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "evictions": self._stats["evictions"],
            "size": len(self._cache),
            "hit_rate": round(hit_rate * 100, 2),  # Percentage
        }

    def cleanup_expired(self):
        """Remove all expired entries from the cache."""
        expired_keys = [
            key for key, entry in self._cache.items() if entry.is_expired()
        ]
        for key in expired_keys:
            del self._cache[key]
            self._stats["evictions"] += 1


# Global cache instance
_cache_instance: Optional[CacheService] = None


def get_cache() -> CacheService:
    """
    Get the global cache instance.
    
    Returns:
        The global CacheService instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance


# Cache key generators
def make_coach_prompt_key(coach_id: str) -> str:
    """Generate cache key for coach system prompt."""
    return f"coach_prompt:{coach_id}"


def make_user_context_key(user_id: str) -> str:
    """Generate cache key for user context."""
    return f"user_context:{user_id}"


def make_user_firmness_key(user_id: str) -> str:
    """Generate cache key for user firmness level."""
    return f"user_firmness:{user_id}"


def make_embedding_key(text: str) -> str:
    """
    Generate cache key for embeddings.
    
    Uses SHA256 hash of the text to create a consistent key.
    
    Args:
        text: The text to generate embedding for
        
    Returns:
        Cache key for the embedding
    """
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    return f"embedding:{text_hash}"


def make_memory_search_key(user_id: str, query: str) -> str:
    """
    Generate cache key for memory search results.
    
    Args:
        user_id: The user ID
        query: The search query
        
    Returns:
        Cache key for the memory search
    """
    query_hash = hashlib.sha256(query.encode()).hexdigest()[:16]
    return f"memory_search:{user_id}:{query_hash}"


# Cache TTL constants (in seconds)
TTL_COACH_PROMPT = 3600  # 1 hour - coach prompts rarely change
TTL_USER_CONTEXT = 300  # 5 minutes - user context can change
TTL_USER_FIRMNESS = 300  # 5 minutes - firmness level can change
TTL_EMBEDDING = 3600  # 1 hour - embeddings are deterministic
TTL_MEMORY_SEARCH = 300  # 5 minutes - memory search results can change
