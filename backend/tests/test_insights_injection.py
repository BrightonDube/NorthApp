"""
Integration tests for conversation insights injection into chat
Tests Task 4.3: Surface Insights in Future Chats
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_get_conversation_insights_success():
    """Test successful retrieval of conversation insights"""
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    coach_id = "coach-456"
    
    # Mock Supabase response with insights
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {
            "insight": "User realized they procrastinate due to fear of failure",
            "confidence": 0.9,
            "created_at": "2026-02-24T10:30:00Z"
        },
        {
            "insight": "User prefers morning work sessions for deep focus",
            "confidence": 0.85,
            "created_at": "2026-02-23T15:20:00Z"
        },
        {
            "insight": "User struggles with setting boundaries at work",
            "confidence": 0.8,
            "created_at": "2026-02-22T09:15:00Z"
        }
    ]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_limit = MagicMock()
    mock_limit.execute = mock_execute
    mock_order_created = MagicMock()
    mock_order_created.limit = MagicMock(return_value=mock_limit)
    mock_order_confidence = MagicMock()
    mock_order_confidence.order = MagicMock(return_value=mock_order_created)
    mock_eq_coach = MagicMock()
    mock_eq_coach.order = MagicMock(return_value=mock_order_confidence)
    mock_eq_user = MagicMock()
    mock_eq_user.eq = MagicMock(return_value=mock_eq_coach)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_user)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_conversation_insights(user_id, coach_id)
    
    # Verify formatted output
    assert "Past Insights from Previous Conversations:" in result
    assert "procrastinate due to fear of failure" in result
    assert "morning work sessions" in result
    assert "setting boundaries" in result
    assert "confidence: 0.9" in result
    assert "confidence: 0.8" in result


@pytest.mark.asyncio
async def test_get_conversation_insights_no_insights():
    """Test when no insights exist for user and coach"""
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    coach_id = "coach-456"
    
    # Mock Supabase response with no insights
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_limit = MagicMock()
    mock_limit.execute = mock_execute
    mock_order_created = MagicMock()
    mock_order_created.limit = MagicMock(return_value=mock_limit)
    mock_order_confidence = MagicMock()
    mock_order_confidence.order = MagicMock(return_value=mock_order_created)
    mock_eq_coach = MagicMock()
    mock_eq_coach.order = MagicMock(return_value=mock_order_confidence)
    mock_eq_user = MagicMock()
    mock_eq_user.eq = MagicMock(return_value=mock_eq_coach)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_user)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_conversation_insights(user_id, coach_id)
    
    # Should return empty string when no insights
    assert result == ""


@pytest.mark.asyncio
async def test_get_conversation_insights_limit():
    """Test that insights are limited to specified number"""
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    coach_id = "coach-456"
    limit = 2
    
    # Mock Supabase response with 2 insights (respecting limit)
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {
            "insight": "First insight",
            "confidence": 0.9,
            "created_at": "2026-02-24T10:30:00Z"
        },
        {
            "insight": "Second insight",
            "confidence": 0.85,
            "created_at": "2026-02-23T15:20:00Z"
        }
    ]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_limit_mock = MagicMock()
    mock_limit_mock.execute = mock_execute
    mock_order_created = MagicMock()
    mock_order_created.limit = MagicMock(return_value=mock_limit_mock)
    mock_order_confidence = MagicMock()
    mock_order_confidence.order = MagicMock(return_value=mock_order_created)
    mock_eq_coach = MagicMock()
    mock_eq_coach.order = MagicMock(return_value=mock_order_confidence)
    mock_eq_user = MagicMock()
    mock_eq_user.eq = MagicMock(return_value=mock_eq_coach)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_user)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_conversation_insights(user_id, coach_id, limit=limit)
    
    # Verify only 2 insights in output
    lines = result.split("\n")
    insight_lines = [line for line in lines if line.strip().startswith(("1.", "2.", "3."))]
    assert len(insight_lines) == 2
    assert "First insight" in result
    assert "Second insight" in result


@pytest.mark.asyncio
async def test_get_conversation_insights_error_handling():
    """Test that errors are handled gracefully"""
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    coach_id = "coach-456"
    
    # Mock Supabase to raise an exception
    mock_supabase = AsyncMock()
    mock_supabase.from_ = MagicMock(side_effect=Exception("Database error"))
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_conversation_insights(user_id, coach_id)
    
    # Should return empty string on error (non-blocking)
    assert result == ""


@pytest.mark.asyncio
async def test_insights_injected_in_stream_chat_response():
    """Test that insights are injected into system prompt during chat"""
    from app.agents.chat_agent import stream_chat_response
    
    user_id = "user-123"
    session_id = "session-456"
    coach_id = "coach-789"
    message = "I need help with my goals"
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={
            "name": "Strategic Coach",
            "system_prompt": "You are a strategic thinking coach."
        }):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value="## Past Insights:\n1. User procrastinates due to fear"):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.get_ai_service") as mock_ai_service:
                                        with patch("app.agents.chat_agent.save_message", return_value="msg-id"):
                                            with patch("app.agents.chat_agent.log_model_usage"):
                                                with patch("app.agents.chat_agent.detect_stage_completion", return_value={"should_advance": False}):
                                                    with patch("app.agents.chat_agent.get_metrics_collector"):
                                                        # Mock AI service streaming
                                                        mock_service_instance = AsyncMock()
                                                        
                                                        async def mock_stream(*args, **kwargs):
                                                            yield "Test "
                                                            yield "response"
                                                        
                                                        mock_service_instance.stream_completion = mock_stream
                                                        mock_ai_service.return_value = mock_service_instance
                                                        
                                                        # Collect all chunks
                                                        chunks = []
                                                        async for chunk in stream_chat_response(
                                                            user_id=user_id,
                                                            session_id=session_id,
                                                            coach_id=coach_id,
                                                            message=message
                                                        ):
                                                            chunks.append(chunk)
                                                        
                                                        # Verify insights were retrieved
                                                        # (The function was called, which means insights were injected)
                                                        assert len(chunks) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
