"""
Unit tests for proactive_agent.py
Tests proactive check-in and re-engagement functionality
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.proactive_agent import (
    get_user_top_goal,
    get_user_context_summary,
    generate_checkin_message,
    send_reengagement_notification,
    CHECKIN_PROMPT
)


@pytest.mark.asyncio
async def test_get_user_top_goal_success():
    """Test retrieving user's top active goal"""
    user_id = "test-user-id"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [{"title": "Complete my project"}]
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_top_goal(user_id)
    
    assert result == "Complete my project"


@pytest.mark.asyncio
async def test_get_user_top_goal_no_goals():
    """Test when user has no active goals"""
    user_id = "test-user-id"
    
    # Mock Supabase response with no goals
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_top_goal(user_id)
    
    assert result == "your goals"


@pytest.mark.asyncio
async def test_get_user_context_summary_success():
    """Test retrieving user context summary"""
    user_id = "test-user-id"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {"category": "values", "content": "Honesty and integrity"},
        {"category": "goals", "content": "Launch my startup"},
        {"category": "constraints", "content": "Limited time due to full-time job"}
    ]
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_context_summary(user_id)
    
    assert "values: Honesty and integrity" in result
    assert "goals: Launch my startup" in result
    assert "constraints: Limited time due to full-time job" in result


@pytest.mark.asyncio
async def test_get_user_context_summary_no_context():
    """Test when user has no context"""
    user_id = "test-user-id"
    
    # Mock Supabase response with no context
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_context_summary(user_id)
    
    assert result == "No context available"


@pytest.mark.asyncio
async def test_generate_checkin_message_success():
    """Test generating personalized check-in message"""
    user_id = "test-user-id"
    
    # Mock context and goal
    mock_context = "values: Growth mindset; goals: Learn Python"
    mock_goal = "Learn Python"
    
    # Mock Groq response
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = "Hey! How's that Python learning going? Ready to dive back in?"
    
    with patch("app.agents.proactive_agent.get_user_context_summary", return_value=mock_context):
        with patch("app.agents.proactive_agent.get_user_top_goal", return_value=mock_goal):
            with patch("app.agents.proactive_agent.get_groq_client") as mock_get_groq:
                mock_groq = MagicMock()
                mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
                mock_get_groq.return_value = mock_groq
                
                result = await generate_checkin_message(user_id)
    
    assert len(result) > 0
    assert result == "Hey! How's that Python learning going? Ready to dive back in?"
    
    # Verify Groq was called with correct parameters
    call_args = mock_groq.chat.completions.create.call_args
    assert call_args[1]["temperature"] == 0.7
    assert call_args[1]["max_tokens"] == 100
    
    # Verify prompt includes context and goal
    prompt = call_args[1]["messages"][0]["content"]
    assert mock_context in prompt
    assert mock_goal in prompt


@pytest.mark.asyncio
async def test_generate_checkin_message_strips_whitespace():
    """Test that generated message is stripped of whitespace"""
    user_id = "test-user-id"
    
    # Mock Groq response with extra whitespace
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = "  \n  Test message  \n  "
    
    with patch("app.agents.proactive_agent.get_user_context_summary", return_value="context"):
        with patch("app.agents.proactive_agent.get_user_top_goal", return_value="goal"):
            with patch("app.agents.proactive_agent.get_groq_client") as mock_get_groq:
                mock_groq = MagicMock()
                mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
                mock_get_groq.return_value = mock_groq
                
                result = await generate_checkin_message(user_id)
    
    assert result == "Test message"


@pytest.mark.asyncio
async def test_send_reengagement_notification_success():
    """Test sending re-engagement notification"""
    user_id = "test-user-id"
    
    # Mock message generation
    mock_message = "Your coach is thinking of you! Ready to continue?"
    
    # Mock notification service
    mock_notification_result = True
    
    with patch("app.agents.proactive_agent.generate_checkin_message", return_value=mock_message):
        with patch("app.agents.proactive_agent.send_push_notification", return_value=mock_notification_result) as mock_send:
            result = await send_reengagement_notification(user_id)
    
    assert result is True
    
    # Verify notification was sent with correct parameters
    mock_send.assert_called_once_with(
        user_id=user_id,
        title="Your coach is thinking of you",
        body=mock_message,
        data={"action": "open_chat"}
    )


@pytest.mark.asyncio
async def test_send_reengagement_notification_failure():
    """Test handling of notification send failure"""
    user_id = "test-user-id"
    
    # Mock message generation
    mock_message = "Test message"
    
    # Mock notification service failure
    mock_notification_result = False
    
    with patch("app.agents.proactive_agent.generate_checkin_message", return_value=mock_message):
        with patch("app.agents.proactive_agent.send_push_notification", return_value=mock_notification_result):
            result = await send_reengagement_notification(user_id)
    
    assert result is False


@pytest.mark.asyncio
async def test_checkin_prompt_format():
    """Test that CHECKIN_PROMPT has correct placeholders"""
    # Verify prompt contains required placeholders
    assert "{context}" in CHECKIN_PROMPT
    assert "{goal}" in CHECKIN_PROMPT
    
    # Verify prompt mentions key requirements
    assert "SHORT" in CHECKIN_PROMPT or "short" in CHECKIN_PROMPT
    assert "2 sentences" in CHECKIN_PROMPT or "two sentences" in CHECKIN_PROMPT


@pytest.mark.asyncio
async def test_generate_checkin_message_uses_fast_model():
    """Test that check-in generation uses fast model for efficiency"""
    user_id = "test-user-id"
    
    mock_groq_response = MagicMock()
    mock_groq_response.choices = [MagicMock()]
    mock_groq_response.choices[0].message.content = "Test"
    
    with patch("app.agents.proactive_agent.get_user_context_summary", return_value="context"):
        with patch("app.agents.proactive_agent.get_user_top_goal", return_value="goal"):
            with patch("app.agents.proactive_agent.get_groq_client") as mock_get_groq:
                mock_groq = MagicMock()
                mock_groq.chat.completions.create = AsyncMock(return_value=mock_groq_response)
                mock_get_groq.return_value = mock_groq
                
                await generate_checkin_message(user_id)
                
                # Verify using fast model
                call_args = mock_groq.chat.completions.create.call_args
                from app.services.groq_client import MODEL_FAST
                assert call_args[1]["model"] == MODEL_FAST


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
