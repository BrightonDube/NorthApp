"""
Unit tests for panic_agent.py
Tests crisis support response functionality
"""
import pytest
import json
from unittest.mock import MagicMock, patch
from app.agents.panic_agent import stream_panic_response, PANIC_SYSTEM_PROMPT


def create_mock_groq_stream(chunks: list[str]):
    """Create a mock Groq streaming response"""
    class MockChoice:
        def __init__(self, content):
            self.delta = MagicMock()
            self.delta.content = content
    
    class MockChunk:
        def __init__(self, content):
            self.choices = [MockChoice(content)]
    
    class MockStream:
        def __init__(self, chunks):
            self.chunks = chunks
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
    
    return MockStream(chunks)


@pytest.mark.asyncio
async def test_stream_panic_response_default_message():
    """Test panic response with default message"""
    user_id = "test-user-id"
    
    response_chunks = [
        "I'm here. ",
        "Take a breath. ",
        "You're not alone ",
        "in this moment."
    ]
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = create_mock_groq_stream(response_chunks)
        mock_get_groq.return_value = mock_groq
        
        chunks = []
        async for chunk in stream_panic_response(user_id):
            chunks.append(chunk)
        
        # Verify we got streaming chunks
        assert len(chunks) > 0
        
        # Verify format of token chunks
        token_chunks = [c for c in chunks if '"type": "token"' in c]
        assert len(token_chunks) == len(response_chunks)
        
        # Verify done message
        done_chunk = chunks[-1]
        assert '"type": "done"' in done_chunk
        assert '"panic": true' in done_chunk
        
        # Verify Groq was called with correct system prompt
        call_args = mock_groq.chat.completions.stream.call_args
        messages = call_args[1]["messages"]
        assert messages[0]["role"] == "system"
        assert messages[0]["content"] == PANIC_SYSTEM_PROMPT
        assert messages[1]["role"] == "user"
        assert "panic button" in messages[1]["content"].lower()


@pytest.mark.asyncio
async def test_stream_panic_response_custom_message():
    """Test panic response with custom user message"""
    user_id = "test-user-id"
    custom_message = "I'm feeling overwhelmed and can't handle this anymore"
    
    response_chunks = ["I hear you. ", "Let's take this one step at a time."]
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = create_mock_groq_stream(response_chunks)
        mock_get_groq.return_value = mock_groq
        
        chunks = []
        async for chunk in stream_panic_response(user_id, custom_message):
            chunks.append(chunk)
        
        # Verify custom message was used
        call_args = mock_groq.chat.completions.stream.call_args
        messages = call_args[1]["messages"]
        assert messages[1]["content"] == custom_message


@pytest.mark.asyncio
async def test_stream_panic_response_model_parameters():
    """Test that panic response uses correct model parameters"""
    user_id = "test-user-id"
    
    response_chunks = ["Test response"]
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = create_mock_groq_stream(response_chunks)
        mock_get_groq.return_value = mock_groq
        
        async for _ in stream_panic_response(user_id):
            pass
        
        # Verify model parameters
        call_args = mock_groq.chat.completions.stream.call_args
        assert call_args[1]["temperature"] == 0.35
        assert call_args[1]["max_tokens"] == 512
        # Verify using complex model for crisis situations
        from app.services.groq_client import MODEL_COMPLEX
        assert call_args[1]["model"] == MODEL_COMPLEX


@pytest.mark.asyncio
async def test_stream_panic_response_json_format():
    """Test that streaming chunks are properly formatted as JSON"""
    user_id = "test-user-id"
    
    response_chunks = ["Hello", " world"]
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = create_mock_groq_stream(response_chunks)
        mock_get_groq.return_value = mock_groq
        
        chunks = []
        async for chunk in stream_panic_response(user_id):
            chunks.append(chunk)
        
        # Verify each chunk is valid SSE format
        for chunk in chunks:
            assert chunk.startswith("data: ")
            assert chunk.endswith("\n\n")
            
            # Extract JSON and verify it's valid
            json_str = chunk[6:-2]  # Remove "data: " and "\n\n"
            data = json.loads(json_str)
            assert "type" in data
            assert data["type"] in ["token", "done"]


@pytest.mark.asyncio
async def test_stream_panic_response_empty_chunks():
    """Test handling of empty chunks from LLM"""
    user_id = "test-user-id"
    
    # Mix of empty and non-empty chunks
    class MockChoice:
        def __init__(self, content):
            self.delta = MagicMock()
            self.delta.content = content
    
    class MockChunk:
        def __init__(self, content):
            self.choices = [MockChoice(content)] if content else []
    
    class MockStream:
        async def __aenter__(self):
            return self
        
        async def __aexit__(self, *args):
            pass
        
        def __aiter__(self):
            return self
        
        async def __anext__(self):
            if not hasattr(self, 'index'):
                self.index = 0
            
            chunks = [None, "Hello", None, " world", None]
            if self.index >= len(chunks):
                raise StopAsyncIteration
            
            chunk = MockChunk(chunks[self.index])
            self.index += 1
            return chunk
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = MockStream()
        mock_get_groq.return_value = mock_groq
        
        chunks = []
        async for chunk in stream_panic_response(user_id):
            chunks.append(chunk)
        
        # Should only yield non-empty chunks plus done message
        token_chunks = [c for c in chunks if '"type": "token"' in c]
        assert len(token_chunks) == 2  # Only "Hello" and " world"


@pytest.mark.asyncio
async def test_stream_panic_response_system_prompt_content():
    """Test that system prompt contains crisis support guidelines"""
    user_id = "test-user-id"
    
    response_chunks = ["Test"]
    
    with patch("app.agents.panic_agent.get_groq_client") as mock_get_groq:
        mock_groq = MagicMock()
        mock_groq.chat.completions.stream.return_value = create_mock_groq_stream(response_chunks)
        mock_get_groq.return_value = mock_groq
        
        async for _ in stream_panic_response(user_id):
            pass
        
        # Verify system prompt contains key crisis support elements
        call_args = mock_groq.chat.completions.stream.call_args
        system_prompt = call_args[1]["messages"][0]["content"]
        
        # Check for key crisis support elements
        assert "crisis" in system_prompt.lower()
        assert "breath" in system_prompt.lower()
        assert "not alone" in system_prompt.lower()
        assert "self-harm" in system_prompt.lower() or "suicide" in system_prompt.lower()
        # Should include crisis resources
        assert "741741" in system_prompt or "crisis" in system_prompt.lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
