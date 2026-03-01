"""
Integration tests for caching in the chat agent.

Tests that caching is properly integrated with:
- Coach prompt retrieval
- User context retrieval
- User firmness retrieval
- Embeddings generation
- Memory search
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.chat_agent import (
    get_user_firmness,
    get_coach_system_prompt,
    get_coach_info,
    get_user_context_text,
)
from app.services.cache import get_cache
from app.services.embeddings import create_embedding
from app.services.rag import retrieve_relevant_memories


def _build_supabase_chain_mock(mock_result, chain_methods=("select", "eq", "single")):
    """Build a mock that mimics the Supabase sync builder chain ending in async execute()."""
    mock_client = MagicMock()
    chain = mock_client.from_.return_value
    for method in chain_methods:
        chain = getattr(chain, method).return_value
    chain.execute = AsyncMock(return_value=mock_result)
    return mock_client


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear cache before each test."""
    cache = get_cache()
    cache.clear()
    yield
    cache.clear()


@pytest.mark.asyncio
async def test_user_firmness_caching():
    """Test that user firmness is cached."""
    user_id = "test-user-123"
    
    mock_result = MagicMock()
    mock_result.data = {"firmness_level": 7}
    
    mock_client = _build_supabase_chain_mock(mock_result, ("select", "eq", "single"))
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", new=async_mock_client):
        
        # First call - should hit database
        firmness1 = await get_user_firmness(user_id)
        assert firmness1 == 7
        assert mock_client.from_.call_count == 1
        
        # Second call - should hit cache
        firmness2 = await get_user_firmness(user_id)
        assert firmness2 == 7
        assert mock_client.from_.call_count == 1  # No additional DB call
        
        # Verify cache stats
        cache = get_cache()
        stats = cache.get_stats()
        assert stats["hits"] == 1
        assert stats["misses"] == 1


@pytest.mark.asyncio
async def test_coach_prompt_caching():
    """Test that coach prompts are cached."""
    coach_id = "test-coach-123"
    
    mock_result = MagicMock()
    mock_result.data = {
        "system_prompt": "You are a strategic thinking coach.",
        "name": "Strategy Coach"
    }
    
    mock_client = _build_supabase_chain_mock(mock_result, ("select", "eq", "single"))
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", new=async_mock_client):
        
        # First call - should hit database
        prompt1 = await get_coach_system_prompt(coach_id)
        assert prompt1 == "You are a strategic thinking coach."
        assert mock_client.from_.call_count == 1
        
        # Second call - should hit cache
        prompt2 = await get_coach_system_prompt(coach_id)
        assert prompt2 == "You are a strategic thinking coach."
        assert mock_client.from_.call_count == 1  # No additional DB call


@pytest.mark.asyncio
async def test_coach_info_caching():
    """Test that coach info is cached."""
    coach_id = "test-coach-123"
    
    mock_result = MagicMock()
    mock_result.data = {
        "system_prompt": "You are a strategic thinking coach.",
        "name": "Strategy Coach"
    }
    
    mock_client = _build_supabase_chain_mock(mock_result, ("select", "eq", "single"))
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", new=async_mock_client):
        
        # First call - should hit database
        info1 = await get_coach_info(coach_id)
        assert info1["name"] == "Strategy Coach"
        assert info1["system_prompt"] == "You are a strategic thinking coach."
        assert mock_client.from_.call_count == 1
        
        # Second call - should hit cache
        info2 = await get_coach_info(coach_id)
        assert info2["name"] == "Strategy Coach"
        assert mock_client.from_.call_count == 1  # No additional DB call


@pytest.mark.asyncio
async def test_user_context_caching():
    """Test that user context is cached."""
    user_id = "test-user-123"
    
    mock_result = MagicMock()
    mock_result.data = [
        {"category": "values", "content": "Honesty"},
        {"category": "goals", "content": "Launch side project"},
    ]
    
    mock_client = _build_supabase_chain_mock(mock_result, ("select", "eq"))
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", new=async_mock_client):
        
        # First call - should hit database
        context1 = await get_user_context_text(user_id)
        assert "Honesty" in context1
        assert "Launch side project" in context1
        assert mock_client.from_.call_count == 1
        
        # Second call - should hit cache
        context2 = await get_user_context_text(user_id)
        assert context2 == context1
        assert mock_client.from_.call_count == 1  # No additional DB call


@pytest.mark.asyncio
async def test_embedding_caching():
    """Test that embeddings are cached."""
    text = "This is a test query for embedding"
    
    # Mock the Voyage API call
    mock_response = AsyncMock()
    mock_response.embeddings = [[0.1] * 1536]  # Mock embedding vector (matches config dimensions)
    
    with patch("app.services.embeddings.voyageai.Client") as mock_client_class:
        mock_client = AsyncMock()
        mock_client.embed.return_value = mock_response
        mock_client_class.return_value = mock_client
        
        with patch("app.services.embeddings.asyncio.to_thread") as mock_to_thread:
            mock_to_thread.return_value = mock_response
            
            # First call - should hit API
            embedding1 = await create_embedding(text)
            assert len(embedding1) == 1536
            assert mock_to_thread.call_count == 1
            
            # Second call - should hit cache
            embedding2 = await create_embedding(text)
            assert embedding2 == embedding1
            assert mock_to_thread.call_count == 1  # No additional API call


@pytest.mark.asyncio
async def test_memory_search_caching():
    """Test that memory search results are cached."""
    user_id = "test-user-123"
    query = "test query"
    
    mock_embedding = [0.1] * 1024
    
    mock_result = MagicMock()
    mock_result.data = [
        {"content": "Memory 1", "similarity": 0.9},
        {"content": "Memory 2", "similarity": 0.8},
    ]
    
    mock_client = MagicMock()
    mock_client.rpc.return_value.execute = AsyncMock(return_value=mock_result)
    
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.services.rag.create_embedding", return_value=mock_embedding):
        with patch("app.services.rag.get_async_supabase_client", new=async_mock_client):
            
            # First call - should hit database
            memories1 = await retrieve_relevant_memories(user_id, query)
            assert len(memories1) == 2
            assert mock_client.rpc.call_count == 1
            
            # Second call - should hit cache
            memories2 = await retrieve_relevant_memories(user_id, query)
            assert memories2 == memories1
            assert mock_client.rpc.call_count == 1  # No additional DB call


@pytest.mark.asyncio
async def test_cache_hit_rate_improvement():
    """Test that cache improves hit rate over multiple requests."""
    user_id = "test-user-123"
    
    mock_result = MagicMock()
    mock_result.data = {"firmness_level": 5}
    
    mock_client = _build_supabase_chain_mock(mock_result, ("select", "eq", "single"))
    async_mock_client = AsyncMock(return_value=mock_client)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", new=async_mock_client):
        
        # Make 10 requests
        for _ in range(10):
            await get_user_firmness(user_id)
        
        # Should only hit database once
        assert mock_client.from_.call_count == 1
        
        # Check cache stats
        cache = get_cache()
        stats = cache.get_stats()
        assert stats["hits"] == 9  # 9 cache hits
        assert stats["misses"] == 1  # 1 cache miss (first request)
        assert stats["hit_rate"] == 90.0  # 90% hit rate
