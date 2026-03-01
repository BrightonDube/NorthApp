"""
Unit tests for AIService
"""

import pytest
from unittest.mock import MagicMock, patch
from app.services.ai_service import (
    AIService,
    AIRequest,
    AIServiceError,
    MODEL_PRIMARY,
)


@pytest.fixture
def ai_service():
    """Create AIService instance for testing"""
    return AIService(api_key="test-api-key")


@pytest.fixture
def sample_request():
    """Create sample AI request"""
    return AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        temperature=0.7,
        max_tokens=100,
        stream=True,
    )


class MockStreamChunk:
    """Mock streaming chunk from Groq"""
    def __init__(self, content: str):
        self.choices = [MagicMock()]
        self.choices[0].delta.content = content


@pytest.mark.asyncio
async def test_stream_completion_success(ai_service, sample_request):
    """Test successful streaming completion"""
    # Mock the Groq client
    mock_chunks = [
        MockStreamChunk("Hello"),
        MockStreamChunk(" "),
        MockStreamChunk("world"),
        MockStreamChunk("!"),
    ]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        # Collect streamed chunks
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Verify all chunks received
        assert chunks == ["Hello", " ", "world", "!"]
        assert "".join(chunks) == "Hello world!"


@pytest.mark.asyncio
async def test_stream_completion_retry_on_failure(ai_service, sample_request):
    """Test retry logic with exponential backoff"""
    call_count = 0
    
    async def mock_create_with_failure(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        
        if call_count < 3:
            # Fail first 2 attempts
            raise Exception("Temporary error")
        else:
            # Succeed on 3rd attempt
            async def success_stream():
                yield MockStreamChunk("Success")
            return success_stream()
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_with_failure
    ):
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Verify retry happened and succeeded
        assert call_count == 3
        assert chunks == ["Success"]


@pytest.mark.asyncio
async def test_stream_completion_max_retries_exceeded(ai_service, sample_request):
    """Test that AIServiceError is raised after max retries"""
    
    async def mock_create_always_fails(*args, **kwargs):
        raise Exception("Persistent error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_always_fails
    ):
        with pytest.raises(AIServiceError) as exc_info:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify error message contains retry count
        assert "3 connection attempts" in str(exc_info.value)


@pytest.mark.asyncio
async def test_stream_completion_empty_chunks_filtered(ai_service, sample_request):
    """Test that empty/None chunks are filtered out"""
    mock_chunks = [
        MockStreamChunk("Hello"),
        MockStreamChunk(None),  # Should be filtered
        MockStreamChunk(""),    # Should be filtered
        MockStreamChunk("world"),
    ]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Verify only non-empty chunks received
        assert chunks == ["Hello", "world"]


@pytest.mark.asyncio
async def test_stream_completion_logs_success(ai_service, sample_request):
    """Test that successful completion is logged"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify metrics were recorded
        assert len(ai_service._metrics) == 1
        assert ai_service._metrics[0]["success"] is True
        assert ai_service._metrics[0]["model"] == MODEL_PRIMARY


@pytest.mark.asyncio
async def test_stream_completion_logs_failure(ai_service, sample_request):
    """Test that failed completion is logged"""
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify failure was logged
        assert len(ai_service._metrics) == 1
        assert ai_service._metrics[0]["success"] is False
        assert "error" in ai_service._metrics[0]


# Tests for complete() method (non-streaming)

class MockCompletionResponse:
    """Mock non-streaming response from Groq"""
    def __init__(self, content: str, tokens: int = 50):
        self.choices = [MagicMock()]
        self.choices[0].message.content = content
        self.usage = MagicMock()
        self.usage.total_tokens = tokens


@pytest.mark.asyncio
async def test_complete_success(ai_service):
    """Test successful non-streaming completion"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    mock_response = MockCompletionResponse("Hello world!", tokens=10)
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ):
        response = await ai_service.complete(request)
        
        # Verify response structure
        assert response.success is True
        assert response.content == "Hello world!"
        assert response.model == MODEL_PRIMARY
        assert response.tokens_used == 10
        assert response.duration_ms >= 0  # Duration can be 0 for mocked calls
        assert response.error is None


@pytest.mark.asyncio
async def test_complete_retry_on_failure(ai_service):
    """Test retry logic for non-streaming completion"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    call_count = 0
    
    async def mock_create_with_failure(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        
        if call_count < 3:
            # Fail first 2 attempts
            raise Exception("Temporary error")
        else:
            # Succeed on 3rd attempt
            return MockCompletionResponse("Success after retry")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_with_failure
    ):
        response = await ai_service.complete(request)
        
        # Verify retry happened and succeeded
        assert call_count == 3
        assert response.success is True
        assert response.content == "Success after retry"


@pytest.mark.asyncio
async def test_complete_max_retries_exceeded(ai_service):
    """Test that complete() returns error response after max retries"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    async def mock_create_always_fails(*args, **kwargs):
        raise Exception("Persistent error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_always_fails
    ):
        response = await ai_service.complete(request)
        
        # Verify error response
        assert response.success is False
        assert response.content == ""
        assert response.tokens_used == 0
        assert response.error is not None
        assert "Persistent error" in response.error


@pytest.mark.asyncio
async def test_complete_logs_success(ai_service):
    """Test that successful completion is logged"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    mock_response = MockCompletionResponse("Test response")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ):
        await ai_service.complete(request)
        
        # Verify metrics were recorded
        assert len(ai_service._metrics) == 1
        assert ai_service._metrics[0]["success"] is True
        assert ai_service._metrics[0]["model"] == MODEL_PRIMARY


@pytest.mark.asyncio
async def test_complete_logs_failure(ai_service):
    """Test that failed completion is logged"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        await ai_service.complete(request)
        
        # Verify failure was logged
        assert len(ai_service._metrics) == 1
        assert ai_service._metrics[0]["success"] is False
        assert "error" in ai_service._metrics[0]


@pytest.mark.asyncio
async def test_complete_with_custom_parameters(ai_service):
    """Test complete() with custom temperature and max_tokens"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        temperature=0.9,
        max_tokens=500,
        stream=False,
    )
    
    mock_response = MockCompletionResponse("Custom response", tokens=250)
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ) as mock_create:
        response = await ai_service.complete(request)
        
        # Verify custom parameters were passed
        mock_create.assert_called_once()
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["temperature"] == 0.9
        assert call_kwargs["max_tokens"] == 500
        assert call_kwargs["stream"] is False
        
        # Verify response
        assert response.success is True
        assert response.tokens_used == 250


@pytest.mark.asyncio
async def test_complete_timeout_handling(ai_service):
    """Test that complete() respects timeout setting"""
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        model=MODEL_PRIMARY,
        stream=False,
    )
    
    mock_response = MockCompletionResponse("Response")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ) as mock_create:
        await ai_service.complete(request)
        
        # Verify timeout was set
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["timeout"] == 30  # DEFAULT_TIMEOUT
