"""
Integration tests for conversation insights API endpoints
Tests the /sessions/{id}/insights and /insights endpoints
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_extract_session_insights_success():
    """Test successful insight extraction via API endpoint"""
    from app.api.v1.chat import extract_session_insights
    from app.dependencies import AuthUser
    
    session_id = "session-123"
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase session verification
    mock_supabase = AsyncMock()
    mock_session_result = MagicMock()
    mock_session_result.data = {
        "id": session_id,
        "user_id": user.id,
        "coach_id": "coach-789"
    }
    
    # Create proper mock chain for session query
    mock_execute = AsyncMock(return_value=mock_session_result)
    mock_single = MagicMock()
    mock_single.execute = mock_execute
    mock_eq_chain = MagicMock()
    mock_eq_chain.eq = MagicMock(return_value=MagicMock())
    mock_eq_chain.eq.return_value.single = MagicMock(return_value=mock_single)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_chain)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.api.v1.chat.extract_conversation_insights", return_value=3):
            result = await extract_session_insights(session_id, user)
    
    assert result["insights_extracted"] == 3
    assert "Successfully extracted 3 insights" in result["message"]


@pytest.mark.asyncio
async def test_extract_session_insights_not_found():
    """Test insight extraction when session doesn't exist"""
    from app.api.v1.chat import extract_session_insights
    from app.dependencies import AuthUser
    
    session_id = "nonexistent-session"
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase to return no session
    mock_supabase = AsyncMock()
    mock_session_result = MagicMock()
    mock_session_result.data = None
    
    mock_execute = AsyncMock(return_value=mock_session_result)
    mock_single = MagicMock()
    mock_single.execute = mock_execute
    mock_eq_chain = MagicMock()
    mock_eq_chain.eq = MagicMock(return_value=MagicMock())
    mock_eq_chain.eq.return_value.single = MagicMock(return_value=mock_single)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_chain)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await extract_session_insights(session_id, user)
    
    assert exc_info.value.status_code == 404
    assert "Session not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_extract_session_insights_too_short():
    """Test insight extraction when conversation is too short"""
    from app.api.v1.chat import extract_session_insights
    from app.dependencies import AuthUser
    
    session_id = "session-123"
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase session verification
    mock_supabase = AsyncMock()
    mock_session_result = MagicMock()
    mock_session_result.data = {
        "id": session_id,
        "user_id": user.id,
        "coach_id": "coach-789"
    }
    
    # Mock messages query to return only 3 messages
    mock_messages_result = MagicMock()
    mock_messages_result.data = [{"id": "1"}, {"id": "2"}, {"id": "3"}]
    
    # Create proper mock chain for session query
    mock_execute = AsyncMock(return_value=mock_session_result)
    mock_single = MagicMock()
    mock_single.execute = mock_execute
    mock_eq_chain = MagicMock()
    mock_eq_chain.eq = MagicMock(return_value=MagicMock())
    mock_eq_chain.eq.return_value.single = MagicMock(return_value=mock_single)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_chain)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    
    # Setup for messages query
    mock_messages_execute = AsyncMock(return_value=mock_messages_result)
    mock_messages_eq = MagicMock()
    mock_messages_eq.execute = mock_messages_execute
    mock_messages_select = MagicMock()
    mock_messages_select.eq = MagicMock(return_value=mock_messages_eq)
    
    def from_side_effect(table):
        if table == "chat_sessions":
            return mock_from
        elif table == "messages":
            mock_msg_from = MagicMock()
            mock_msg_from.select = MagicMock(return_value=mock_messages_select)
            return mock_msg_from
    
    mock_supabase.from_ = MagicMock(side_effect=from_side_effect)
    
    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.api.v1.chat.extract_conversation_insights", return_value=0):
            with pytest.raises(HTTPException) as exc_info:
                await extract_session_insights(session_id, user)
    
    assert exc_info.value.status_code == 400
    assert "too short" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_list_insights_success():
    """Test listing insights via API endpoint"""
    from app.api.v1.memories import list_insights
    from app.dependencies import AuthUser
    
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {
            "id": "insight-1",
            "insight": "User realized they procrastinate due to fear",
            "confidence": 0.9,
            "session_id": "session-123",
            "coach_id": "coach-789",
            "created_at": "2026-02-24T10:30:00Z"
        }
    ]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_limit = MagicMock()
    mock_limit.execute = mock_execute
    mock_order = MagicMock()
    mock_order.limit = MagicMock(return_value=mock_limit)
    mock_eq = MagicMock()
    mock_eq.order = MagicMock(return_value=mock_order)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.memories.get_async_supabase_client", return_value=mock_supabase):
        result = await list_insights(user=user)
    
    assert len(result) == 1
    assert result[0]["insight"] == "User realized they procrastinate due to fear"
    assert result[0]["confidence"] == 0.9


@pytest.mark.asyncio
async def test_list_insights_with_coach_filter():
    """Test listing insights filtered by coach"""
    from app.api.v1.memories import list_insights
    from app.dependencies import AuthUser
    
    user = AuthUser(id="user-456", email="test@example.com")
    coach_id = "strategic-thinking"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    # Create proper mock chain with coach filter
    mock_execute = AsyncMock(return_value=mock_result)
    mock_eq_coach = MagicMock()
    mock_eq_coach.execute = mock_execute
    mock_limit = MagicMock()
    mock_limit.eq = MagicMock(return_value=mock_eq_coach)
    mock_order = MagicMock()
    mock_order.limit = MagicMock(return_value=mock_limit)
    mock_eq_user = MagicMock()
    mock_eq_user.order = MagicMock(return_value=mock_order)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_user)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.memories.get_async_supabase_client", return_value=mock_supabase):
        result = await list_insights(coach_id=coach_id, user=user)
    
    # Verify result is empty list
    assert result == []


@pytest.mark.asyncio
async def test_delete_insight_success():
    """Test deleting an insight via API endpoint"""
    from app.api.v1.memories import delete_insight
    from app.dependencies import AuthUser
    
    insight_id = "insight-123"
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [{"id": insight_id}]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_eq_user = MagicMock()
    mock_eq_user.execute = mock_execute
    mock_eq_id = MagicMock()
    mock_eq_id.eq = MagicMock(return_value=mock_eq_user)
    mock_delete = MagicMock()
    mock_delete.eq = MagicMock(return_value=mock_eq_id)
    mock_from = MagicMock()
    mock_from.delete = MagicMock(return_value=mock_delete)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.memories.get_async_supabase_client", return_value=mock_supabase):
        # Should not raise exception
        await delete_insight(insight_id, user)


@pytest.mark.asyncio
async def test_delete_insight_not_found():
    """Test deleting a non-existent insight"""
    from app.api.v1.memories import delete_insight
    from app.dependencies import AuthUser
    
    insight_id = "nonexistent-insight"
    user = AuthUser(id="user-456", email="test@example.com")
    
    # Mock Supabase to return no data
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = None
    
    mock_execute = AsyncMock(return_value=mock_result)
    mock_eq_user = MagicMock()
    mock_eq_user.execute = mock_execute
    mock_eq_id = MagicMock()
    mock_eq_id.eq = MagicMock(return_value=mock_eq_user)
    mock_delete = MagicMock()
    mock_delete.eq = MagicMock(return_value=mock_eq_id)
    mock_from = MagicMock()
    mock_from.delete = MagicMock(return_value=mock_delete)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.api.v1.memories.get_async_supabase_client", return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await delete_insight(insight_id, user)
    
    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
