"""
Demo script showing how metrics can be retrieved and analyzed for monitoring

This demonstrates the practical use of metrics for:
- Performance monitoring
- Error rate tracking
- Model usage analysis
- Debugging slow requests
"""

import pytest
from unittest.mock import MagicMock, patch
from app.services.ai_service import AIService, AIRequest, MODEL_PRIMARY, MODEL_FAST


class MockStreamChunk:
    """Mock streaming chunk"""
    def __init__(self, content: str):
        self.choices = [MagicMock()]
        self.choices[0].delta.content = content


@pytest.mark.asyncio
async def test_demo_metrics_collection():
    """Demonstrate metrics collection and analysis"""
    
    # Create AI service
    ai_service = AIService(api_key="demo-key")
    
    # Mock the Groq client
    async def mock_stream():
        for chunk in [MockStreamChunk("Hello"), MockStreamChunk(" world")]:
            yield chunk
    
    with patch.object(
        ai_service.client.chat.completions,
        'create',
        return_value=mock_stream()
    ):
        # Make several requests
        print("Making AI requests...")
        for i in range(5):
            request = AIRequest(
                messages=[{"role": "user", "content": f"Message {i}"}],
                model=MODEL_PRIMARY if i % 2 == 0 else MODEL_FAST,
                stream=True,
            )
            async for _ in ai_service.stream_completion(request):
                pass
        
        print(f"\nCollected {len(ai_service._metrics)} metrics\n")
        
        # Analyze metrics
        print("=" * 60)
        print("METRICS ANALYSIS")
        print("=" * 60)
        
        # 1. Overall statistics
        total_requests = len(ai_service._metrics)
        successful_requests = sum(1 for m in ai_service._metrics if m["success"])
        failed_requests = total_requests - successful_requests
        
        print("\n1. Overall Statistics:")
        print(f"   Total requests: {total_requests}")
        print(f"   Successful: {successful_requests}")
        print(f"   Failed: {failed_requests}")
        print(f"   Success rate: {(successful_requests/total_requests)*100:.1f}%")
        
        # 2. Performance metrics
        durations = [m["duration_ms"] for m in ai_service._metrics]
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        min_duration = min(durations)
        
        print("\n2. Performance Metrics:")
        print(f"   Average duration: {avg_duration:.2f}ms")
        print(f"   Min duration: {min_duration:.2f}ms")
        print(f"   Max duration: {max_duration:.2f}ms")
        
        # 3. Model usage
        model_usage = {}
        for metric in ai_service._metrics:
            model = metric["model"]
            model_usage[model] = model_usage.get(model, 0) + 1
        
        print("\n3. Model Usage:")
        for model, count in model_usage.items():
            print(f"   {model}: {count} requests")
        
        # 4. Identify slow requests (> 100ms)
        slow_threshold = 100
        slow_requests = [m for m in ai_service._metrics if m["duration_ms"] > slow_threshold]
        
        print(f"\n4. Slow Requests (>{slow_threshold}ms):")
        print(f"   Count: {len(slow_requests)}")
        if slow_requests:
            for i, req in enumerate(slow_requests, 1):
                print(f"   Request {i}: {req['duration_ms']:.2f}ms using {req['model']}")
        
        # 5. Time series data
        print("\n5. Request Timeline:")
        for i, metric in enumerate(ai_service._metrics, 1):
            status = "✓" if metric["success"] else "✗"
            print(f"   Request {i}: {status} {metric['model']} - {metric['duration_ms']:.2f}ms")
        
        print("\n" + "=" * 60)
        print("METRICS VERIFICATION")
        print("=" * 60)
        
        # Verify all required fields are present
        required_fields = ["timestamp", "model", "duration_ms", "success"]
        print("\nChecking required fields in metrics...")
        
        all_valid = True
        for i, metric in enumerate(ai_service._metrics, 1):
            missing_fields = [field for field in required_fields if field not in metric]
            if missing_fields:
                print(f"   ✗ Metric {i} missing fields: {missing_fields}")
                all_valid = False
            else:
                print(f"   ✓ Metric {i} has all required fields")
        
        if all_valid:
            print("\n✓ All metrics contain required fields!")
        else:
            print("\n✗ Some metrics are missing required fields")
        
        print("\n" + "=" * 60)
