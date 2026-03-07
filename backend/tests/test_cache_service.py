"""
Tests for the caching service.

Tests cache functionality including:
- Basic get/set operations
- TTL expiration
- Cache statistics
- Key generation
"""

import time
from app.services.cache import (
    CacheService,
    get_cache,
    make_coach_prompt_key,
    make_user_context_key,
    make_user_firmness_key,
    make_embedding_key,
    make_memory_search_key,
)


def test_cache_set_and_get():
    """Test basic cache set and get operations."""
    cache = CacheService()
    
    # Set a value
    cache.set("test_key", "test_value", ttl_seconds=60)
    
    # Get the value
    value = cache.get("test_key")
    assert value == "test_value"


def test_cache_miss():
    """Test cache miss returns None."""
    cache = CacheService()
    
    # Get non-existent key
    value = cache.get("non_existent_key")
    assert value is None


def test_cache_expiration():
    """Test that cache entries expire after TTL."""
    cache = CacheService()
    
    # Set a value with 1 second TTL
    cache.set("expiring_key", "expiring_value", ttl_seconds=1)
    
    # Value should be available immediately
    value = cache.get("expiring_key")
    assert value == "expiring_value"
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Value should be expired
    value = cache.get("expiring_key")
    assert value is None


def test_cache_delete():
    """Test cache deletion."""
    cache = CacheService()
    
    # Set a value
    cache.set("delete_key", "delete_value", ttl_seconds=60)
    
    # Verify it exists
    assert cache.get("delete_key") == "delete_value"
    
    # Delete it
    cache.delete("delete_key")
    
    # Verify it's gone
    assert cache.get("delete_key") is None


def test_cache_clear():
    """Test clearing all cache entries."""
    cache = CacheService()
    
    # Set multiple values
    cache.set("key1", "value1", ttl_seconds=60)
    cache.set("key2", "value2", ttl_seconds=60)
    cache.set("key3", "value3", ttl_seconds=60)
    
    # Clear cache
    cache.clear()
    
    # Verify all are gone
    assert cache.get("key1") is None
    assert cache.get("key2") is None
    assert cache.get("key3") is None


def test_cache_stats():
    """Test cache statistics tracking."""
    cache = CacheService()
    
    # Set some values
    cache.set("key1", "value1", ttl_seconds=60)
    cache.set("key2", "value2", ttl_seconds=60)
    
    # Generate some hits
    cache.get("key1")
    cache.get("key1")
    cache.get("key2")
    
    # Generate some misses
    cache.get("non_existent1")
    cache.get("non_existent2")
    
    # Check stats
    stats = cache.get_stats()
    assert stats["hits"] == 3
    assert stats["misses"] == 2
    assert stats["size"] == 2
    assert stats["hit_rate"] == 60.0  # 3 hits / 5 total = 60%


def test_cache_cleanup_expired():
    """Test cleanup of expired entries."""
    cache = CacheService()
    
    # Set values with different TTLs
    cache.set("short_ttl", "value1", ttl_seconds=1)
    cache.set("long_ttl", "value2", ttl_seconds=60)
    
    # Wait for short TTL to expire
    time.sleep(1.1)
    
    # Cleanup expired entries
    cache.cleanup_expired()
    
    # Check that expired entry is gone but valid entry remains
    stats = cache.get_stats()
    assert stats["size"] == 1
    assert cache.get("long_ttl") == "value2"


def test_cache_hit_tracking():
    """Test that cache hits are tracked per entry."""
    cache = CacheService()
    
    # Set a value
    cache.set("tracked_key", "tracked_value", ttl_seconds=60)
    
    # Access it multiple times
    for _ in range(5):
        cache.get("tracked_key")
    
    # Check that hits were tracked
    entry = cache._cache.get("tracked_key")
    assert entry is not None
    assert entry.hits == 5


def test_make_coach_prompt_key():
    """Test coach prompt key generation."""
    coach_id = "550e8400-e29b-41d4-a716-446655440000"
    key = make_coach_prompt_key(coach_id)
    assert key == f"coach_prompt:{coach_id}"


def test_make_user_context_key():
    """Test user context key generation."""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    key = make_user_context_key(user_id)
    assert key == f"user_context:{user_id}"


def test_make_user_firmness_key():
    """Test user firmness key generation."""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    key = make_user_firmness_key(user_id)
    assert key == f"user_firmness:{user_id}"


def test_make_embedding_key():
    """Test embedding key generation."""
    text = "This is a test query"
    key1 = make_embedding_key(text)
    key2 = make_embedding_key(text)
    
    # Same text should generate same key
    assert key1 == key2
    
    # Key should be deterministic
    assert key1.startswith("embedding:")
    
    # Different text should generate different key
    key3 = make_embedding_key("Different text")
    assert key1 != key3


def test_make_memory_search_key():
    """Test memory search key generation."""
    user_id = "550e8400-e29b-41d4-a716-446655440000"
    query = "test query"
    
    key1 = make_memory_search_key(user_id, query)
    key2 = make_memory_search_key(user_id, query)
    
    # Same user and query should generate same key
    assert key1 == key2
    
    # Key should include user_id
    assert user_id in key1
    
    # Different query should generate different key
    key3 = make_memory_search_key(user_id, "different query")
    assert key1 != key3


def test_get_cache_singleton():
    """Test that get_cache returns the same instance."""
    cache1 = get_cache()
    cache2 = get_cache()
    
    # Should be the same instance
    assert cache1 is cache2
    
    # Set value in one, should be available in other
    cache1.set("singleton_test", "value", ttl_seconds=60)
    assert cache2.get("singleton_test") == "value"


def test_cache_with_complex_values():
    """Test caching complex data types."""
    cache = CacheService()
    
    # Test with dict
    dict_value = {"key": "value", "nested": {"data": 123}}
    cache.set("dict_key", dict_value, ttl_seconds=60)
    assert cache.get("dict_key") == dict_value
    
    # Test with list
    list_value = [1, 2, 3, "four", {"five": 5}]
    cache.set("list_key", list_value, ttl_seconds=60)
    assert cache.get("list_key") == list_value
    
    # Test with None
    cache.set("none_key", None, ttl_seconds=60)
    # Note: get() returns None for both missing and None values
    # This is a known limitation of the simple cache implementation


def test_cache_eviction_stats():
    """Test that evictions are tracked in stats."""
    cache = CacheService()
    
    # Set a value with short TTL
    cache.set("evict_key", "evict_value", ttl_seconds=1)
    
    # Wait for expiration
    time.sleep(1.1)
    
    # Access expired key (should trigger eviction)
    cache.get("evict_key")
    
    # Check eviction was tracked
    stats = cache.get_stats()
    assert stats["evictions"] == 1
