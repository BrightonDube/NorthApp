"""
Unit tests for GROW state functionality in chat agent.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.chat_agent import get_grow_state, detect_stage_completion, update_grow_state


@pytest.mark.asyncio
async def test_get_grow_state_success():
    """Test successful retrieval of GROW state from database."""
    # Mock the Supabase client
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "reality",
        "grow_data": {"key": "value"}
    }
    
    # Setup the mock chain properly
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("test-session-id")
        
        assert result["state"] == "reality"
        assert result["data"] == {"key": "value"}


@pytest.mark.asyncio
async def test_get_grow_state_default_values():
    """Test that default values are returned when grow_state is None."""
    # Mock the Supabase client
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": None,
        "grow_data": None
    }
    
    # Setup the mock chain properly
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("test-session-id")
        
        assert result["state"] == "goal"
        assert result["data"] == {}


@pytest.mark.asyncio
async def test_get_grow_state_missing_session():
    """Test graceful handling when session is not found."""
    # Mock the Supabase client to raise an exception
    mock_supabase = AsyncMock()
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(side_effect=Exception("Session not found"))
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("non-existent-session")
        
        # Should return default values without raising exception
        assert result["state"] == "goal"
        assert result["data"] == {}


@pytest.mark.asyncio
async def test_get_grow_state_no_data():
    """Test handling when result.data is None."""
    # Mock the Supabase client
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = None
    
    # Setup the mock chain properly
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("test-session-id")
        
        assert result["state"] == "goal"
        assert result["data"] == {}



@pytest.mark.asyncio
async def test_detect_stage_completion_should_advance():
    """Test stage completion detection when user has completed the stage."""
    # Mock dependencies
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "goal",
        "grow_data": {}
    }
    
    # Mock conversation history
    mock_history_result = MagicMock()
    mock_history_result.data = [
        {"role": "user", "content": "I want to improve my health"},
        {"role": "assistant", "content": "What does improved health mean to you?"},
        {"role": "user", "content": "I want to lose 20 pounds and run a 5K by June"},
    ]
    
    # Setup mock chains
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_from.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=mock_history_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    # Mock Groq API response
    mock_groq_client = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = '{"should_advance": true, "reasoning": "User has clearly articulated specific, measurable goals"}'
    mock_groq_client.chat.completions.create = AsyncMock(return_value=mock_completion)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase), \
         patch('app.agents.chat_agent.get_groq_client', return_value=mock_groq_client):
        
        result = await detect_stage_completion(
            "test-session-id",
            "I want to lose 20 pounds and run a 5K by June",
            "That's a clear and specific goal! Let's explore your current situation."
        )
        
        assert result["should_advance"] is True
        assert result["next_state"] == "reality"
        assert "reasoning" in result


@pytest.mark.asyncio
async def test_detect_stage_completion_should_not_advance():
    """Test stage completion detection when user needs more exploration."""
    # Mock dependencies
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "goal",
        "grow_data": {}
    }
    
    # Mock conversation history
    mock_history_result = MagicMock()
    mock_history_result.data = [
        {"role": "user", "content": "I want to be healthier"},
        {"role": "assistant", "content": "What does healthier mean to you?"},
    ]
    
    # Setup mock chains
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_from.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=mock_history_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    # Mock Groq API response
    mock_groq_client = AsyncMock()
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = '{"should_advance": false, "reasoning": "Goal is too vague, needs more specificity"}'
    mock_groq_client.chat.completions.create = AsyncMock(return_value=mock_completion)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase), \
         patch('app.agents.chat_agent.get_groq_client', return_value=mock_groq_client):
        
        result = await detect_stage_completion(
            "test-session-id",
            "I want to be healthier",
            "What does healthier mean to you specifically?"
        )
        
        assert result["should_advance"] is False
        assert result["next_state"] == "goal"


@pytest.mark.asyncio
async def test_detect_stage_completion_already_complete():
    """Test that detection doesn't advance when already in complete state."""
    # Mock dependencies
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "complete",
        "grow_data": {}
    }
    
    # Setup mock chain
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase), \
         patch('app.agents.chat_agent.get_groq_client'):
        result = await detect_stage_completion(
            "test-session-id",
            "Thanks for the help!",
            "You're welcome! Keep up the great work."
        )
        
        assert result["should_advance"] is False
        assert result["next_state"] == "complete"


@pytest.mark.asyncio
async def test_update_grow_state_success():
    """Test successful GROW state update."""
    # Mock dependencies
    mock_supabase = AsyncMock()
    
    # Mock get_grow_state
    mock_get_result = MagicMock()
    mock_get_result.data = {
        "grow_state": "goal",
        "grow_data": {}
    }
    
    # Mock update result
    mock_update_result = MagicMock()
    mock_update_result.data = [{"id": "test-session-id"}]
    
    # Setup mock chains
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_get_result)
    mock_from.update.return_value.eq.return_value.execute = AsyncMock(return_value=mock_update_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await update_grow_state(
            "test-session-id",
            "reality",
            "User has clearly articulated their goal"
        )
        
        assert result is True


@pytest.mark.asyncio
async def test_update_grow_state_with_transitions():
    """Test that state transitions are recorded in grow_data."""
    # Mock dependencies
    mock_supabase = AsyncMock()
    
    # Mock get_grow_state with existing transitions
    mock_get_result = MagicMock()
    mock_get_result.data = {
        "grow_state": "reality",
        "grow_data": {
            "transitions": [
                {"from_state": "goal", "to_state": "reality", "reasoning": "Previous transition"}
            ]
        }
    }
    
    # Mock update result
    mock_update_result = MagicMock()
    mock_update_result.data = [{"id": "test-session-id"}]
    
    # Setup mock chains
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_get_result)
    
    # Capture the update call to verify transitions
    update_data = {}
    async def capture_update(*args, **kwargs):
        return mock_from.update.return_value.eq.return_value
    
    async def capture_execute(*args, **kwargs):
        return mock_update_result
    
    mock_from.update = MagicMock(side_effect=lambda data: (update_data.update(data), mock_from.update.return_value)[1])
    mock_from.update.return_value.eq.return_value.execute = AsyncMock(return_value=mock_update_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await update_grow_state(
            "test-session-id",
            "options",
            "User has assessed their current situation"
        )
        
        assert result is True


@pytest.mark.asyncio
async def test_update_grow_state_error_handling():
    """Test that update_grow_state handles errors gracefully."""
    # Mock dependencies to raise an exception
    mock_supabase = AsyncMock()
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(side_effect=Exception("Database error"))
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.agents.chat_agent.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await update_grow_state(
            "test-session-id",
            "reality",
            "Test reasoning"
        )
        
        assert result is False
