"""
Test Gemini 1.5 Flash integration.
"""
import pytest
from app.services.gemini import (
    MODEL_GEMINI_FLASH,
    convert_messages_to_gemini_format,
    stream_gemini_response,
)


def test_convert_messages_basic():
    """Test basic message conversion to Gemini format."""
    messages = [
        {"role": "system", "content": "You are a helpful coach."},
        {"role": "user", "content": "Hello!"},
        {"role": "assistant", "content": "Hi there!"},
        {"role": "user", "content": "How are you?"},
    ]
    
    system_instruction, conversation = convert_messages_to_gemini_format(messages)
    
    assert system_instruction == "You are a helpful coach."
    assert len(conversation) == 3
    assert conversation[0]["role"] == "user"
    assert conversation[0]["parts"][0]["text"] == "Hello!"
    assert conversation[1]["role"] == "model"
    assert conversation[1]["parts"][0]["text"] == "Hi there!"
    assert conversation[2]["role"] == "user"
    assert conversation[2]["parts"][0]["text"] == "How are you?"


def test_convert_messages_multimodal():
    """Test multimodal message conversion with images."""
    messages = [
        {"role": "system", "content": "You are a helpful coach."},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg=="
                    }
                }
            ]
        },
    ]
    
    system_instruction, conversation = convert_messages_to_gemini_format(messages)
    
    assert system_instruction == "You are a helpful coach."
    assert len(conversation) == 1
    assert conversation[0]["role"] == "user"
    assert len(conversation[0]["parts"]) == 2
    assert conversation[0]["parts"][0]["text"] == "What's in this image?"
    assert "inline_data" in conversation[0]["parts"][1]
    assert conversation[0]["parts"][1]["inline_data"]["mime_type"] == "image/jpeg"
    assert conversation[0]["parts"][1]["inline_data"]["data"] == "/9j/4AAQSkZJRg=="


def test_convert_messages_no_system():
    """Test message conversion without system message."""
    messages = [
        {"role": "user", "content": "Hello!"},
        {"role": "assistant", "content": "Hi!"},
    ]
    
    system_instruction, conversation = convert_messages_to_gemini_format(messages)
    
    assert system_instruction is None
    assert len(conversation) == 2


@pytest.mark.asyncio
async def test_stream_gemini_response():
    """Test streaming response from Gemini (requires API key)."""
    # Skip if no API key configured
    from app.config import get_settings
    settings = get_settings()
    if not settings.gemini_api_key:
        pytest.skip("GEMINI_API_KEY not configured")
    
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Be concise."},
        {"role": "user", "content": "Say 'Hello, World!' and nothing else."},
    ]
    
    chunks = []
    async for chunk in stream_gemini_response(messages, temperature=0.1, max_tokens=50):
        chunks.append(chunk)
    
    full_response = "".join(chunks)
    
    # Verify we got a response
    assert len(chunks) > 0
    assert len(full_response) > 0
    assert "hello" in full_response.lower() or "world" in full_response.lower()


@pytest.mark.asyncio
async def test_gemini_model_constant():
    """Test that Gemini model constant is correct."""
    assert MODEL_GEMINI_FLASH == "gemini-2.5-flash"
