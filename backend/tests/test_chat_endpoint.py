"""
Integration tests for the chat streaming endpoint.
Tests Task 0.5: Verify chat functionality works
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
import json

client = TestClient(app)


def create_mock_supabase_client():
    """Create a mock Supabase client for testing"""
    mock_client = AsyncMock()
    
    # Mock session verification
    mock_session_result = MagicMock()
    mock_session_result.data = {
        "id": "test-session-id",
        "user_id": "test-user-id"
    }
    
    # Mock profile query (firmness level)
    mock_profile_result = MagicMock()
    mock_profile_result.data = {"firmness_level": 5}
    
    # Mock coach query
    mock_coach_result = MagicMock()
    mock_coach_result.data = {
        "system_prompt": "You are a helpful Socratic coach who asks questions.",
        "name": "Test Coach"
    }
    
    # Mock user context query
    mock_context_result = MagicMock()
    mock_context_result.data = []
    
    # Mock messages query (conversation history)
    mock_messages_result = MagicMock()
    mock_messages_result.data = []
    
    # Mock message insert
    mock_insert_result = MagicMock()
    mock_insert_result.data = [{"id": "test-message-id"}]
    
    # Setup the mock chain
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_session_result)
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_profile_result)
    mock_from.select.return_value.eq.return_value.execute = AsyncMock(return_value=mock_context_result)
    mock_from.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=mock_messages_result)
    mock_from.insert.return_value.execute = AsyncMock(return_value=mock_insert_result)
    
    mock_client.from_ = MagicMock(return_value=mock_from)
    
    return mock_client


def create_mock_groq_stream():
    """Create a mock Groq streaming response"""
    class MockChoice:
        def __init__(self, content):
            self.delta = MagicMock()
            self.delta.content = content
    
    class MockChunk:
        def __init__(self, content):
            self.choices = [MockChoice(content)]
    
    class MockStream:
        def __init__(self):
            self.chunks = [
                "What ",
                "brings ",
                "you ",
                "here ",
                "today?",
            ]
            self.index = 0
        
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, *args):
            pass
        
        def __aiter__(self):
            return self
        
        async def __anext__(self):
            if self.index >= len(self.chunks):
                raise StopAsyncIteration
            chunk = MockChunk(self.chunks[self.index])
            self.index += 1
            return chunk
    
    return MockStream()


@pytest.mark.asyncio
async def test_chat_stream_endpoint_success():
    """Test that chat endpoint streams responses successfully"""
    
    # Create valid JWT token (mock)
    test_token = "Bearer test.jwt.token"
    
    with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
        with patch("app.dependencies.get_current_user") as mock_auth:
            # Mock authentication
            mock_user = MagicMock()
            mock_user.id = "test-user-id"
            mock_user.email = "test@example.com"
            mock_auth.return_value = mock_user
            
            with patch("groq.AsyncGroq") as mock_groq_class:
                # Mock Groq client
                mock_groq = MagicMock()
                mock_groq.chat.completions.stream.return_value = create_mock_groq_stream()
                mock_groq_class.return_value = mock_groq
                
                # Make request
                response = client.post(
                    "/v1/chat/stream",
                    json={
                        "session_id": "test-session-id",
                        "coach_id": "test-coach-id",
                        "message": "Hello, can you help me?",
                        "attachments": []
                    },
                    headers={"Authorization": test_token}
                )
                
                # Verify response
                assert response.status_code == 200
                assert response.headers["content-type"] == "text/event-stream; charset=utf-8"
                
                # Parse SSE stream
                content = response.text
                lines = [line for line in content.split("\n") if line.startswith("data:")]
                
                # Should have multiple data chunks
                assert len(lines) > 0
                
                # Verify streaming format
                for line in lines[:-1]:  # All but last should be tokens
                    data = json.loads(line[6:])  # Remove "data: " prefix
                    assert data["type"] == "token"
                    assert "data" in data
                
                # Last message should be "done"
                last_data = json.loads(lines[-1][6:])
                assert last_data["type"] == "done"


@pytest.mark.asyncio
async def test_chat_stream_requires_authentication():
    """Test that chat endpoint requires valid authentication"""
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": "test-session-id",
            "coach_id": "test-coach-id",
            "message": "Hello",
        }
    )
    
    # Should return 401 without auth header
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_chat_stream_validates_session_ownership():
    """Test that users can only access their own sessions"""
    
    with patch("app.dependencies.get_current_user") as mock_auth:
        mock_user = MagicMock()
        mock_user.id = "user-1"
        mock_auth.return_value = mock_user
        
        # Mock Supabase to return no session (user doesn't own it)
        mock_client = AsyncMock()
        mock_result = MagicMock()
        mock_result.data = None  # Session not found
        
        mock_from = MagicMock()
        mock_from.select.return_value.eq.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_result)
        mock_client.from_ = MagicMock(return_value=mock_from)
        
        with patch("app.services.supabase.get_async_supabase_client", return_value=mock_client):
            response = client.post(
                "/v1/chat/stream",
                json={
                    "session_id": "other-user-session",
                    "coach_id": "test-coach-id",
                    "message": "Hello",
                },
                headers={"Authorization": "Bearer test.token"}
            )
            
            # Should return 404 for session not found
            assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_stream_with_multimodal_input():
    """Test that chat endpoint handles image attachments"""
    
    test_token = "Bearer test.jwt.token"
    
    with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
        with patch("app.dependencies.get_current_user") as mock_auth:
            mock_user = MagicMock()
            mock_user.id = "test-user-id"
            mock_auth.return_value = mock_user
            
            with patch("groq.AsyncGroq") as mock_groq_class:
                mock_groq = MagicMock()
                mock_groq.chat.completions.stream.return_value = create_mock_groq_stream()
                mock_groq_class.return_value = mock_groq
                
                # Request with image attachment
                response = client.post(
                    "/v1/chat/stream",
                    json={
                        "session_id": "test-session-id",
                        "coach_id": "test-coach-id",
                        "message": "What do you see in this image?",
                        "attachments": [
                            {
                                "type": "image",
                                "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                                "mime_type": "image/png"
                            }
                        ]
                    },
                    headers={"Authorization": test_token}
                )
                
                assert response.status_code == 200
                
                # Verify Groq was called with multimodal content
                call_args = mock_groq.chat.completions.stream.call_args
                messages = call_args[1]["messages"]
                
                # Last message should have multimodal content
                user_message = messages[-1]
                assert user_message["role"] == "user"
                # Content should be a list with text and image_url
                assert isinstance(user_message["content"], list)


def test_health_endpoint():
    """Verify health endpoint is accessible"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
