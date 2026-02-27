"""
Tests for Task 2.7: Verify error handling works correctly

This test suite verifies:
- AIServiceError is properly raised and caught
- Timeout scenarios (30s default timeout)
- Network errors and connection failures
- Invalid API responses
- Error messages are user-friendly
- Error logging and monitoring
- SSE error events are properly formatted
- Graceful degradation when AI service fails
"""

import pytest
import asyncio
import json
from unittest.mock import MagicMock, patch
from app.services.ai_service import (
    AIService,
    AIRequest,
    AIServiceError,
    MODEL_PRIMARY,
    DEFAULT_TIMEOUT,
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


# ============================================================================
# Test 1: AIServiceError is properly raised and caught
# ============================================================================

@pytest.mark.asyncio
async def test_ai_service_error_raised_on_persistent_failure(ai_service, sample_request):
    """Verify AIServiceError is raised after max retries"""
    
    async def mock_create_always_fails(*args, **kwargs):
        raise Exception("Persistent API error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_always_fails
    ):
        with pytest.raises(AIServiceError) as exc_info:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify error message is descriptive
        error_msg = str(exc_info.value)
        assert "failed after 3 attempts" in error_msg
        assert "Persistent API error" in error_msg


@pytest.mark.asyncio
async def test_ai_service_error_caught_in_chat_agent():
    """Verify AIServiceError is properly caught in chat agent"""
    from app.agents.chat_agent import stream_chat_response
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={"name": "Test", "system_prompt": "Test"}):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.save_message", return_value="msg-123"):
                                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai:
                                            # Mock AIService to raise error
                                            mock_ai_service = MagicMock()
                                            
                                            async def mock_stream_error(*args, **kwargs):
                                                raise AIServiceError("AI service unavailable")
                                            
                                            mock_ai_service.stream_completion = mock_stream_error
                                            mock_get_ai.return_value = mock_ai_service
                                            
                                            # Stream response
                                            events = []
                                            async for event in stream_chat_response(
                                                user_id="user-123",
                                                session_id="session-123",
                                                coach_id="coach-123",
                                                message="Hello"
                                            ):
                                                events.append(event)
                                            
                                            # Verify error event was sent
                                            assert len(events) > 0
                                            error_event = events[-1]
                                            assert "error" in error_event
                                            
                                            # Parse SSE format
                                            if error_event.startswith("data: "):
                                                data = json.loads(error_event[6:].strip())
                                                assert data["type"] == "error"
                                                assert "message" in data["data"]


# ============================================================================
# Test 2: Timeout scenarios (30s default timeout)
# ============================================================================

@pytest.mark.asyncio
async def test_timeout_default_value(ai_service, sample_request):
    """Verify default timeout is 30 seconds"""
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Response"))]
    mock_response.usage = MagicMock(total_tokens=10)
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ) as mock_create:
        request = AIRequest(
            messages=[{"role": "user", "content": "Hello"}],
            stream=False
        )
        
        await ai_service.complete(request)
        
        # Verify timeout was set to default
        call_kwargs = mock_create.call_args.kwargs
        assert call_kwargs["timeout"] == DEFAULT_TIMEOUT
        assert DEFAULT_TIMEOUT == 30


@pytest.mark.asyncio
async def test_timeout_error_handling(ai_service, sample_request):
    """Verify timeout errors are handled gracefully"""
    
    async def mock_create_timeout(*args, **kwargs):
        # Simulate timeout error
        raise asyncio.TimeoutError("Request timed out")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_timeout
    ):
        with pytest.raises(AIServiceError) as exc_info:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify timeout is mentioned in error
        error_msg = str(exc_info.value)
        assert "timed out" in error_msg.lower() or "timeout" in error_msg.lower()


@pytest.mark.asyncio
async def test_timeout_triggers_retry(ai_service, sample_request):
    """Verify timeout triggers retry logic"""
    
    call_count = 0
    
    async def mock_create_timeout_then_success(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        
        if call_count < 2:
            raise asyncio.TimeoutError("Request timed out")
        
        # Success on 2nd attempt
        async def success_stream():
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="Success"))])
        
        return success_stream()
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_timeout_then_success
    ):
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Verify retry happened
        assert call_count == 2
        assert chunks == ["Success"]


# ============================================================================
# Test 3: Network errors and connection failures
# ============================================================================

@pytest.mark.asyncio
async def test_network_error_handling(ai_service, sample_request):
    """Verify network errors are handled gracefully"""
    
    async def mock_create_network_error(*args, **kwargs):
        raise ConnectionError("Network unreachable")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_network_error
    ):
        with pytest.raises(AIServiceError) as exc_info:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Verify error message is user-friendly
        error_msg = str(exc_info.value)
        assert "Network unreachable" in error_msg


@pytest.mark.asyncio
async def test_connection_refused_error(ai_service, sample_request):
    """Verify connection refused errors are handled"""
    
    async def mock_create_connection_refused(*args, **kwargs):
        raise ConnectionRefusedError("Connection refused")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_connection_refused
    ):
        with pytest.raises(AIServiceError) as exc_info:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        error_msg = str(exc_info.value)
        assert "Connection refused" in error_msg


