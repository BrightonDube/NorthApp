"""
Unit tests for panic_agent.py

The agent no longer uses get_groq_client directly — it instantiates AIService
inline and calls ai.stream_completion(request).  We patch
`app.agents.panic_agent.AIService` to inject a mock whose stream_completion is
an async generator yielding text chunks.
"""
import json
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from app.agents.panic_agent import stream_panic_response, PANIC_SYSTEM_PROMPT
from app.services.groq_client import MODEL_COMPLEX


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ai_service_stream(chunks: list[str]):
    """
    Return a mock AIService where stream_completion() is an async generator
    that yields each string in *chunks*.
    """
    async def _gen(*_args, **_kwargs):
        for c in chunks:
            yield c

    svc = MagicMock()
    svc.stream_completion = _gen
    return svc


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_stream_panic_response_default_message():
    """Default message triggers a panic-button phrase in the user turn."""
    response_chunks = ["I'm here. ", "Take a breath. ", "You're not alone ", "in this moment."]

    with patch("app.agents.panic_agent.AIService", return_value=_make_ai_service_stream(response_chunks)):
        collected = []
        async for chunk in stream_panic_response("user-1"):
            collected.append(chunk)

    token_chunks = [c for c in collected if '"type": "token"' in c]
    assert len(token_chunks) == len(response_chunks)

    done_chunk = collected[-1]
    assert '"type": "done"' in done_chunk
    assert '"panic": true' in done_chunk


@pytest.mark.asyncio
async def test_stream_panic_response_custom_message():
    """Custom initial_message is passed through to the AI request."""
    custom_message = "I'm feeling overwhelmed and can't handle this anymore"
    captured_request = []

    async def _capturing_gen(request, *_a, **_kw):
        captured_request.append(request)
        yield "I hear you."

    svc = MagicMock()
    svc.stream_completion = _capturing_gen

    with patch("app.agents.panic_agent.AIService", return_value=svc):
        async for _ in stream_panic_response("user-1", custom_message):
            pass

    assert len(captured_request) == 1
    req = captured_request[0]
    user_msg = next(m for m in req.messages if m["role"] == "user")
    assert user_msg["content"] == custom_message


@pytest.mark.asyncio
async def test_stream_panic_response_model_parameters():
    """AIRequest is built with temperature=0.35, max_tokens=512, MODEL_COMPLEX."""
    captured_request = []

    async def _capturing_gen(request, *_a, **_kw):
        captured_request.append(request)
        yield "ok"

    svc = MagicMock()
    svc.stream_completion = _capturing_gen

    with patch("app.agents.panic_agent.AIService", return_value=svc):
        async for _ in stream_panic_response("user-1"):
            pass

    req = captured_request[0]
    assert req.temperature == 0.35
    assert req.max_tokens == 512
    assert req.model == MODEL_COMPLEX


@pytest.mark.asyncio
async def test_stream_panic_response_json_format():
    """Every yielded SSE chunk must be valid JSON with a 'type' field."""
    with patch("app.agents.panic_agent.AIService", return_value=_make_ai_service_stream(["Hello", " world"])):
        chunks = []
        async for chunk in stream_panic_response("user-1"):
            chunks.append(chunk)

    for chunk in chunks:
        assert chunk.startswith("data: ")
        assert chunk.endswith("\n\n")
        data = json.loads(chunk[6:-2])
        assert "type" in data
        assert data["type"] in ["token", "done", "error"]


@pytest.mark.asyncio
async def test_stream_panic_response_empty_chunks():
    """All chunks (including empty strings) yielded by stream_completion are forwarded."""
    all_tokens = ["", "Hello", "", " world", ""]

    async def _gen_with_empties(request, *_a, **_kw):
        for tok in all_tokens:
            yield tok

    svc = MagicMock()
    svc.stream_completion = _gen_with_empties

    with patch("app.agents.panic_agent.AIService", return_value=svc):
        chunks = []
        async for chunk in stream_panic_response("user-1"):
            chunks.append(chunk)

    token_chunks = [c for c in chunks if '"type": "token"' in c]
    # panic_agent forwards every chunk from stream_completion; no empty-string filter
    assert len(token_chunks) == len(all_tokens)


@pytest.mark.asyncio
async def test_stream_panic_response_system_prompt_content():
    """PANIC_SYSTEM_PROMPT contains required crisis-support keywords."""
    prompt = PANIC_SYSTEM_PROMPT.lower()
    assert "crisis" in prompt
    assert "breath" in prompt
    assert "not alone" in prompt
    assert "self-harm" in prompt or "suicide" in prompt
    assert "741741" in PANIC_SYSTEM_PROMPT or "crisis" in prompt


@pytest.mark.asyncio
async def test_stream_panic_response_system_prompt_in_request():
    """PANIC_SYSTEM_PROMPT is sent as the system message in the AI request."""
    captured_request = []

    async def _capturing_gen(request, *_a, **_kw):
        captured_request.append(request)
        yield "ok"

    svc = MagicMock()
    svc.stream_completion = _capturing_gen

    with patch("app.agents.panic_agent.AIService", return_value=svc):
        async for _ in stream_panic_response("user-1"):
            pass

    req = captured_request[0]
    sys_msg = next(m for m in req.messages if m["role"] == "system")
    assert sys_msg["content"] == PANIC_SYSTEM_PROMPT


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
