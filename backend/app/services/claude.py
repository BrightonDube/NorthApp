from anthropic import AsyncAnthropic

from app.config import get_settings

# Claude model identifier
MODEL_CLAUDE_SONNET = "claude-3-5-sonnet-20241022"

_client: AsyncAnthropic | None = None


def get_claude_client() -> AsyncAnthropic:
    """Get or create the Claude client singleton."""
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def stream_claude_response(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
):
    """
    Stream a response from Claude 3.5 Sonnet.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        temperature: Sampling temperature (0.0-1.0)
        max_tokens: Maximum tokens to generate
        
    Yields:
        Content chunks from the streaming response
    """
    client = get_claude_client()

    # Extract system message if present
    system_message = None
    conversation_messages = []

    for msg in messages:
        if msg["role"] == "system":
            system_message = msg["content"]
        else:
            conversation_messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Build request parameters
    request_params = {
        "model": MODEL_CLAUDE_SONNET,
        "messages": conversation_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if system_message:
        request_params["system"] = system_message

    # Stream the response
    async with client.messages.stream(**request_params) as stream:
        async for text in stream.text_stream:
            yield text
