import google.generativeai as genai
from typing import AsyncGenerator

from app.config import get_settings

# Gemini model identifier - 2.5 Flash for high-context conversations (1M+ tokens)
# Using stable version released June 2025
MODEL_GEMINI_FLASH = "gemini-2.5-flash"

_client_configured = False


def configure_gemini_client():
    """Configure the Gemini client singleton."""
    global _client_configured
    if not _client_configured:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=settings.gemini_api_key)
        _client_configured = True


def convert_messages_to_gemini_format(messages: list[dict]) -> tuple[str | None, list[dict]]:
    """
    Convert OpenAI-style messages to Gemini format.
    
    Gemini expects:
    - system_instruction (optional): System message
    - contents: List of parts with role 'user' or 'model'
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        
    Returns:
        Tuple of (system_instruction, conversation_messages)
    """
    system_instruction = None
    conversation_messages = []

    for msg in messages:
        role = msg["role"]
        content = msg["content"]

        if role == "system":
            # Extract system message
            system_instruction = content
        elif role == "assistant":
            # Convert 'assistant' to 'model' for Gemini
            conversation_messages.append({
                "role": "model",
                "parts": [{"text": content}]
            })
        elif role == "user":
            # Handle both text and multimodal content
            if isinstance(content, str):
                conversation_messages.append({
                    "role": "user",
                    "parts": [{"text": content}]
                })
            elif isinstance(content, list):
                # Multimodal content - convert to Gemini format
                parts = []
                for part in content:
                    if part.get("type") == "text":
                        parts.append({"text": part["text"]})
                    elif part.get("type") == "image_url":
                        # Gemini expects inline_data for images
                        # Extract base64 data from data URL
                        image_url = part["image_url"]["url"]
                        if image_url.startswith("data:"):
                            # Format: data:image/jpeg;base64,<base64_data>
                            mime_type, base64_data = image_url.split(";base64,")
                            mime_type = mime_type.replace("data:", "")
                            parts.append({
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": base64_data
                                }
                            })

                if parts:
                    conversation_messages.append({
                        "role": "user",
                        "parts": parts
                    })

    return system_instruction, conversation_messages


async def stream_gemini_response(
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """
    Stream a response from Gemini 1.5 Flash.
    
    Args:
        messages: List of message dicts with 'role' and 'content'
        temperature: Sampling temperature (0.0-2.0)
        max_tokens: Maximum tokens to generate
        
    Yields:
        Content chunks from the streaming response
    """
    configure_gemini_client()

    # Convert messages to Gemini format
    system_instruction, conversation_messages = convert_messages_to_gemini_format(messages)

    # Configure generation parameters
    generation_config = {
        "temperature": temperature,
        "max_output_tokens": max_tokens,
        "top_p": 0.95,
        "top_k": 40,
    }

    # Configure safety settings to be permissive for coaching context
    # We want to allow discussions of sensitive topics in a coaching context
    safety_settings = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_ONLY_HIGH"
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_ONLY_HIGH"
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_ONLY_HIGH"
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_ONLY_HIGH"
        },
    ]

    # Create model with system instruction if present
    model_kwargs = {
        "model_name": MODEL_GEMINI_FLASH,
        "generation_config": generation_config,
        "safety_settings": safety_settings,
    }

    if system_instruction:
        model_kwargs["system_instruction"] = system_instruction

    model = genai.GenerativeModel(**model_kwargs)

    try:
        # Stream the response
        response = await model.generate_content_async(
            conversation_messages,
            stream=True,
        )

        async for chunk in response:
            # Handle safety filters gracefully
            if hasattr(chunk, 'prompt_feedback') and chunk.prompt_feedback:
                # Check if content was blocked
                if hasattr(chunk.prompt_feedback, 'block_reason') and chunk.prompt_feedback.block_reason:
                    yield f"[Content filtered: {chunk.prompt_feedback.block_reason}]"
                    return

            # Extract text from chunk - handle different response formats
            try:
                # Try to get text directly
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text
                # Try to get parts
                elif hasattr(chunk, 'parts') and chunk.parts:
                    for part in chunk.parts:
                        if hasattr(part, 'text') and part.text:
                            yield part.text
                # Try to get candidates
                elif hasattr(chunk, 'candidates') and chunk.candidates:
                    for candidate in chunk.candidates:
                        if hasattr(candidate, 'content') and candidate.content:
                            if hasattr(candidate.content, 'parts') and candidate.content.parts:
                                for part in candidate.content.parts:
                                    if hasattr(part, 'text') and part.text:
                                        yield part.text
            except (ValueError, AttributeError):
                # Skip chunks that don't have text content
                continue

    except Exception as e:
        # Handle safety filter blocks and other errors
        error_msg = str(e)
        if "SAFETY" in error_msg.upper() or "blocked" in error_msg.lower():
            yield "[Response blocked by safety filters. Please rephrase your question.]"
        else:
            # Re-raise other errors to trigger fallback
            raise
