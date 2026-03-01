"""
Unit tests for memory_agent.py

All tests patch `app.agents.memory_agent._get_ai_service` (the factory used by
extract_and_store_facts / extract_conversation_insights) and mock the AIService
response object which has .success (bool) and .content (str) attributes.
The old get_groq_client approach is no longer used — agents were migrated to AIService.
"""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.memory_agent import (
    extract_and_store_facts,
    extract_conversation_insights,
    FACT_EXTRACTION_PROMPT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_ai_response(content: str, success: bool = True) -> MagicMock:
    """Build a mock AIService response object."""
    r = MagicMock()
    r.success = success
    r.content = content
    r.error = None if success else content
    return r


def _make_ai_service(response: MagicMock) -> MagicMock:
    """Build a mock AIService whose .complete() returns the given response."""
    svc = MagicMock()
    svc.complete = AsyncMock(return_value=response)
    return svc


def _make_supabase_with_insert() -> AsyncMock:
    """Return a Supabase mock where from_().insert().execute() succeeds."""
    mock_supabase = AsyncMock()
    mock_execute = AsyncMock(return_value=MagicMock(data=[{"id": "row-1"}]))
    mock_insert = MagicMock()
    mock_insert.execute = mock_execute
    mock_from = MagicMock()
    mock_from.insert = MagicMock(return_value=mock_insert)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    return mock_supabase


def _make_supabase_messages(messages: list) -> AsyncMock:
    """Return a Supabase mock for the messages query used by extract_conversation_insights."""
    mock_supabase = AsyncMock()

    mock_result = MagicMock()
    mock_result.data = messages

    # Chain: .from_().select().eq().order().execute()
    mock_order = MagicMock()
    mock_order.execute = AsyncMock(return_value=mock_result)
    mock_eq = MagicMock()
    mock_eq.order = MagicMock(return_value=mock_order)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)

    # insights insert chain
    mock_ins_exec = AsyncMock(return_value=MagicMock(data=[{"id": "ins-1"}]))
    mock_ins = MagicMock()
    mock_ins.execute = mock_ins_exec
    mock_from.insert = MagicMock(return_value=mock_ins)

    mock_supabase.from_ = MagicMock(return_value=mock_from)
    return mock_supabase


# ---------------------------------------------------------------------------
# extract_and_store_facts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_extract_and_store_facts_success():
    """Successful fact extraction stores two facts and returns 2."""
    message = "I love working in the morning and I value honesty in relationships"
    user_id = "test-user-id"

    ai_response = _make_ai_response(json.dumps({
        "facts": [
            {"content": "The user prefers working in the morning", "category": "preference", "importance": "medium"},
            {"content": "The user values honesty in relationships", "category": "value", "importance": "high"},
        ]
    }))

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=_make_supabase_with_insert()):
            with patch("app.agents.memory_agent.create_embedding", return_value=[0.1] * 1536):
                result = await extract_and_store_facts(message, user_id)

    assert result == 2


@pytest.mark.asyncio
async def test_extract_and_store_facts_no_facts():
    """When LLM returns empty facts list, result is 0."""
    ai_response = _make_ai_response('{"facts": []}')

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        result = await extract_and_store_facts("Hello", "test-user-id")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_ai_failure():
    """When AIService returns success=False, result is 0."""
    ai_response = _make_ai_response("quota exceeded", success=False)

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        result = await extract_and_store_facts("Test message", "test-user-id")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_ai_exception():
    """When AIService.complete raises, result is 0."""
    svc = MagicMock()
    svc.complete = AsyncMock(side_effect=Exception("network error"))

    with patch("app.agents.memory_agent._get_ai_service", return_value=svc):
        result = await extract_and_store_facts("Test message", "test-user-id")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_invalid_json():
    """When LLM content is not valid JSON, result is 0."""
    ai_response = _make_ai_response("not json at all")

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        result = await extract_and_store_facts("Test message", "test-user-id")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_with_source_message():
    """source_message_id is included in the DB insert payload."""
    source_message_id = "msg-123"
    ai_response = _make_ai_response(json.dumps({
        "facts": [
            {"content": "The user achieved their goal", "category": "achievement", "importance": "high"}
        ]
    }))
    mock_supabase = _make_supabase_with_insert()

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            with patch("app.agents.memory_agent.create_embedding", return_value=[0.1] * 1536):
                result = await extract_and_store_facts("I achieved my goal today", "test-user-id", source_message_id)

    assert result == 1
    insert_call = mock_supabase.from_.return_value.insert.call_args
    assert insert_call[0][0]["source_message_id"] == source_message_id


