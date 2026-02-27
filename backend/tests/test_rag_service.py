"""
Unit tests for rag.py service
Tests memory retrieval and formatting functionality
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.rag import retrieve_relevant_memories, format_memories_for_prompt


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_success():
    """Test successful memory retrieval"""
    user_id = "test-user-id"
    query = "What are my goals?"
    
    # Mock embedding
    mock_embedding = [0.1] * 1536
    
    # Mock Supabase RPC response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {
            "id": "mem-1",
            "content": "User wants to learn Python",
            "category": "goal",
            "importance": "high",
            "similarity": 0.85
        },
        {
            "id": "mem-2",
            "content": "User values continuous learning",
            "category": "value",
            "importance": "medium",
            "similarity": 0.78
        }
    ]
    mock_execute = AsyncMock(return_value=mock_result)
    mock_rpc = MagicMock()
    mock_rpc.execute = mock_execute
    mock_supabase.rpc = MagicMock(return_value=mock_rpc)
    
    with patch("app.services.rag.create_embedding", return_value=mock_embedding):
        with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
            result = await retrieve_relevant_memories(user_id, query)
    
    assert len(result) == 2
    assert result[0]["content"] == "User wants to learn Python"
    assert result[1]["content"] == "User values continuous learning"
    
    # Verify RPC was called with correct parameters
    call_args = mock_supabase.rpc.call_args
    assert call_args[0][0] == "match_memories"
    rpc_params = call_args[0][1]
    assert rpc_params["query_embedding"] == mock_embedding
    assert rpc_params["match_user_id"] == user_id
    assert rpc_params["match_count"] == 5  # default limit
    assert rpc_params["match_threshold"] == 0.7  # default threshold


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_custom_params():
    """Test memory retrieval with custom limit and threshold"""
    user_id = "test-user-id"
    query = "test query"
    custom_limit = 10
    custom_threshold = 0.8
    
    mock_embedding = [0.1] * 1536
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    mock_execute = AsyncMock(return_value=mock_result)
    mock_rpc = MagicMock()
    mock_rpc.execute = mock_execute
    mock_supabase.rpc = MagicMock(return_value=mock_rpc)
    
    with patch("app.services.rag.create_embedding", return_value=mock_embedding):
        with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
            await retrieve_relevant_memories(user_id, query, limit=custom_limit, threshold=custom_threshold)
    
    # Verify custom parameters were used
    call_args = mock_supabase.rpc.call_args
    rpc_params = call_args[0][1]
    assert rpc_params["match_count"] == custom_limit
    assert rpc_params["match_threshold"] == custom_threshold


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_no_embedding():
    """Test handling when embedding creation fails"""
    user_id = "test-user-id"
    query = "test query"
    
    # Mock embedding failure (returns None or empty)
    with patch("app.services.rag.create_embedding", return_value=None):
        result = await retrieve_relevant_memories(user_id, query)
    
    # Should return empty list when embedding fails
    assert result == []


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_empty_result():
    """Test when no memories match the query"""
    user_id = "test-user-id"
    query = "test query"
    
    mock_embedding = [0.1] * 1536
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = None  # No matches
    mock_execute = AsyncMock(return_value=mock_result)
    mock_rpc = MagicMock()
    mock_rpc.execute = mock_execute
    mock_supabase.rpc = MagicMock(return_value=mock_rpc)
    
    with patch("app.services.rag.create_embedding", return_value=mock_embedding):
        with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
            result = await retrieve_relevant_memories(user_id, query)
    
    assert result == []


@pytest.mark.asyncio
async def test_retrieve_relevant_memories_uses_query_input_type():
    """Test that embedding is created with query input type"""
    user_id = "test-user-id"
    query = "test query"
    
    mock_embedding = [0.1] * 1536
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    mock_execute = AsyncMock(return_value=mock_result)
    mock_rpc = MagicMock()
    mock_rpc.execute = mock_execute
    mock_supabase.rpc = MagicMock(return_value=mock_rpc)
    
    with patch("app.services.rag.create_embedding", return_value=mock_embedding) as mock_create_embedding:
        with patch("app.services.rag.get_async_supabase_client", return_value=mock_supabase):
            await retrieve_relevant_memories(user_id, query)
    
    # Verify embedding was created with query input type
    mock_create_embedding.assert_called_once_with(query, input_type="query")


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
