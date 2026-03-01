"""
Unit tests for rag.py service

retrieve_relevant_memories checks a cache before calling create_embedding.
Every test that needs to reach the embedding / RPC layer must patch
`app.services.rag.get_cache` to return a no-op cache (always misses).
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.rag import retrieve_relevant_memories, format_memories_for_prompt


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_cache_miss() -> MagicMock:
    """Return a mock cache that always reports a miss and accepts set()."""
    cache = MagicMock()
    cache.get = MagicMock(return_value=None)
    cache.set = MagicMock()
    return cache


def _make_supabase_rpc(data: list) -> AsyncMock:
    """Return a Supabase mock whose .rpc(...).execute() returns data."""
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = data
    mock_execute = AsyncMock(return_value=mock_result)
    mock_rpc = MagicMock()
    mock_rpc.execute = mock_execute
    mock_supabase.rpc = MagicMock(return_value=mock_rpc)
    return mock_supabase


# ---------------------------------------------------------------------------
# retrieve_relevant_memories
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_retrieve_relevant_memories_success():
    """Successful retrieval returns memories in order."""
    user_id = "test-user-id"
    query = "What are my goals?"
    mock_embedding = [0.1] * 1536
    memories = [
        {"id": "mem-1", "content": "User wants to learn Python", "category": "goal", "importance": "high", "similarity": 0.85},
        {"id": "mem-2", "content": "User values continuous learning", "category": "value", "importance": "medium", "similarity": 0.78},
    ]
    mock_supabase = _make_supabase_rpc(memories)

    with patch("app.services.rag.get_cache", return_value=_make_cache_miss()):
        with patch("app.services.rag.create_embedding", return_value=mock_embedding):
            with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
                result = await retrieve_relevant_memories(user_id, query)

    assert len(result) == 2
    assert result[0]["content"] == "User wants to learn Python"
    assert result[1]["content"] == "User values continuous learning"

    call_args = mock_supabase.rpc.call_args
    assert call_args[0][0] == "match_memories"
    rpc_params = call_args[0][1]
    assert rpc_params["query_embedding"] == mock_embedding
    assert rpc_params["match_user_id"] == user_id
    assert rpc_params["match_count"] == 5
    assert rpc_params["match_threshold"] == 0.7


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_custom_params():
    """Custom limit and threshold are forwarded to the RPC call."""
    mock_supabase = _make_supabase_rpc([])

    with patch("app.services.rag.get_cache", return_value=_make_cache_miss()):
        with patch("app.services.rag.create_embedding", return_value=[0.1] * 1536):
            with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
                await retrieve_relevant_memories("user", "q", limit=10, threshold=0.8)

    rpc_params = mock_supabase.rpc.call_args[0][1]
    assert rpc_params["match_count"] == 10
    assert rpc_params["match_threshold"] == 0.8


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_no_embedding():
    """When create_embedding returns None, an empty list is returned immediately."""
    with patch("app.services.rag.get_cache", return_value=_make_cache_miss()):
        with patch("app.services.rag.create_embedding", return_value=None):
            result = await retrieve_relevant_memories("user", "query")

    assert result == []


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_empty_result():
    """When RPC returns None data, an empty list is returned."""
    mock_supabase = _make_supabase_rpc(None)

    with patch("app.services.rag.get_cache", return_value=_make_cache_miss()):
        with patch("app.services.rag.create_embedding", return_value=[0.1] * 1536):
            with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
                result = await retrieve_relevant_memories("user", "query")

    assert result == []


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_uses_query_input_type():
    """create_embedding must be called with input_type='query'."""
    mock_supabase = _make_supabase_rpc([])

    with patch("app.services.rag.get_cache", return_value=_make_cache_miss()):
        with patch("app.services.rag.create_embedding", return_value=[0.1] * 1536) as mock_embed:
            with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
                await retrieve_relevant_memories("user", "test query")

    mock_embed.assert_called_once_with("test query", input_type="query")


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_cache_hit():
    """When cache returns a hit, create_embedding and the DB are never called."""
    cached = [{"content": "cached memory"}]
    cache = MagicMock()
    cache.get = MagicMock(return_value=cached)
    cache.set = MagicMock()

    with patch("app.services.rag.get_cache", return_value=cache):
        with patch("app.services.rag.create_embedding") as mock_embed:
            result = await retrieve_relevant_memories("user", "query")

    assert result == cached
    mock_embed.assert_not_called()


@pytest.mark.asyncio
async def test_format_memories_for_prompt_success():
    """Test formatting memories for prompt injection"""
    memories = [
        {
            "content": "User wants to learn Python",
            "category": "goal",
            "importance": "high"
        },
        {
            "content": "User values honesty",
            "category": "value",
            "importance": "medium"
        },
        {
            "content": "User struggles with time management",
            "category": "struggle",
            "importance": "high"
        }
    ]
    
    result = await format_memories_for_prompt(memories)
    
    # Verify header is present
    assert "## Relevant memories about this user:" in result
    
    # Verify all memories are included
    assert "User wants to learn Python" in result
    assert "User values honesty" in result
    assert "User struggles with time management" in result
    
    # Verify categories are shown
    assert "[goal]" in result
    assert "[value]" in result
    assert "[struggle]" in result
    
    # Verify high importance items have star marker
    assert "⭐" in result
    lines = result.split("\n")
    high_importance_lines = [line for line in lines if "User wants to learn Python" in line or "User struggles with time management" in line]
    for line in high_importance_lines:
        assert "⭐" in line


@pytest.mark.asyncio
async def test_format_memories_for_prompt_empty():
    """Test formatting with no memories"""
    memories = []
    
    result = await format_memories_for_prompt(memories)
    
    # Should return empty string for no memories
    assert result == ""


@pytest.mark.asyncio
async def test_format_memories_for_prompt_missing_fields():
    """Test formatting memories with missing optional fields"""
    memories = [
        {
            "content": "User likes coffee",
            # Missing category and importance
        }
    ]
    
    result = await format_memories_for_prompt(memories)
    
    # Should handle missing fields gracefully
    assert "User likes coffee" in result
    assert "[fact]" in result  # Default category
    assert "-" in result  # Not high importance, so dash marker


@pytest.mark.asyncio
async def test_format_memories_for_prompt_medium_importance():
    """Test that medium importance uses dash marker"""
    memories = [
        {
            "content": "Test memory",
            "category": "fact",
            "importance": "medium"
        }
    ]
    
    result = await format_memories_for_prompt(memories)
    
    lines = result.split("\n")
    memory_line = [line for line in lines if "Test memory" in line][0]
    assert memory_line.startswith("-")
    assert "⭐" not in memory_line


@pytest.mark.asyncio
async def test_format_memories_for_prompt_low_importance():
    """Test that low importance uses dash marker"""
    memories = [
        {
            "content": "Test memory",
            "category": "fact",
            "importance": "low"
        }
    ]
    
    result = await format_memories_for_prompt(memories)
    
    lines = result.split("\n")
    memory_line = [line for line in lines if "Test memory" in line][0]
    assert memory_line.startswith("-")
    assert "⭐" not in memory_line


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
