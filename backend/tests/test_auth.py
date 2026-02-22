from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _mock_supabase_401():
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"message": "Invalid JWT"}
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


def test_chat_stream_requires_auth():
    response = client.post("/v1/chat/stream", json={
        "session_id": "test",
        "coach_id": "test",
        "message": "hello",
    })
    assert response.status_code == 401


def test_memories_requires_auth():
    response = client.get("/v1/memories")
    assert response.status_code == 401


def test_goals_requires_auth():
    response = client.get("/v1/goals")
    assert response.status_code == 401


def test_invalid_token_rejected():
    with patch("httpx.AsyncClient", return_value=_mock_supabase_401()):
        response = client.get("/v1/goals", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


def test_settings_requires_auth():
    response = client.get("/v1/settings")
    assert response.status_code == 401