@pytest.mark.asyncio
async def test_network_error_triggers_retry(ai_service, sample_request):
    """Verify network errors trigger retry logic"""
    
    call_count = 0
    
    async def mock_create_network_then_success(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        
        if call_count < 2:
            raise ConnectionError("Temporary network issue")
        
        # Success on 2nd attempt
        async def success_stream():
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="Recovered"))])
        
        return success_stream()
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_network_then_success
    ):
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Verify retry happened and succeeded
        assert call_count == 2
        assert chunks == ["Recovered"]


# ============================================================================
# Test 4: Invalid API responses
# ============================================================================

@pytest.mark.asyncio
async def test_invalid_response_structure(ai_service, sample_request):
    """Verify invalid API response structures are handled"""
    
    async def mock_create_invalid_response(*args, **kwargs):
        # Return invalid structure
        async def invalid_stream():
            yield MagicMock(choices=[])  # Empty choices
        
        return invalid_stream()
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_create_invalid_response()
    ):
        with pytest.raises((AIServiceError, IndexError, AttributeError)):
            async for _ in ai_service.stream_completion(sample_request):
                pass


@pytest.mark.asyncio
async def test_missing_content_in_response(ai_service, sample_request):
    """Verify missing content in response is handled"""
    
    async def mock_stream_no_content():
        # All chunks have None content
        for _ in range(3):
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content=None))])
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream_no_content()
    ):
        chunks = []
        async for chunk in ai_service.stream_completion(sample_request):
            chunks.append(chunk)
        
        # Should filter out None chunks
        assert len(chunks) == 0


@pytest.mark.asyncio
async def test_malformed_json_in_response(ai_service):
    """Verify malformed JSON responses are handled"""
    
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello"}],
        stream=False
    )
    
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="{invalid json"))]
    mock_response.usage = MagicMock(total_tokens=10)
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_response
    ):
        # Should not raise error - just return the content as-is
        response = await ai_service.complete(request)
        assert response.success is True
        assert response.content == "{invalid json"


# ============================================================================
# Test 5: Error messages are user-friendly
# ============================================================================

@pytest.mark.asyncio
async def test_user_friendly_error_messages():
    """Verify error messages are clear and actionable"""
    from app.agents.chat_agent import stream_chat_response
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={"name": "Test", "system_prompt": "Test"}):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.save_message", return_value="msg-123"):
                                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai:
                                            # Mock AIService to raise error
                                            mock_ai_service = MagicMock()
                                            
                                            async def mock_stream_error(*args, **kwargs):
                                                raise AIServiceError("Service temporarily unavailable")
                                            
                                            mock_ai_service.stream_completion = mock_stream_error
                                            mock_get_ai.return_value = mock_ai_service
                                            
                                            # Stream response
                                            events = []
                                            async for event in stream_chat_response(
                                                user_id="user-123",
                                                session_id="session-123",
                                                coach_id="coach-123",
                                                message="Hello"
                                            ):
                                                events.append(event)
                                            
                                            # Verify error message is user-friendly
                                            error_event = events[-1]
                                            if error_event.startswith("data: "):
                                                data = json.loads(error_event[6:].strip())
                                                error_message = data["data"]["message"]
                                                
                                                # Should not expose technical details
                                                assert "AI service" in error_message or "not available" in error_message
                                                assert "try again" in error_message.lower()
                                                
                                                # Should not contain stack traces or internal errors
                                                assert "Traceback" not in error_message
                                                assert "Exception" not in error_message


# ============================================================================
# Test 6: Error logging and monitoring
# ============================================================================

@pytest.mark.asyncio
async def test_error_logging(ai_service, sample_request):
    """Verify errors are properly logged"""
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Test error for logging")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        try:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        except AIServiceError:
            pass
        
        # Verify error was logged in metrics
        assert len(ai_service._metrics) > 0
        error_metric = ai_service._metrics[-1]
        assert error_metric["success"] is False
        assert "error" in error_metric
        assert "Test error for logging" in error_metric["error"]


@pytest.mark.asyncio
async def test_error_metrics_collection(ai_service, sample_request):
    """Verify error metrics are collected for monitoring"""
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("Monitoring test error")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        try:
            async for _ in ai_service.stream_completion(sample_request):
                pass
        except AIServiceError:
            pass
        
        # Verify metrics contain necessary information
        metric = ai_service._metrics[-1]
        assert "timestamp" in metric
        assert "model" in metric
        assert metric["model"] == MODEL_PRIMARY
        assert "success" in metric
        assert metric["success"] is False
        assert "error" in metric


@pytest.mark.asyncio
async def test_success_logging(ai_service, sample_request):
    """Verify successful requests are also logged"""
    
    async def mock_stream():
        yield MagicMock(choices=[MagicMock(delta=MagicMock(content="Success"))])
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        async for _ in ai_service.stream_completion(sample_request):
            pass
        
        # Verify success was logged
        assert len(ai_service._metrics) > 0
        success_metric = ai_service._metrics[-1]
        assert success_metric["success"] is True
        assert "duration_ms" in success_metric


