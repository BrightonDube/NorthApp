"""
Unit tests for proactive_agent.py

generate_checkin_message no longer uses get_groq_client — it instantiates
AIService directly (app.agents.proactive_agent.AIService) and calls
ai.complete(request).  Tests patch that class to return a mock whose
.complete() returns a fake AIResponse with .success / .content attributes.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.agents.proactive_agent import (
    get_user_firmness_level,
    get_user_top_goal,
    get_user_context_summary,
    generate_checkin_message,
    send_reengagement_notification,
    CHECKIN_PROMPT_GENTLE,
    CHECKIN_PROMPT_BALANCED,
    CHECKIN_PROMPT_FIRM,
)


@pytest.mark.asyncio
async def test_get_user_firmness_level_success():
    """Test retrieving user's firmness level"""
    user_id = "test-user-id"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {"firmness_level": 7}
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_firmness_level(user_id)
    
    assert result == 7


@pytest.mark.asyncio
async def test_get_user_firmness_level_default():
    """Test default firmness level when not set"""
    user_id = "test-user-id"
    
    # Mock Supabase response with no firmness level
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = {}
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.single.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_firmness_level(user_id)
    
    assert result == 5  # Default balanced


@pytest.mark.asyncio
async def test_get_user_top_goal_success():
    """Test retrieving user's top active goal"""
    user_id = "test-user-id"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [{"title": "Complete my project"}]
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_top_goal(user_id)
    
    assert result == "Complete my project"


@pytest.mark.asyncio
async def test_get_user_top_goal_no_goals():
    """Test when user has no active goals"""
    user_id = "test-user-id"
    
    # Mock Supabase response with no goals
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_top_goal(user_id)
    
    assert result == "your goals"


@pytest.mark.asyncio
async def test_get_user_context_summary_success():
    """Test retrieving user context summary"""
    user_id = "test-user-id"
    
    # Mock Supabase response
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {"category": "values", "content": "Honesty and integrity"},
        {"category": "goals", "content": "Launch my startup"},
        {"category": "constraints", "content": "Limited time due to full-time job"}
    ]
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_context_summary(user_id)
    
    assert "values: Honesty and integrity" in result
    assert "goals: Launch my startup" in result
    assert "constraints: Limited time due to full-time job" in result


@pytest.mark.asyncio
async def test_get_user_context_summary_no_context():
    """Test when user has no context"""
    user_id = "test-user-id"
    
    # Mock Supabase response with no context
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = []
    
    mock_from = MagicMock()
    mock_from.select.return_value.eq.return_value.limit.return_value.execute = AsyncMock(
        return_value=mock_result
    )
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    with patch("app.agents.proactive_agent.get_async_supabase_client", return_value=mock_supabase):
        result = await get_user_context_summary(user_id)
    
    assert result == "No context available"


def _make_ai_response(content: str, success: bool = True) -> MagicMock:
    """Build a mock AIService response object."""
    r = MagicMock()
    r.success = success
    r.content = content
    r.error = None if success else content
    return r


def _make_ai_service(content: str, success: bool = True) -> MagicMock:
    """Return a mock AIService whose .complete() returns the given content."""
    svc = MagicMock()
    svc.complete = AsyncMock(return_value=_make_ai_response(content, success))
    return svc


@pytest.mark.asyncio
async def test_generate_checkin_message_gentle_tone():
    """Firmness 0-3 selects CHECKIN_PROMPT_GENTLE which contains 'gentle'/'supportive'."""
    captured_request = []

    svc = MagicMock()
    async def _complete(req):
        captured_request.append(req)
        return _make_ai_response("I'm here whenever you're ready. No pressure at all.")
    svc.complete = _complete

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=2):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value="values: Growth mindset"):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value="Learn Python"):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    result = await generate_checkin_message("test-user-id")

    assert len(result) > 0
    prompt = captured_request[0].messages[0]["content"]
    assert "gentle" in prompt.lower() or "supportive" in prompt.lower()


@pytest.mark.asyncio
async def test_generate_checkin_message_balanced_tone():
    """Firmness 4-7 selects CHECKIN_PROMPT_BALANCED which contains 'balanced'."""
    captured_request = []

    svc = MagicMock()
    async def _complete(req):
        captured_request.append(req)
        return _make_ai_response("Hey! How's that Python learning going?")
    svc.complete = _complete

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=5):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value="values: Growth mindset"):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value="Learn Python"):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    result = await generate_checkin_message("test-user-id")

    assert len(result) > 0
    prompt = captured_request[0].messages[0]["content"]
    assert "balanced" in prompt.lower()


