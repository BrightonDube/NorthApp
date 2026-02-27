"""
Integration tests for AIService with chat agent.
Tests Task 2.6: Verify chat endpoint works with new AI service
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Test AIService integration without full app import
@pytest.mark.asyncio
async def test_ai_service_stream_completion():
    """Test that AIService.stream_completion works correctly"""
    from app.services.ai_service import AIService, AIRequest, MODEL_PRIMARY
    
    # Mock the Groq client
    with patch("app.services.ai_service.AsyncGroq") as MockGroq:
        mock_groq_instance = AsyncMock()
        MockGroq.return_value = mock_groq_instance
        
        # Mock streaming response
        async def mock_stream():
            chunks = [
                MagicMock(choices=[MagicMock(delta=MagicMock(content="Hello"))]),
                MagicMock(choices=[MagicMock(delta=MagicMock(content=" world"))]),
                MagicMock(choices=[MagicMock(delta=MagicMock(content="!"))]),
            ]
            for chunk in chunks:
                yield chunk
        
        mock_groq_instance.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        # Create AIService
        ai_service = AIService(api_key="test-key")
        
        # Create request
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
            temperature=0.7,
            model=MODEL_PRIMARY,
            stream=True
        )
        
        # Stream completion
        result = []
        async for chunk in ai_service.stream_completion(request):
            result.append(chunk)
        
        # Verify
        assert len(result) == 3
        assert "".join(result) == "Hello world!"
        assert mock_groq_instance.chat.completions.create.called


@pytest.mark.asyncio
async def test_ai_service_retry_logic():
    """Test that AIService retries on failure"""
    from app.services.ai_service import AIService, AIRequest
    
    with patch("app.services.ai_service.AsyncGroq") as MockGroq:
        mock_groq_instance = AsyncMock()
        MockGroq.return_value = mock_groq_instance
        
        # Mock to fail twice, then succeed
        call_count = 0
        
        async def mock_create(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            if call_count < 3:
                raise Exception("Temporary failure")
            
            # Success on 3rd attempt
            async def success_stream():
                yield MagicMock(choices=[MagicMock(delta=MagicMock(content="Success"))])
            
            return success_stream()
        
        mock_groq_instance.chat.completions.create = mock_create
        
        # Create AIService
        ai_service = AIService(api_key="test-key")
        
        # Create request
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
            model="llama-3.3-70b-versatile",
        )
        
        # Should succeed after retries
        result = []
        async for chunk in ai_service.stream_completion(request):
            result.append(chunk)
        
        # Verify it retried and succeeded
        assert call_count == 3
        assert "".join(result) == "Success"


@pytest.mark.asyncio
async def test_ai_service_max_retries_exceeded():
    """Test that AIService raises error after max retries"""
    from app.services.ai_service import AIService, AIRequest, AIServiceError
    
    with patch("app.services.ai_service.AsyncGroq") as MockGroq:
        mock_groq_instance = AsyncMock()
        MockGroq.return_value = mock_groq_instance
        
        # Mock to always fail
        async def mock_create(*args, **kwargs):
            raise Exception("Persistent failure")
        
        mock_groq_instance.chat.completions.create = mock_create
        
        # Create AIService
        ai_service = AIService(api_key="test-key")
        
        # Create request
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
            model="llama-3.3-70b-versatile",
        )
        
        # Should raise AIServiceError after max retries
        with pytest.raises(AIServiceError) as exc_info:
            async for chunk in ai_service.stream_completion(request):
                pass
        
        assert "failed after 3 attempts" in str(exc_info.value)


@pytest.mark.asyncio
async def test_ai_service_complete_non_streaming():
    """Test that AIService.complete works for non-streaming requests"""
    from app.services.ai_service import AIService, AIRequest, AIResponse
    
    with patch("app.services.ai_service.AsyncGroq") as MockGroq:
        mock_groq_instance = AsyncMock()
        MockGroq.return_value = mock_groq_instance
        
        # Mock non-streaming response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock(message=MagicMock(content="Complete response"))]
        mock_response.usage = MagicMock(total_tokens=50)
        
        mock_groq_instance.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Create AIService
        ai_service = AIService(api_key="test-key")
        
        # Create request
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
            stream=False
        )
        
        # Complete
        response = await ai_service.complete(request)
        
        # Verify
        assert isinstance(response, AIResponse)
        assert response.success is True
        assert response.content == "Complete response"
        assert response.tokens_used == 50
        assert response.error is None


@pytest.mark.asyncio
async def test_chat_agent_uses_ai_service():
    """Test that chat agent properly uses AIService"""
    from app.agents.chat_agent import get_ai_service
    from app.services.ai_service import AIService
    
    # Mock config settings
    with patch("app.config.get_settings") as mock_settings:
        mock_settings_obj = MagicMock()
        mock_settings_obj.groq_api_key = "test-key"
        mock_settings.return_value = mock_settings_obj
        
        # Get AI service
        ai_service = get_ai_service()
        
        # Verify it's an AIService instance
        assert isinstance(ai_service, AIService)


@pytest.mark.asyncio
async def test_ai_service_metrics_collection():
    """Test that AIService collects metrics"""
    from app.services.ai_service import AIService, AIRequest
    
    with patch("app.services.ai_service.AsyncGroq") as MockGroq:
        mock_groq_instance = AsyncMock()
        MockGroq.return_value = mock_groq_instance
        
        # Mock streaming response
        async def mock_stream():
            yield MagicMock(choices=[MagicMock(delta=MagicMock(content="Test"))])
        
        mock_groq_instance.chat.completions.create = AsyncMock(return_value=mock_stream())
        
        # Create AIService
        ai_service = AIService(api_key="test-key")
        
        # Verify no metrics initially
        assert len(ai_service._metrics) == 0
        
        # Create request
        request = AIRequest(
            messages=[{"role": "user", "content": "Test"}],
        )
        
        # Stream completion
        async for chunk in ai_service.stream_completion(request):
            pass
        
        # Verify metrics were collected
        assert len(ai_service._metrics) > 0
        metric = ai_service._metrics[0]
        assert "model" in metric
        assert "duration_ms" in metric
        assert "success" in metric
        assert metric["success"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
