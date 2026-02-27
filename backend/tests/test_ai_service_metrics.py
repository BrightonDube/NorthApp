"""
Comprehensive tests for AIService metrics collection

This test file verifies that metrics are being collected correctly
according to task 2.8 requirements:
- Metrics collected for each request
- Metrics include: model, tokens used, duration, success status
- Metrics stored in _metrics list
- Metrics collected for both successful and failed requests
- Metrics can be retrieved and analyzed
- Metrics include timestamps
- Metrics are useful for monitoring and debugging
"""

import pytest
import time
from unittest.mock import MagicMock, patch
from app.services.ai_service import (
    AIService,
    AIRequest,
    AIServiceError,
    MODEL_PRIMARY,
    MODEL_FAST,
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


class MockCompletionResponse:
    """Mock non-streaming response from Groq"""
    def __init__(self, content: str, tokens: int = 50):
        self.choices = [MagicMock()]
        self.choices[0].message.content = content
        self.usage = MagicMock()
        self.usage.total_tokens = tokens


# Test: Metrics collected for every AI service call

@pytest.mark.asyncio
async def test_metrics_collected_for_streaming_success(ai_service, sample_request):
    """Verify metrics are collected for successful streaming requests"""
    mock_chunks = [MockStreamChunk("Hello"), MockStreamChunk(" world")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        # Clear any existing metrics
        ai_service._metrics.clear()
        
        # Execute streaming request
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify metrics were collected
        assert len(ai_service._metrics) == 1, "Metrics should be collected for streaming request"


@pytest.mark.asyncio
async def test_metrics_collected_for_non_streaming_success(ai_service):
    """Verify metrics are collected for successful non-streaming requests"""
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
        # Clear any existing metrics
        ai_service._metrics.clear()
        
        # Execute non-streaming request
        await ai_service.complete(request)
        
        # Verify metrics were collected
        assert len(ai_service._metrics) == 1, "Metrics should be collected for non-streaming request"


@pytest.mark.asyncio
async def test_metrics_collected_for_failed_requests(ai_service, sample_request):
    """Verify metrics are collected for failed requests"""
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        # Clear any existing metrics
        ai_service._metrics.clear()
        
        # Execute failing request
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify metrics were collected even for failure
        assert len(ai_service._metrics) == 1, "Metrics should be collected for failed requests"


# Test: Metrics include all required fields

@pytest.mark.asyncio
async def test_metrics_include_model_field(ai_service, sample_request):
    """Verify metrics include model field"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify model field exists and is correct
        assert "model" in ai_service._metrics[0], "Metrics should include 'model' field"
        assert ai_service._metrics[0]["model"] == MODEL_PRIMARY


@pytest.mark.asyncio
async def test_metrics_include_duration_field(ai_service, sample_request):
    """Verify metrics include duration field"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify duration field exists and is a number
        assert "duration_ms" in ai_service._metrics[0], "Metrics should include 'duration_ms' field"
        assert isinstance(ai_service._metrics[0]["duration_ms"], (int, float))
        assert ai_service._metrics[0]["duration_ms"] >= 0


@pytest.mark.asyncio
async def test_metrics_include_success_status(ai_service, sample_request):
    """Verify metrics include success status"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify success field exists and is boolean
        assert "success" in ai_service._metrics[0], "Metrics should include 'success' field"
        assert isinstance(ai_service._metrics[0]["success"], bool)
        assert ai_service._metrics[0]["success"] is True


@pytest.mark.asyncio
async def test_metrics_include_timestamp(ai_service, sample_request):
    """Verify metrics include timestamp"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        before_time = time.time()
        
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        after_time = time.time()
        
        # Verify timestamp field exists and is within expected range
        assert "timestamp" in ai_service._metrics[0], "Metrics should include 'timestamp' field"
        assert isinstance(ai_service._metrics[0]["timestamp"], (int, float))
        assert before_time <= ai_service._metrics[0]["timestamp"] <= after_time


# Test: Metrics for both success and failure

@pytest.mark.asyncio
async def test_success_metrics_have_correct_status(ai_service, sample_request):
    """Verify successful requests have success=True in metrics"""
    mock_chunks = [MockStreamChunk("Success")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify success status
        assert ai_service._metrics[0]["success"] is True
        assert "error" not in ai_service._metrics[0] or ai_service._metrics[0].get("error") is None


@pytest.mark.asyncio
async def test_failure_metrics_have_correct_status(ai_service, sample_request):
    """Verify failed requests have success=False and error message in metrics"""
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test error message")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        ai_service._metrics.clear()
        
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify failure status and error message
        assert ai_service._metrics[0]["success"] is False
        assert "error" in ai_service._metrics[0]
        assert "Test error message" in ai_service._metrics[0]["error"]


# Test: Metrics can be retrieved and analyzed

@pytest.mark.asyncio
async def test_metrics_are_accessible(ai_service, sample_request):
    """Verify metrics can be retrieved from the service"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify metrics can be accessed
        metrics = ai_service._metrics
        assert isinstance(metrics, list)
        assert len(metrics) > 0


@pytest.mark.asyncio
async def test_multiple_requests_accumulate_metrics(ai_service):
    """Verify metrics accumulate across multiple requests"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        
        # Make multiple requests
        for i in range(3):
            request = AIRequest(
                messages=[{"role": "user", "content": f"Message {i}"}],
                model=MODEL_PRIMARY,
                stream=True,
            )
            async for _ in ai_service.stream_completion(request):
                pass
        
        # Verify all metrics were collected
        assert len(ai_service._metrics) == 3, "Metrics should accumulate across requests"


@pytest.mark.asyncio
async def test_metrics_can_be_analyzed_for_performance(ai_service):
    """Verify metrics contain useful data for performance analysis"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        
        # Make requests with different models
        for model in [MODEL_PRIMARY, MODEL_FAST]:
            request = AIRequest(
                messages=[{"role": "user", "content": "Test"}],
                model=model,
                stream=True,
            )
            async for _ in ai_service.stream_completion(request):
                pass
        
        # Verify we can analyze metrics by model
        metrics_by_model = {}
        for metric in ai_service._metrics:
            model = metric["model"]
            if model not in metrics_by_model:
                metrics_by_model[model] = []
            metrics_by_model[model].append(metric)
        
        assert MODEL_PRIMARY in metrics_by_model
        assert MODEL_FAST in metrics_by_model
        assert len(metrics_by_model[MODEL_PRIMARY]) == 1
        assert len(metrics_by_model[MODEL_FAST]) == 1


# Test: Metrics are useful for monitoring and debugging

@pytest.mark.asyncio
async def test_metrics_help_identify_slow_requests(ai_service, sample_request):
    """Verify metrics can identify slow requests"""
    mock_chunks = [MockStreamChunk("Test")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        ai_service._metrics.clear()
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify we can identify duration
        metric = ai_service._metrics[0]
        assert "duration_ms" in metric
        
        # Simulate checking for slow requests (> 1000ms)
        slow_threshold = 1000
        is_slow = metric["duration_ms"] > slow_threshold
        assert isinstance(is_slow, bool)


@pytest.mark.asyncio
async def test_metrics_help_track_error_rates(ai_service):
    """Verify metrics can be used to calculate error rates"""
    mock_chunks = [MockStreamChunk("Success")]
    
    async def mock_stream():
        for chunk in mock_chunks:
            yield chunk
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Error")
    
    ai_service._metrics.clear()
    
    # Make 2 successful requests
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        for _ in range(2):
            request = AIRequest(
                messages=[{"role": "user", "content": "Test"}],
                model=MODEL_PRIMARY,
                stream=True,
            )
            async for _ in ai_service.stream_completion(request):
                pass
    
    # Make 1 failed request
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
            model=MODEL_PRIMARY,
            stream=True,
        )
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(request):
                pass
    
    # Calculate error rate
    total_requests = len(ai_service._metrics)
    failed_requests = sum(1 for m in ai_service._metrics if not m["success"])
    error_rate = failed_requests / total_requests if total_requests > 0 else 0
    
    assert total_requests == 3
    assert failed_requests == 1
    assert error_rate == pytest.approx(0.333, rel=0.01)


@pytest.mark.asyncio
async def test_metrics_help_debug_specific_failures(ai_service, sample_request):
    """Verify metrics contain error details for debugging"""
    error_message = "Specific error for debugging"
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception(error_message)
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        ai_service._metrics.clear()
        
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify error details are in metrics
        metric = ai_service._metrics[0]
        assert "error" in metric
        assert error_message in metric["error"]


# Test: Comprehensive metrics validation

@pytest.mark.asyncio
async def test_complete_metrics_structure_for_success(ai_service):
    """Verify complete metrics structure for successful requests"""
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
        ai_service._metrics.clear()
        await ai_service.complete(request)
        
        # Verify all required fields are present
        metric = ai_service._metrics[0]
        required_fields = ["timestamp", "model", "duration_ms", "success"]
        
        for field in required_fields:
            assert field in metric, f"Metric should include '{field}' field"
        
        # Verify field types
        assert isinstance(metric["timestamp"], (int, float))
        assert isinstance(metric["model"], str)
        assert isinstance(metric["duration_ms"], (int, float))
        assert isinstance(metric["success"], bool)
        
        # Verify values
        assert metric["model"] == MODEL_PRIMARY
        assert metric["duration_ms"] >= 0
        assert metric["success"] is True


@pytest.mark.asyncio
async def test_complete_metrics_structure_for_failure(ai_service, sample_request):
    """Verify complete metrics structure for failed requests"""
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test failure")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        ai_service._metrics.clear()
        
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify all required fields are present
        metric = ai_service._metrics[0]
        required_fields = ["timestamp", "model", "success", "error"]
        
        for field in required_fields:
            assert field in metric, f"Metric should include '{field}' field"
        
        # Verify field types
        assert isinstance(metric["timestamp"], (int, float))
        assert isinstance(metric["model"], str)
        assert isinstance(metric["success"], bool)
        assert isinstance(metric["error"], str)
        
        # Verify values
        assert metric["model"] == MODEL_PRIMARY
        assert metric["success"] is False
        assert len(metric["error"]) > 0
