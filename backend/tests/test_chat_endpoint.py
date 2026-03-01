"""
Integration tests for the chat streaming endpoint.
Tests Task 2.6: Verify chat endpoint works with new AI service
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.dependencies import get_current_user, AuthUser
import json

client = TestClient(app)


def _override_auth(user_id: str = "test-user-id", email: str = "test@example.com"):
    """Return a FastAPI dependency override function for get_current_user."""
    async def _fake_user():
        return AuthUser(id=user_id, email=email)
    return _fake_user


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


# Valid UUIDs used in all tests to satisfy Postgres uuid type validation.
_SESSION_UUID = "550e8400-e29b-41d4-a716-446655440000"
_COACH_UUID = "550e8400-e29b-41d4-a716-446655440001"

# Common patch targets — both locations that import get_async_supabase_client must
# be patched so no real Supabase call is ever made during unit tests.
_SUPABASE_PATCHES = [
    "app.api.v1.chat.get_async_supabase_client",
    "app.agents.chat_agent.get_async_supabase_client",
]
_AGENT_PATCHES = [
    ("app.agents.chat_agent.retrieve_relevant_memories", []),
    ("app.agents.chat_agent.format_memories_for_prompt", ""),
    ("app.agents.chat_agent.get_conversation_insights", ""),
]


@pytest.mark.asyncio
async def test_chat_stream_endpoint_success():
    """Test that chat endpoint streams responses successfully with new AIService"""

    app.dependency_overrides[get_current_user] = _override_auth()
    mock_db = create_mock_supabase_client()
    try:
        with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
            with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_db):
                        with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_db):
                            with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                                mock_ai_service = MagicMock()
                                mock_ai_service.stream_completion = MagicMock(
                                    return_value=create_mock_ai_service_stream()
                                )
                                mock_get_ai_service.return_value = mock_ai_service

                                response = client.post(
                                    "/v1/chat/stream",
                                    json={
                                        "session_id": _SESSION_UUID,
                                        "coach_id": _COACH_UUID,
                                        "message": "Hello, can you help me?",
                                        "attachments": [],
                                    },
                                    headers={"Authorization": "Bearer test.jwt.token"},
                                )

                                assert response.status_code == 200
                                assert "text/event-stream" in response.headers["content-type"]

                                content = response.text
                                lines = [l for l in content.split("\n") if l.startswith("data:")]
                                assert len(lines) > 0

                                token_count = 0
                                done_count = 0
                                for line in lines:
                                    data = json.loads(line[6:])
                                    if data["type"] == "token":
                                        token_count += 1
                                        assert "content" in data
                                    elif data["type"] == "done":
                                        done_count += 1
                                        assert "messageId" in data

                                assert token_count > 0
                                assert done_count == 1
                                assert mock_ai_service.stream_completion.called
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_chat_stream_sse_format():
    """Test that SSE format is correct (data: {...}\\n\\n)"""

    app.dependency_overrides[get_current_user] = _override_auth()
    mock_db = create_mock_supabase_client()
    try:
        with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
            with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_db):
                        with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_db):
                            with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                                mock_ai_service = MagicMock()
                                mock_ai_service.stream_completion = MagicMock(
                                    return_value=create_mock_ai_service_stream()
                                )
                                mock_get_ai_service.return_value = mock_ai_service

                                response = client.post(
                                    "/v1/chat/stream",
                                    json={
                                        "session_id": _SESSION_UUID,
                                        "coach_id": _COACH_UUID,
                                        "message": "Test message",
                                    },
                                    headers={"Authorization": "Bearer test.jwt.token"},
                                )

                                content = response.text
                                events = content.split("data: ")
                                for event in events[1:]:
                                    assert event.endswith("\n\n") or event.endswith("\n")
                                    json_str = event.strip()
                                    data = json.loads(json_str)
                                    assert "type" in data
                                    assert data["type"] in ["token", "done", "error"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_chat_stream_error_handling():
    """Test that errors are handled gracefully and returned in SSE format"""

    app.dependency_overrides[get_current_user] = _override_auth()
    mock_db = create_mock_supabase_client()
    try:
        with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
            with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_db):
                        with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_db):
                            with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                                from app.services.ai_service import AIServiceError

                                async def error_stream():
                                    raise AIServiceError("AI service temporarily unavailable")

                                mock_ai_service = MagicMock()
                                mock_ai_service.stream_completion = MagicMock(
                                    return_value=error_stream()
                                )
                                mock_get_ai_service.return_value = mock_ai_service

                                response = client.post(
                                    "/v1/chat/stream",
                                    json={
                                        "session_id": _SESSION_UUID,
                                        "coach_id": _COACH_UUID,
                                        "message": "Test message",
                                    },
                                    headers={"Authorization": "Bearer test.jwt.token"},
                                )

                                assert response.status_code == 200

                                content = response.text
                                lines = [l for l in content.split("\n") if l.startswith("data:")]

                                error_found = False
                                for line in lines:
                                    data = json.loads(line[6:])
                                    if data["type"] == "error":
                                        error_found = True
                                        assert "message" in data

                                assert error_found, "Error event should be present in stream"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_chat_stream_requires_authentication():
    """Test that chat endpoint requires valid authentication"""
    response = client.post(
        "/v1/chat/stream",
        json={
            "session_id": _SESSION_UUID,
            "coach_id": _COACH_UUID,
            "message": "Hello",
        }
    )
    # Should return 401 or 403 without auth header
    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_chat_stream_validates_session_ownership():
    """Test that users can only access their own sessions"""

    app.dependency_overrides[get_current_user] = _override_auth(user_id="00000000-0000-0000-0000-000000000001")
    try:
        mock_client = AsyncMock()
        mock_result = MagicMock()
        mock_result.data = None  # Session not found for this user

        mock_from = MagicMock()
        mock_from.select.return_value.eq.return_value.eq.return_value.single.return_value.execute = AsyncMock(
            return_value=mock_result
        )
        mock_client.from_ = MagicMock(return_value=mock_from)

        # Patch the location used by chat.py, not the definition module.
        with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_client):
            response = client.post(
                "/v1/chat/stream",
                json={
                    "session_id": _SESSION_UUID,
                    "coach_id": _COACH_UUID,
                    "message": "Hello",
                },
                headers={"Authorization": "Bearer test.token"},
            )

            assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_chat_stream_with_multimodal_input():
    """Test that chat endpoint handles image attachments"""

    app.dependency_overrides[get_current_user] = _override_auth()
    mock_db = create_mock_supabase_client()
    try:
        with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
            with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                    with patch("app.api.v1.chat.get_async_supabase_client", return_value=mock_db):
                        with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_db):
                            with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai_service:
                                mock_ai_service = MagicMock()
                                mock_ai_service.stream_completion = MagicMock(
                                    return_value=create_mock_ai_service_stream()
                                )
                                mock_get_ai_service.return_value = mock_ai_service

                                response = client.post(
                                    "/v1/chat/stream",
                                    json={
                                        "session_id": _SESSION_UUID,
                                        "coach_id": _COACH_UUID,
                                        "message": "What do you see in this image?",
                                        "attachments": [
                                            {
                                                "type": "image",
                                                "name": "test.png",
                                                "base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                                                "mime_type": "image/png",
                                            }
                                        ],
                                    },
                                    headers={"Authorization": "Bearer test.jwt.token"},
                                )

                                assert response.status_code == 200
                                assert mock_ai_service.stream_completion.called

                                call_args = mock_ai_service.stream_completion.call_args
                                req = call_args[0][0]
                                assert hasattr(req, "messages")
                                msgs = req.messages

                                user_message = msgs[-1]
                                assert user_message["role"] == "user"
                                assert isinstance(user_message["content"], list)
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_health_endpoint():
    """Verify health endpoint is accessible"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
