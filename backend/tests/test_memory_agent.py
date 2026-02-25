"""
Unit tests for memory_agent.py
Tests fact extraction and storage functionality
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.memory_agent import extract_and_store_facts, FACT_EXTRACTION_PROMPT


@pytest.mark.asyncio
async def test_extract_and_store_facts_success():
    """Test successful fact extraction and storage"""
    message = "I love working in the morning and I value honesty in relationships"
    user_id = "test-user-id"
    
    # Mock Groq response
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = '''
    {
        "facts": [
            {
                "content": "The user prefers working in the morning",
                "category": "preference",
                "importance": "medium"
            },
            {
                "content": "The user values honesty in relationships",
                "category": "value",
                "importance": "high"
            }
        ]
    }
    '''
    
    # Mock embedding response
    mock_embedding = [0.1] * 1536
    
    # Mock Supabase insert
    mock_supabase = AsyncMock()
    mock_insert_result = MagicMock()
    mock_insert_result.data = [{"id": "memory-1"}, {"id": "memory-2"}]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_insert_result)
    mock_insert = MagicMock()
    mock_insert.execute = mock_execute
    mock_from = MagicMock()
    mock_from.insert = MagicMock(return_value=mock_insert)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            with patch("app.agents.memory_agent.create_embedding", return_value=mock_embedding):
                result = await extract_and_store_facts(message, user_id)
    
    # Should have stored 2 facts
    assert result == 2
    
    # Verify Groq was called with correct prompt
    call_args = mock_groq.chat.completions.create.call_args
    assert FACT_EXTRACTION_PROMPT in call_args[1]["messages"][0]["content"]
    assert message in call_args[1]["messages"][0]["content"]


@pytest.mark.asyncio
async def test_extract_and_store_facts_no_facts():
    """Test when no facts are extracted from message"""
    message = "Hello"
    user_id = "test-user-id"
    
    # Mock Groq response with no facts
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = '{"facts": []}'
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        result = await extract_and_store_facts(message, user_id)
    
    # Should return 0 when no facts found
    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_groq_error():
    """Test handling of Groq API errors"""
    message = "Test message"
    user_id = "test-user-id"
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
        mock_get_groq.return_value = mock_groq
        
        result = await extract_and_store_facts(message, user_id)
    
    # Should return 0 on error
    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_invalid_json():
    """Test handling of invalid JSON response"""
    message = "Test message"
    user_id = "test-user-id"
    
    # Mock Groq response with invalid JSON
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = 'invalid json'
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        result = await extract_and_store_facts(message, user_id)
    
    # Should return 0 on JSON parse error
    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_with_source_message():
    """Test fact extraction with source message ID"""
    message = "I achieved my goal today"
    user_id = "test-user-id"
    source_message_id = "msg-123"
    
    # Mock Groq response
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = '''
    {
        "facts": [
            {
                "content": "The user achieved their goal",
                "category": "achievement",
                "importance": "high"
            }
        ]
    }
    '''
    
    mock_embedding = [0.1] * 1536
    mock_supabase = AsyncMock()
    mock_insert_result = MagicMock()
    mock_insert_result.data = [{"id": "memory-1"}]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_insert_result)
    mock_insert = MagicMock()
    mock_insert.execute = mock_execute
    mock_from = MagicMock()
    mock_from.insert = MagicMock(return_value=mock_insert)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            with patch("app.agents.memory_agent.create_embedding", return_value=mock_embedding):
                result = await extract_and_store_facts(message, user_id, source_message_id)
    
    assert result == 1
    
    # Verify source_message_id was included in insert
    insert_call = mock_supabase.from_.return_value.insert.call_args
    insert_data = insert_call[0][0]
    assert insert_data["source_message_id"] == source_message_id


@pytest.mark.asyncio
async def test_extract_and_store_facts_empty_content():
    """Test handling of facts with empty content"""
    message = "Test message"
    user_id = "test-user-id"
    
    # Mock Groq response with empty content
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = '''
    {
        "facts": [
            {
                "content": "",
                "category": "fact",
                "importance": "low"
            }
        ]
    }
    '''
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        result = await extract_and_store_facts(message, user_id)
    
    # Should skip empty content
    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_storage_error():
    """Test handling of database storage errors"""
    message = "I love coding"
    user_id = "test-user-id"
    
    # Mock Groq response
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = '''
    {
        "facts": [
            {
                "content": "The user loves coding",
                "category": "preference",
                "importance": "medium"
            }
        ]
    }
    '''
    
    mock_embedding = [0.1] * 1536
    
    # Mock Supabase to raise error on insert
    mock_supabase = AsyncMock()
    mock_supabase.from_.return_value.insert.return_value.execute = AsyncMock(
        side_effect=Exception("Database error")
    )
    
    with patch("app.agents.memory_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
        mock_get_groq.return_value = mock_groq
        
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            with patch("app.agents.memory_agent.create_embedding", return_value=mock_embedding):
                result = await extract_and_store_facts(message, user_id)
    
    # Should return 0 when storage fails
    assert result == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
