"""
Unit tests for notifications.py service
Tests push notification functionality
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.notifications import send_push_notification


@pytest.mark.asyncio
async def test_send_push_notification_success():
    """Test successful push notification send"""
    user_id = "test-user-id"
    title = "Test Notification"
    body = "This is a test message"
    data = {"action": "open_chat"}
    
    # Mock settings
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    # Mock HTTP response
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            result = await send_push_notification(user_id, title, body, data)
    
    assert result is True
    
    # Verify API was called with correct parameters
    call_args = mock_client.post.call_args
    assert call_args[0][0] == "https://onesignal.com/api/v1/notifications"
    
    # Verify headers
    headers = call_args[1]["headers"]
    assert "Authorization" in headers
    assert headers["Authorization"] == "Basic test-api-key"
    assert headers["Content-Type"] == "application/json"
    
    # Verify payload
    payload = call_args[1]["json"]
    assert payload["app_id"] == "test-app-id"
    assert payload["headings"]["en"] == title
    assert payload["contents"]["en"] == body
    assert payload["data"] == data
    assert payload["filters"][0]["value"] == user_id


@pytest.mark.asyncio
async def test_send_push_notification_without_data():
    """Test push notification without custom data"""
    user_id = "test-user-id"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            result = await send_push_notification(user_id, title, body)
    
    assert result is True
    
    # Verify data field is not in payload when not provided
    call_args = mock_client.post.call_args
    payload = call_args[1]["json"]
    assert "data" not in payload or payload.get("data") is None


@pytest.mark.asyncio
async def test_send_push_notification_no_app_id():
    """Test handling when OneSignal app ID is not configured"""
    user_id = "test-user-id"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = None
    mock_settings.onesignal_api_key = "test-api-key"
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        result = await send_push_notification(user_id, title, body)
    
    # Should return False when not configured
    assert result is False


@pytest.mark.asyncio
async def test_send_push_notification_no_api_key():
    """Test handling when OneSignal API key is not configured"""
    user_id = "test-user-id"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = None
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        result = await send_push_notification(user_id, title, body)
    
    # Should return False when not configured
    assert result is False


@pytest.mark.asyncio
async def test_send_push_notification_api_error():
    """Test handling of OneSignal API errors"""
    user_id = "test-user-id"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    # Mock error response
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.text = "Invalid request"
    
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            result = await send_push_notification(user_id, title, body)
    
    # Should return False on API error
    assert result is False


@pytest.mark.asyncio
async def test_send_push_notification_user_filter():
    """Test that notification is filtered by user_id tag"""
    user_id = "specific-user-123"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            await send_push_notification(user_id, title, body)
    
    # Verify filter targets specific user
    call_args = mock_client.post.call_args
    payload = call_args[1]["json"]
    filters = payload["filters"]
    assert len(filters) == 1
    assert filters[0]["field"] == "tag"
    assert filters[0]["key"] == "user_id"
    assert filters[0]["relation"] == "="
    assert filters[0]["value"] == user_id


@pytest.mark.asyncio
async def test_send_push_notification_network_error():
    """Test handling of network errors"""
    user_id = "test-user-id"
    title = "Test"
    body = "Message"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    # Mock network error
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=Exception("Network error"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(Exception, match="Network error"):
                await send_push_notification(user_id, title, body)


@pytest.mark.asyncio
async def test_send_push_notification_localization():
    """Test that notifications use English localization"""
    user_id = "test-user-id"
    title = "Test Title"
    body = "Test Body"
    
    mock_settings = MagicMock()
    mock_settings.onesignal_app_id = "test-app-id"
    mock_settings.onesignal_api_key = "test-api-key"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    
    with patch("app.services.notifications.get_settings", return_value=mock_settings):
        with patch("app.services.notifications.httpx.AsyncClient", return_value=mock_client):
            await send_push_notification(user_id, title, body)
    
    # Verify English localization
    call_args = mock_client.post.call_args
    payload = call_args[1]["json"]
    assert payload["headings"]["en"] == title
    assert payload["contents"]["en"] == body


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
