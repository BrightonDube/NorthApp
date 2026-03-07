"""
Integration tests for GROW API endpoints.
Tests the GET and PATCH endpoints for viewing and updating GROW state.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from app.api.v1.grow import get_grow_state, update_grow_state
from app.dependencies import AuthUser
from app.models.requests import UpdateGrowStateRequest


@pytest.mark.asyncio
async def test_get_grow_state_success():
    """Test successful retrieval of GROW state via API endpoint."""
    # Mock user
    user = AuthUser(id="test-user-id", email="test@example.com")
    
    # Mock Supabase client
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "reality",
        "grow_data": {"insights": ["User wants to lose weight"]},
        "grow_updated_at": "2026-02-24T10:00:00Z",
        "user_id": "test-user-id"
    }
    
    # Setup mock chain
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("test-session-id", user)
        
        assert result.state == "reality"
        assert result.data == {"insights": ["User wants to lose weight"]}
        assert result.updated_at == "2026-02-24T10:00:00Z"


@pytest.mark.asyncio
async def test_get_grow_state_not_found():
    """Test GET endpoint returns 404 when session doesn't exist."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    
    # Mock Supabase client to return no data
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = None
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await get_grow_state("non-existent-session", user)
        
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Session not found"


@pytest.mark.asyncio
async def test_get_grow_state_access_denied():
    """Test GET endpoint returns 403 when user doesn't own the session."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    
    # Mock Supabase client with different user_id
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": "goal",
        "grow_data": {},
        "grow_updated_at": "2026-02-24T10:00:00Z",
        "user_id": "different-user-id"  # Different user
    }
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await get_grow_state("test-session-id", user)
        
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Access denied"


@pytest.mark.asyncio
async def test_get_grow_state_default_values():
    """Test GET endpoint returns default values when grow_state is None."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {
        "grow_state": None,
        "grow_data": None,
        "grow_updated_at": None,
        "user_id": "test-user-id"
    }
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await get_grow_state("test-session-id", user)
        
        assert result.state == "goal"
        assert result.data == {}


@pytest.mark.asyncio
async def test_update_grow_state_success():
    """Test successful GROW state update via API endpoint."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    request = UpdateGrowStateRequest(
        grow_state="reality",
        grow_data={"insights": ["User has clear goal"]}
    )
    
    # Mock Supabase client
    mock_supabase = AsyncMock()
    
    # Mock existing session
    mock_existing = MagicMock()
    mock_existing.data = {
        "grow_state": "goal",
        "grow_data": {},
        "user_id": "test-user-id"
    }
    
    # Mock update result
    mock_update_result = MagicMock()
    mock_update_result.data = {
        "grow_state": "reality",
        "grow_data": {"insights": ["User has clear goal"]},
        "grow_updated_at": "2026-02-24T11:00:00Z"
    }
    
    # Setup mock chains
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_existing)
    mock_from.update.return_value.eq.return_value.select.return_value.single.return_value.execute = AsyncMock(return_value=mock_update_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await update_grow_state("test-session-id", request, user)
        
        assert result.state == "reality"
        assert result.data == {"insights": ["User has clear goal"]}
        assert result.updated_at == "2026-02-24T11:00:00Z"


@pytest.mark.asyncio
async def test_update_grow_state_invalid_transition():
    """Test PATCH endpoint rejects invalid state transitions."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    request = UpdateGrowStateRequest(
        grow_state="way_forward",  # Can't jump from goal to way_forward
        grow_data={}
    )
    
    # Mock Supabase client
    mock_supabase = AsyncMock()
    mock_existing = MagicMock()
    mock_existing.data = {
        "grow_state": "goal",
        "grow_data": {},
        "user_id": "test-user-id"
    }
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_existing)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await update_grow_state("test-session-id", request, user)
        
        assert exc_info.value.status_code == 400
        assert "Invalid state transition" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_grow_state_valid_transitions():
    """Test all valid state transitions are allowed."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    
    # Test valid transitions
    valid_transitions = [
        ("goal", "reality"),
        ("reality", "options"),
        ("options", "way_forward"),
        ("way_forward", "complete"),
        ("complete", "goal"),  # Can restart
        ("reality", "goal"),  # Can go back
    ]
    
    for from_state, to_state in valid_transitions:
        request = UpdateGrowStateRequest(grow_state=to_state, grow_data={})
        
        # Mock Supabase client
        mock_supabase = AsyncMock()
        mock_existing = MagicMock()
        mock_existing.data = {
            "grow_state": from_state,
            "grow_data": {},
            "user_id": "test-user-id"
        }
        
        mock_update_result = MagicMock()
        mock_update_result.data = {
            "grow_state": to_state,
            "grow_data": {},
            "grow_updated_at": "2026-02-24T11:00:00Z"
        }
        
        mock_from = MagicMock()
        mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_existing)
        mock_from.update.return_value.eq.return_value.select.return_value.single.return_value.execute = AsyncMock(return_value=mock_update_result)
        mock_supabase.from_ = MagicMock(return_value=mock_from)
        
        with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
            result = await update_grow_state("test-session-id", request, user)
            assert result.state == to_state


@pytest.mark.asyncio
async def test_update_grow_state_session_not_found():
    """Test PATCH endpoint returns 404 when session doesn't exist."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    request = UpdateGrowStateRequest(grow_state="reality", grow_data={})
    
    # Mock Supabase client to return no data
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = None
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await update_grow_state("non-existent-session", request, user)
        
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Session not found"


@pytest.mark.asyncio
async def test_update_grow_state_access_denied():
    """Test PATCH endpoint returns 403 when user doesn't own the session."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    request = UpdateGrowStateRequest(grow_state="reality", grow_data={})
    
    # Mock Supabase client with different user_id
    mock_supabase = AsyncMock()
    mock_existing = MagicMock()
    mock_existing.data = {
        "grow_state": "goal",
        "grow_data": {},
        "user_id": "different-user-id"  # Different user
    }
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_existing)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await update_grow_state("test-session-id", request, user)
        
        assert exc_info.value.status_code == 403
        assert exc_info.value.detail == "Access denied"


@pytest.mark.asyncio
async def test_update_grow_state_without_data():
    """Test PATCH endpoint works when grow_data is not provided."""
    user = AuthUser(id="test-user-id", email="test@example.com")
    request = UpdateGrowStateRequest(
        grow_state="reality",
        grow_data=None  # Not updating data
    )
    
    # Mock Supabase client
    mock_supabase = AsyncMock()
    mock_existing = MagicMock()
    mock_existing.data = {
        "grow_state": "goal",
        "grow_data": {"existing": "data"},
        "user_id": "test-user-id"
    }
    
    mock_update_result = MagicMock()
    mock_update_result.data = {
        "grow_state": "reality",
        "grow_data": {"existing": "data"},  # Data preserved
        "grow_updated_at": "2026-02-24T11:00:00Z"
    }
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_existing)
    mock_from.update.return_value.eq.return_value.select.return_value.single.return_value.execute = AsyncMock(return_value=mock_update_result)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch('app.api.v1.grow.get_async_supabase_client', new_callable=AsyncMock, return_value=mock_supabase):
        result = await update_grow_state("test-session-id", request, user)
        
        assert result.state == "reality"
        assert result.data == {"existing": "data"}
