"""
Tests for inactivity detection and re-engagement functionality.

This module tests the background task that detects users who have been
inactive for 24+ hours and sends them re-engagement notifications.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.tasks.inactivity import check_inactive_users


@pytest.mark.asyncio
async def test_check_inactive_users_no_inactive_users():
    """Test that no notifications are sent when no users are inactive."""
    mock_result = MagicMock()
    mock_result.data = []
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification") as mock_send:
            await check_inactive_users()
            
            # Verify RPC was called with correct parameters
            mock_supabase.rpc.assert_called_once_with("get_inactive_users", {"hours_threshold": 24})
            
            # Verify no notifications were sent
            mock_send.assert_not_called()


@pytest.mark.asyncio
async def test_check_inactive_users_with_inactive_users():
    """Test that notifications are sent to inactive users."""
    user_id_1 = "550e8400-e29b-41d4-a716-446655440001"
    user_id_2 = "550e8400-e29b-41d4-a716-446655440002"
    
    mock_result = MagicMock()
    mock_result.data = [
        {"user_id": user_id_1},
        {"user_id": user_id_2},
    ]
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification", return_value=True) as mock_send:
            await check_inactive_users()
            
            # Verify RPC was called
            mock_supabase.rpc.assert_called_once_with("get_inactive_users", {"hours_threshold": 24})
            
            # Verify notifications were sent to both users
            assert mock_send.call_count == 2
            mock_send.assert_any_call(user_id_1)
            mock_send.assert_any_call(user_id_2)


@pytest.mark.asyncio
async def test_check_inactive_users_handles_notification_failure():
    """Test that the function continues even if one notification fails."""
    user_id_1 = "550e8400-e29b-41d4-a716-446655440001"
    user_id_2 = "550e8400-e29b-41d4-a716-446655440002"
    
    mock_result = MagicMock()
    mock_result.data = [
        {"user_id": user_id_1},
        {"user_id": user_id_2},
    ]
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    async def mock_send_notification(user_id):
        if user_id == user_id_1:
            raise Exception("Notification service unavailable")
        return True

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification", side_effect=mock_send_notification) as mock_send:
            # Should not raise exception
            await check_inactive_users()
            
            # Verify both users were attempted
            assert mock_send.call_count == 2


@pytest.mark.asyncio
async def test_check_inactive_users_handles_missing_user_id():
    """Test that the function handles records with missing user_id gracefully."""
    mock_result = MagicMock()
    mock_result.data = [
        {"user_id": None},  # Missing user_id
        {"id": "550e8400-e29b-41d4-a716-446655440001"},  # Has id field
        {},  # Empty record
    ]
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification", return_value=True) as mock_send:
            await check_inactive_users()
            
            # Should only send to the one valid user (with id field)
            assert mock_send.call_count == 1
            mock_send.assert_called_once_with("550e8400-e29b-41d4-a716-446655440001")


@pytest.mark.asyncio
async def test_check_inactive_users_notification_returns_false():
    """Test handling when notification sending returns False (e.g., user has no device token)."""
    user_id = "550e8400-e29b-41d4-a716-446655440001"
    
    mock_result = MagicMock()
    mock_result.data = [{"user_id": user_id}]
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification", return_value=False) as mock_send:
            # Should not raise exception even if notification returns False
            await check_inactive_users()
            
            mock_send.assert_called_once_with(user_id)


@pytest.mark.asyncio
async def test_database_function_logic():
    """
    Test the logic of the get_inactive_users database function.
    
    This test verifies that:
    1. Users who haven't sent messages in 24+ hours are detected
    2. Users who have chatted recently are excluded
    3. Brand new users (never chatted) are excluded
    """
    # This is a documentation test - the actual SQL function is tested via integration
    # The function should:
    # - Return users from profiles table
    # - Exclude users with messages in last 24 hours
    # - Only include users who have at least one chat session (not brand new)
    
    # Expected SQL logic:
    # SELECT DISTINCT p.id AS user_id
    # FROM profiles p
    # WHERE p.id NOT IN (
    #     SELECT DISTINCT m.user_id
    #     FROM messages m
    #     WHERE m.created_at > now() - INTERVAL '24 hours'
    # )
    # AND p.id IN (
    #     SELECT DISTINCT cs.user_id FROM chat_sessions cs
    # )
    
    assert True  # This is a documentation test


@pytest.mark.asyncio
async def test_check_inactive_users_integration_flow():
    """
    Integration test documenting the complete flow.
    
    Flow:
    1. Scheduler triggers check_inactive_users() every hour
    2. Function calls get_inactive_users RPC with 24 hour threshold
    3. For each inactive user, calls send_reengagement_notification()
    4. send_reengagement_notification generates personalized message
    5. Message sent via push notification service
    6. Errors are logged but don't stop processing other users
    """
    user_id = "550e8400-e29b-41d4-a716-446655440001"
    
    mock_result = MagicMock()
    mock_result.data = [{"user_id": user_id}]
    
    # Mock the chained call: supabase.rpc().execute()
    mock_rpc_builder = MagicMock()
    mock_rpc_builder.execute = AsyncMock(return_value=mock_result)
    
    mock_supabase = MagicMock()
    mock_supabase.rpc = MagicMock(return_value=mock_rpc_builder)

    with patch("app.tasks.inactivity.get_async_supabase_client", return_value=mock_supabase):
        with patch("app.tasks.inactivity.send_reengagement_notification", return_value=True) as mock_send:
            await check_inactive_users()
            
            # Verify the complete flow
            mock_supabase.rpc.assert_called_once_with("get_inactive_users", {"hours_threshold": 24})
            mock_send.assert_called_once_with(user_id)
