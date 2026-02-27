"""
Example usage of AIService with stream_completion()

This demonstrates how to use the new centralized AI service
for streaming completions with automatic retry logic.
"""

import asyncio
from app.services.ai_service import AIService, AIRequest, MODEL_PRIMARY
from app.config import get_settings


async def example_streaming_chat():
    """Example: Stream a chat completion"""
    settings = get_settings()
    ai_service = AIService(api_key=settings.groq_api_key)
    
    # Create a request
    request = AIRequest(
        messages=[
            {"role": "system", "content": "You are a helpful coaching assistant."},
            {"role": "user", "content": "What's a good way to build a daily habit?"}
        ],
        model=MODEL_PRIMARY,
        temperature=0.7,
        max_tokens=500,
        stream=True,
    )
    
    # Stream the response
    print("AI Response: ", end="", flush=True)
    try:
        async for chunk in ai_service.stream_completion(request):
            print(chunk, end="", flush=True)
        print("\n")
    except Exception as e:
        print(f"\nError: {e}")


async def example_with_error_handling():
    """Example: Handle errors gracefully"""
    settings = get_settings()
    ai_service = AIService(api_key=settings.groq_api_key)
    
    request = AIRequest(
        messages=[{"role": "user", "content": "Hello!"}],
        model=MODEL_PRIMARY,
    )
    
    try:
        full_response = ""
        async for chunk in ai_service.stream_completion(request):
            full_response += chunk
            print(chunk, end="", flush=True)
        
        print(f"\n\nFull response length: {len(full_response)} characters")
        
    except Exception as e:
        print(f"Failed after retries: {e}")


if __name__ == "__main__":
    print("=== Example 1: Basic Streaming ===")
    asyncio.run(example_streaming_chat())
    
    print("\n=== Example 2: With Error Handling ===")
    asyncio.run(example_with_error_handling())
