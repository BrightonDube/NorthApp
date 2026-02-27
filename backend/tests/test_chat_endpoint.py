"""
Integration tests for the chat streaming endpoint.
Tests Task 2.6: Verify chat endpoint works with new AI service
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
    
    # Mock GROW state query
    mock_grow_result = MagicMock()
    mock_grow_result.data = {
        "grow_state": "goal",
        "grow_data": {}
    }
    
    # Mock message insert
    mock_insert_result = MagicMock()
    mock_insert_result.data = [{"id": "test-message-id"}]
    
    # Mock insights query
    mock_insights_result = MagicMock()
    mock_insights_result.data = []
    
    # Setup the mock chain - need to handle multiple query patterns
    def create_mock_from():
        mock_from = MagicMock()
        
        # Session verification query
        mock_from.select.return_value.eq.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_session_result)
        
        # Profile query
        mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(return_value=mock_profile_result)
        
        # User context query
        mock_from.select.return_value.eq.return_value.execute = AsyncMock(return_value=mock_context_result)
        
        # Messages query (conversation history)
        mock_from.select.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=mock_messages_result)
        
        # Insights query
        mock_from.select.return_value.eq.return_value.eq.return_value.order.return_value.order.return_value.limit.return_value.execute = AsyncMock(return_value=mock_insights_result)
        
        # Message insert
        mock_from.insert.return_value.execute = AsyncMock(return_value=mock_insert_result)
        
        return mock_from
    
    mock_client.from_ = MagicMock(side_effect=lambda table: create_mock_from())
    
    return mock_client


def create_mock_ai_service_stream():
    """Create a mock AIService streaming response"""
    async def mock_stream():
        chunks = [
            "What ",
            "brings ",
            "you ",
            "here ",
            "today?",
        ]
        for chunk in chunks:
            yield chunk
    
    return mock_stream()


@pytest.mark.asyncio
async def test_chat_stream_endpoint_success():
    """Test that chat endpoint streams responses successfully with new AIService"""
    
    # Create valid JWT token (mock)
    test_token = "Bearer test.jwt.token"
    
    # Mock RAG service to avoid embeddings dependency
    with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
        with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
            with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
                    with patch("app.dependencies.get_current_user") as mock_auth:
                        # Mock authentication
                        mock_user = MagicMock()
                        mock_user.id = "test-user-id"
                        mock_user.email = "test@example.com"
                        mock_auth.return_value = mock_user
                        
                        # Mock AIService instance and its stream_completion method
                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                            mock_ai_service = MagicMock()
                            mock_ai_service.stream_completion = MagicMock(return_value=create_mock_ai_service_stream())
                            mock_get_ai_service.return_value = mock_ai_service
                            
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
                            assert "text/event-stream" in response.headers["content-type"]
                            
                            # Parse SSE stream
                            content = response.text
                            lines = [line for line in content.split("\n") if line.startswith("data:")]
                            
                            # Should have multiple data chunks
                            assert len(lines) > 0
                            
                            # Verify streaming format
                            token_count = 0
                            done_count = 0
                            for line in lines:
                                data = json.loads(line[6:])  # Remove "data: " prefix
                                if data["type"] == "token":
                                    token_count += 1
                                    assert "data" in data
                                elif data["type"] == "done":
                                    done_count += 1
                                    assert "data" in data
                            
                            # Should have received token chunks and a done message
                            assert token_count > 0
                            assert done_count == 1
                            
                            # Verify AIService was called
                            assert mock_ai_service.stream_completion.called


@pytest.mark.asyncio
async def test_chat_stream_sse_format():
    """Test that SSE format is correct (data: {...}\\n\\n)"""
    
    test_token = "Bearer test.jwt.token"
    
    with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
        with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
            with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
                    with patch("app.dependencies.get_current_user") as mock_auth:
                        mock_user = MagicMock()
                        mock_user.id = "test-user-id"
                        mock_auth.return_value = mock_user
                        
                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                            mock_ai_service = MagicMock()
                            mock_ai_service.stream_completion = MagicMock(return_value=create_mock_ai_service_stream())
                            mock_get_ai_service.return_value = mock_ai_service
                            
                            response = client.post(
                                "/v1/chat/stream",
                                json={
                                    "session_id": "test-session-id",
                                    "coach_id": "test-coach-id",
                                    "message": "Test message",
                                },
                                headers={"Authorization": test_token}
                            )
                            
                            # Verify SSE format
                            content = response.text
                            
                            # Each event should be "data: {...}\n\n"
                            events = content.split("data: ")
                            for event in events[1:]:  # Skip first empty split
                                # Should end with \n\n
                                assert event.endswith("\n\n") or event.endswith("\n")
                                
                                # Should be valid JSON
                                json_str = event.strip()
                                data = json.loads(json_str)
                                
                                # Should have type field
                                assert "type" in data
                                assert data["type"] in ["token", "done", "error"]


@pytest.mark.asyncio
async def test_chat_stream_error_handling():
    """Test that errors are handled gracefully and returned in SSE format"""
    
    test_token = "Bearer test.jwt.token"
    
    with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
        with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
            with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
                    with patch("app.dependencies.get_current_user") as mock_auth:
                        mock_user = MagicMock()
                        mock_user.id = "test-user-id"
                        mock_auth.return_value = mock_user
                        
                        # Mock AIService to raise an error
                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                            from app.services.ai_service import AIServiceError
                            
                            async def error_stream():
                                raise AIServiceError("AI service temporarily unavailable")
                            
                            mock_ai_service = MagicMock()
                            mock_ai_service.stream_completion = MagicMock(return_value=error_stream())
                            mock_get_ai_service.return_value = mock_ai_service
                            
                            response = client.post(
                                "/v1/chat/stream",
                                json={
                                    "session_id": "test-session-id",
                                    "coach_id": "test-coach-id",
                                    "message": "Test message",
                                },
                                headers={"Authorization": test_token}
                            )
                            
                            # Should still return 200 (streaming started)
                            assert response.status_code == 200
                            
                            # Parse response
                            content = response.text
                            lines = [line for line in content.split("\n") if line.startswith("data:")]
                            
                            # Should have at least one error event
                            error_found = False
                            for line in lines:
                                data = json.loads(line[6:])
                                if data["type"] == "error":
                                    error_found = True
                                    assert "message" in data["data"]
                            
                            assert error_found, "Error event should be present in stream"


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
    
    # Should return 401 or 403 without auth header
    assert response.status_code in [401, 403]


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
    
    with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
        with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
            with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                with patch("app.services.supabase.get_async_supabase_client", return_value=create_mock_supabase_client()):
                    with patch("app.dependencies.get_current_user") as mock_auth:
                        mock_user = MagicMock()
                        mock_user.id = "test-user-id"
                        mock_auth.return_value = mock_user
                        
                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                            mock_ai_service = MagicMock()
                            mock_ai_service.stream_completion = MagicMock(return_value=create_mock_ai_service_stream())
                            mock_get_ai_service.return_value = mock_ai_service
                            
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
                            
                            # Verify AIService was called
                            assert mock_ai_service.stream_completion.called
                            
                            # Get the call arguments
                            call_args = mock_ai_service.stream_completion.call_args
                            request = call_args[0][0]  # First positional argument is AIRequest
                            
                            # Verify messages were passed
                            assert hasattr(request, 'messages')
                            messages = request.messages
                            
                            # Last message should be from user
                            user_message = messages[-1]
                            assert user_message["role"] == "user"
                            
                            # Content should be a list with text and image_url for multimodal
                            assert isinstance(user_message["content"], list)


def test_health_endpoint():
    """Verify health endpoint is accessible"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