@pytest.mark.asyncio
async def test_extract_and_store_facts_empty_content():
    """Facts with empty content string are skipped."""
    ai_response = _make_ai_response(json.dumps({
        "facts": [{"content": "", "category": "fact", "importance": "low"}]
    }))

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=AsyncMock()):
            result = await extract_and_store_facts("Test message", "test-user-id")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_and_store_facts_storage_error():
    """DB insert failure causes that fact to be skipped; overall result is 0."""
    ai_response = _make_ai_response(json.dumps({
        "facts": [{"content": "The user loves coding", "category": "preference", "importance": "medium"}]
    }))
    mock_supabase = AsyncMock()
    mock_supabase.from_.return_value.insert.return_value.execute = AsyncMock(
        side_effect=Exception("Database error")
    )

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            with patch("app.agents.memory_agent.create_embedding", return_value=[0.1] * 1536):
                result = await extract_and_store_facts("I love coding", "test-user-id")

    assert result == 0


# ---------------------------------------------------------------------------
# extract_conversation_insights
# ---------------------------------------------------------------------------

_ENOUGH_MESSAGES = [
    {"role": "user", "content": "Message 1"},
    {"role": "assistant", "content": "Response 1"},
    {"role": "user", "content": "Message 2"},
    {"role": "assistant", "content": "Response 2"},
    {"role": "user", "content": "Message 3"},
    {"role": "assistant", "content": "Response 3"},
]


@pytest.mark.asyncio
async def test_extract_conversation_insights_success():
    """Two high-confidence insights are stored and count returned."""
    ai_response = _make_ai_response(json.dumps({
        "insights": [
            {"content": "User avoids tasks due to fear of failure", "confidence": 0.95},
            {"content": "User understands perfectionism link", "confidence": 0.85},
        ]
    }))
    mock_supabase = _make_supabase_messages(_ENOUGH_MESSAGES)

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            result = await extract_conversation_insights("s-1", "u-1", "c-1")

    assert result == 2


@pytest.mark.asyncio
async def test_extract_conversation_insights_too_few_messages():
    """Conversations with fewer than 5 messages return 0 without calling the LLM."""
    few_messages = [
        {"role": "user", "content": "Hello"},
        {"role": "assistant", "content": "Hi"},
        {"role": "user", "content": "Bye"},
    ]
    mock_supabase = _make_supabase_messages(few_messages)

    with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await extract_conversation_insights("s-1", "u-1", "c-1")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_conversation_insights_no_messages():
    """Sessions with no messages return 0."""
    mock_supabase = _make_supabase_messages([])

    with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await extract_conversation_insights("s-1", "u-1", "c-1")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_conversation_insights_low_confidence():
    """Insights with confidence < 0.7 are filtered out; result is 0."""
    ai_response = _make_ai_response(json.dumps({
        "insights": [{"content": "User might be interested in something", "confidence": 0.5}]
    }))
    mock_supabase = _make_supabase_messages(_ENOUGH_MESSAGES)

    with patch("app.agents.memory_agent._get_ai_service", return_value=_make_ai_service(ai_response)):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            result = await extract_conversation_insights("s-1", "u-1", "c-1")

    assert result == 0


@pytest.mark.asyncio
async def test_extract_conversation_insights_ai_error():
    """When AIService.complete raises, result is 0."""
    svc = MagicMock()
    svc.complete = AsyncMock(side_effect=Exception("API Error"))
    mock_supabase = _make_supabase_messages(_ENOUGH_MESSAGES)

    with patch("app.agents.memory_agent._get_ai_service", return_value=svc):
        with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase):
            result = await extract_conversation_insights("s-1", "u-1", "c-1")

    assert result == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
