"""
Unit tests for Claude 3.5 Sonnet integration.
Tests Task 2.2: Add Claude 3.5 Sonnet Integration
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.claude import get_claude_client, stream_claude_response, MODEL_CLAUDE_SONNET
from app.agents.chat_agent import select_model, get_runtime_fallback_models, calculate_cost_usd


def test_claude_model_constant():
    """Test that Claude model constant is defined correctly"""
    assert MODEL_CLAUDE_SONNET == "claude-3-5-sonnet-20241022"


def test_select_model_returns_claude_for_strategic_coach():
    """Test that strategic coach with long messages uses Claude"""
    model = select_model(
        coach_type="strategic",
        message_length=1500,
        has_images=False,
        conversation_depth=5,
    )
    assert model == MODEL_CLAUDE_SONNET


def test_select_model_returns_claude_for_deep_conversation():
    """Test that deep conversations use Claude"""
    model = select_model(
        coach_type="systems",
        message_length=800,
        has_images=False,
        conversation_depth=15,
    )
    assert model == MODEL_CLAUDE_SONNET


def test_select_model_returns_groq_for_simple_messages():
    """Test that simple messages don't use Claude"""
    model = select_model(
        coach_type="general",
        message_length=100,
        has_images=False,
        conversation_depth=2,
    )
    assert model != MODEL_CLAUDE_SONNET


def test_fallback_models_include_groq_after_claude():
    """Test that Claude failures fall back to Groq models"""
    fallbacks = get_runtime_fallback_models(MODEL_CLAUDE_SONNET)
    
    # First should be Claude
    assert fallbacks[0] == MODEL_CLAUDE_SONNET
    
    # Should have Groq models as fallbacks
    assert len(fallbacks) > 1
    assert any("llama" in model.lower() for model in fallbacks[1:])


def test_calculate_cost_includes_claude_pricing():
    """Test that cost calculation includes Claude pricing"""
    # Claude pricing: $3/1M input, $15/1M output
    cost = calculate_cost_usd(MODEL_CLAUDE_SONNET, 1_000_000, 1_000_000)
    
    # Should be $3 + $15 = $18
    assert cost == 18.0


def test_calculate_cost_claude_small_usage():
    """Test cost calculation for small Claude usage"""
    # 10k input tokens, 5k output tokens
    cost = calculate_cost_usd(MODEL_CLAUDE_SONNET, 10_000, 5_000)
    
    # Should be (10k/1M * $3) + (5k/1M * $15) = $0.03 + $0.075 = $0.105
    assert cost == 0.105


@pytest.mark.asyncio
async def test_get_claude_client_requires_api_key():
    """Test that Claude client requires API key"""
    with patch("app.services.claude.get_settings") as mock_settings:
        mock_settings.return_value.anthropic_api_key = ""
        
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY not configured"):
            get_claude_client()


@pytest.mark.asyncio
async def test_stream_claude_response_extracts_system_message():
    """Test that streaming extracts system message correctly"""
    messages = [
        {"role": "system", "content": "You are a helpful coach"},
        {"role": "user", "content": "Hello"},
    ]
    
    with patch("app.services.claude.get_claude_client") as mock_get_client:
        mock_client = MagicMock()
        mock_stream = AsyncMock()
        
        # Mock the stream context manager
        mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
        mock_stream.__aexit__ = AsyncMock()
        mock_stream.text_stream = AsyncMock()
        mock_stream.text_stream.__aiter__ = AsyncMock(return_value=iter(["Hello", " there"]))
        
        mock_client.messages.stream.return_value = mock_stream
        mock_get_client.return_value = mock_client
        
        chunks = []
        async for chunk in stream_claude_response(messages):
            chunks.append(chunk)
        
        # Verify system message was extracted
        call_args = mock_client.messages.stream.call_args
        assert "system" in call_args[1]
        assert call_args[1]["system"] == "You are a helpful coach"
        
        # Verify messages don't include system message
        assert len(call_args[1]["messages"]) == 1
        assert call_args[1]["messages"][0]["role"] == "user"


@pytest.mark.asyncio
async def test_stream_claude_response_uses_correct_model():
    """Test that streaming uses Claude 3.5 Sonnet model"""
    messages = [
        {"role": "user", "content": "Hello"},
    ]
    
    with patch("app.services.claude.get_claude_client") as mock_get_client:
        mock_client = MagicMock()
        mock_stream = AsyncMock()
        
        mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
        mock_stream.__aexit__ = AsyncMock()
        mock_stream.text_stream = AsyncMock()
        mock_stream.text_stream.__aiter__ = AsyncMock(return_value=iter(["Response"]))
        
        mock_client.messages.stream.return_value = mock_stream
        mock_get_client.return_value = mock_client
        
        async for _ in stream_claude_response(messages):
            pass
        
        # Verify correct model was used
        call_args = mock_client.messages.stream.call_args
        assert call_args[1]["model"] == MODEL_CLAUDE_SONNET


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
