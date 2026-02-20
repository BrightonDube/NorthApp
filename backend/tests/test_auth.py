from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


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
    response = client.get("/v1/goals", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


def test_settings_requires_auth():
    response = client.get("/v1/settings")
    assert response.status_code == 401