# ============================================================================
# Test 7: SSE error events are properly formatted
# ============================================================================

@pytest.mark.asyncio
async def test_sse_error_event_format():
    """Verify SSE error events follow correct format"""
    from app.agents.chat_agent import stream_chat_response
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={"name": "Test", "system_prompt": "Test"}):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.save_message", return_value="msg-123"):
                                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai:
                                            # Mock AIService to raise error
                                            mock_ai_service = MagicMock()
                                            
                                            async def mock_stream_error(*args, **kwargs):
                                                raise AIServiceError("Test error")
                                            
                                            mock_ai_service.stream_completion = mock_stream_error
                                            mock_get_ai.return_value = mock_ai_service
                                            
                                            # Stream response
                                            events = []
                                            async for event in stream_chat_response(
                                                user_id="user-123",
                                                session_id="session-123",
                                                coach_id="coach-123",
                                                message="Hello"
                                            ):
                                                events.append(event)
                                            
                                            # Verify SSE format
                                            error_event = events[-1]
                                            
                                            # Should start with "data: "
                                            assert error_event.startswith("data: ")
                                            
                                            # Should end with double newline
                                            assert error_event.endswith("\n\n")
                                            
                                            # Should be valid JSON
                                            json_str = error_event[6:].strip()
                                            data = json.loads(json_str)
                                            
                                            # Should have correct structure
                                            assert "type" in data
                                            assert data["type"] == "error"
                                            assert "data" in data
                                            assert "message" in data["data"]


# ============================================================================
# Test 8: Graceful degradation when AI service fails
# ============================================================================

@pytest.mark.asyncio
async def test_graceful_degradation_no_crash():
    """Verify application doesn't crash when AI service fails"""
    from app.agents.chat_agent import stream_chat_response
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={"name": "Test", "system_prompt": "Test"}):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.save_message", return_value="msg-123"):
                                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai:
                                            # Mock AIService to raise error
                                            mock_ai_service = MagicMock()
                                            
                                            async def mock_stream_error(*args, **kwargs):
                                                raise AIServiceError("Service down")
                                            
                                            mock_ai_service.stream_completion = mock_stream_error
                                            mock_get_ai.return_value = mock_ai_service
                                            
                                            # Should not raise exception - should yield error event
                                            events = []
                                            try:
                                                async for event in stream_chat_response(
                                                    user_id="user-123",
                                                    session_id="session-123",
                                                    coach_id="coach-123",
                                                    message="Hello"
                                                ):
                                                    events.append(event)
                                            except Exception as e:
                                                pytest.fail(f"Should not raise exception, but got: {e}")
                                            
                                            # Should have sent error event
                                            assert len(events) > 0


@pytest.mark.asyncio
async def test_no_silent_failures(ai_service, sample_request):
    """Verify there are no silent failures - all errors are reported"""
    
    async def mock_create_fails(*args, **kwargs):
        raise Exception("This error should not be silent")
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        side_effect=mock_create_fails
    ):
        # Should raise AIServiceError, not silently fail
        with pytest.raises(AIServiceError):
            async for _ in ai_service.stream_completion(sample_request):
                pass
        
        # Should also log the error
        assert len(ai_service._metrics) > 0
        assert ai_service._metrics[-1]["success"] is False


@pytest.mark.asyncio
async def test_partial_response_handling():
    """Verify partial responses are handled when stream fails mid-way"""
    from app.agents.chat_agent import stream_chat_response
    
    # Mock all dependencies
    with patch("app.agents.chat_agent.get_user_firmness", return_value=5):
        with patch("app.agents.chat_agent.get_coach_info", return_value={"name": "Test", "system_prompt": "Test"}):
            with patch("app.agents.chat_agent.get_user_context_text", return_value=""):
                with patch("app.agents.chat_agent.retrieve_relevant_memories", return_value=[]):
                    with patch("app.agents.chat_agent.format_memories_for_prompt", return_value=""):
                        with patch("app.agents.chat_agent.get_conversation_insights", return_value=""):
                            with patch("app.agents.chat_agent.get_conversation_history", return_value=[]):
                                with patch("app.agents.chat_agent.get_grow_state", return_value={"state": "goal", "data": {}}):
                                    with patch("app.agents.chat_agent.save_message", return_value="msg-123"):
                                        with patch("app.agents.chat_agent.get_ai_service") as mock_get_ai:
                                            # Mock AIService to yield some chunks then fail
                                            mock_ai_service = MagicMock()
                                            
                                            async def mock_stream_partial_then_fail(*args, **kwargs):
                                                yield "Hello"
                                                yield " world"
                                                raise AIServiceError("Connection lost")
                                            
                                            mock_ai_service.stream_completion = mock_stream_partial_then_fail
                                            mock_get_ai.return_value = mock_ai_service
                                            
                                            # Should handle partial response gracefully
                                            events = []
                                            async for event in stream_chat_response(
                                                user_id="user-123",
                                                session_id="session-123",
                                                coach_id="coach-123",
                                                message="Hello"
                                            ):
                                                events.append(event)
                                            
                                            # Should have received partial tokens and error event
                                            assert len(events) >= 2  # At least some tokens + error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