@pytest.mark.asyncio
async def test_generate_checkin_message_firm_tone():
    """Firmness 8-10 selects CHECKIN_PROMPT_FIRM which contains 'direct'/'accountable'."""
    captured_request = []

    svc = MagicMock()
    async def _complete(req):
        captured_request.append(req)
        return _make_ai_response("You said you'd learn Python. Time to show up.")
    svc.complete = _complete

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=9):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value="values: Growth mindset"):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value="Learn Python"):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    result = await generate_checkin_message("test-user-id")

    assert len(result) > 0
    prompt = captured_request[0].messages[0]["content"]
    assert "direct" in prompt.lower() or "accountable" in prompt.lower()


@pytest.mark.asyncio
async def test_generate_checkin_message_success():
    """Full happy path: correct content returned, context/goal injected in prompt."""
    expected = "Hey! How's that Python learning going? Ready to dive back in?"
    mock_context = "values: Growth mindset; goals: Learn Python"
    mock_goal = "Learn Python"
    captured_request = []

    svc = MagicMock()
    async def _complete(req):
        captured_request.append(req)
        return _make_ai_response(expected)
    svc.complete = _complete

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=5):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value=mock_context):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value=mock_goal):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    result = await generate_checkin_message("test-user-id")

    assert result == expected

    req = captured_request[0]
    assert req.temperature == 0.7
    assert req.max_tokens == 100
    prompt = req.messages[0]["content"]
    assert mock_context in prompt
    assert mock_goal in prompt


@pytest.mark.asyncio
async def test_generate_checkin_message_strips_whitespace():
    """Response content is stripped before returning."""
    svc = MagicMock()
    svc.complete = AsyncMock(return_value=_make_ai_response("  \n  Test message  \n  "))

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=5):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value="context"):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value="goal"):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    result = await generate_checkin_message("test-user-id")

    assert result == "Test message"


@pytest.mark.asyncio
async def test_send_reengagement_notification_success():
    """Test sending re-engagement notification"""
    user_id = "test-user-id"
    
    # Mock message generation
    mock_message = "Your coach is thinking of you! Ready to continue?"
    
    # Mock notification service
    mock_notification_result = True
    
    with patch("app.agents.proactive_agent.generate_checkin_message", return_value=mock_message):
        with patch("app.agents.proactive_agent.send_push_notification", return_value=mock_notification_result) as mock_send:
            result = await send_reengagement_notification(user_id)
    
    assert result is True
    
    # Verify notification was sent with correct parameters
    mock_send.assert_called_once_with(
        user_id=user_id,
        title="Your coach is thinking of you",
        body=mock_message,
        data={"action": "open_chat"}
    )


@pytest.mark.asyncio
async def test_send_reengagement_notification_failure():
    """Test handling of notification send failure"""
    user_id = "test-user-id"
    
    # Mock message generation
    mock_message = "Test message"
    
    # Mock notification service failure
    mock_notification_result = False
    
    with patch("app.agents.proactive_agent.generate_checkin_message", return_value=mock_message):
        with patch("app.agents.proactive_agent.send_push_notification", return_value=mock_notification_result):
            result = await send_reengagement_notification(user_id)
    
    assert result is False


@pytest.mark.asyncio
async def test_checkin_prompt_format():
    """Test that all CHECKIN_PROMPT variants have correct placeholders"""
    # Verify all prompts contain required placeholders
    for prompt_name, prompt in [
        ("GENTLE", CHECKIN_PROMPT_GENTLE),
        ("BALANCED", CHECKIN_PROMPT_BALANCED),
        ("FIRM", CHECKIN_PROMPT_FIRM),
    ]:
        assert "{context}" in prompt, f"{prompt_name} missing context placeholder"
        assert "{goal}" in prompt, f"{prompt_name} missing goal placeholder"
        
        # Verify prompt mentions key requirements
        assert "SHORT" in prompt or "short" in prompt, f"{prompt_name} missing SHORT requirement"
        assert "2 sentences" in prompt or "two sentences" in prompt, f"{prompt_name} missing sentence limit"


@pytest.mark.asyncio
async def test_generate_checkin_message_uses_fast_model():
    """AIRequest must be built with MODEL_FAST for check-in efficiency."""
    from app.services.groq_client import MODEL_FAST

    captured_request = []

    svc = MagicMock()
    async def _complete(req):
        captured_request.append(req)
        return _make_ai_response("Test")
    svc.complete = _complete

    with patch("app.agents.proactive_agent.get_user_firmness_level", return_value=5):
        with patch("app.agents.proactive_agent.get_user_context_summary", return_value="context"):
            with patch("app.agents.proactive_agent.get_user_top_goal", return_value="goal"):
                with patch("app.agents.proactive_agent.AIService", return_value=svc):
                    await generate_checkin_message("test-user-id")

    assert captured_request[0].model == MODEL_FAST


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
