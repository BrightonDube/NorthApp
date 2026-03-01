import json
import logging

from app.services.groq_client import MODEL_COMPLEX
from app.services.ai_service import AIService, AIRequest, AIServiceError
from app.config import get_settings

logger = logging.getLogger(__name__)

PANIC_SYSTEM_PROMPT = """You are a crisis support coach. The user has pressed the PANIC button — they are overwhelmed and need immediate support.

CRITICAL RULES:
1. Start with: "I'm here. Take a breath. You're not alone in this moment."
2. Acknowledge their distress immediately and unconditionally
3. Use grounding techniques when appropriate (5-4-3-2-1 sensory method)
4. Ask ONE simple, open question at a time — never multiple questions
5. Never minimize, dismiss, or rush their feelings
6. Never give unsolicited advice in the first response
7. If they mention self-harm or suicide, respond with compassion AND provide:
   - International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/
   - Crisis Text Line: Text HOME to 741741 (US)
   - Samaritans: 116 123 (UK)

Your tone: calm, present, warm, unhurried. You are a safe space.
"""


async def stream_panic_response(
    user_id: str,
    initial_message: str | None = None,
):
    """Stream a crisis-support response via AIService.

    Uses lower temperature for calm, consistent tone and the complex model
    for nuanced emotional understanding.  Retries are handled by AIService.

    Args:
        user_id: Authenticated user UUID (for logging).
        initial_message: Optional user-supplied text; defaults to generic panic.

    Yields:
        SSE-formatted data lines.
    """
    settings = get_settings()
    ai = AIService(api_key=settings.groq_api_key)

    user_content = initial_message or "I pressed the panic button. I need help."

    request = AIRequest(
        messages=[
            {"role": "system", "content": PANIC_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.35,
        max_tokens=512,
        model=MODEL_COMPLEX,
        stream=True,
    )

    try:
        async for chunk in ai.stream_completion(request):
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
    except AIServiceError as e:
        logger.error("Panic stream failed for user %s: %s", user_id, e)
        yield f"data: {json.dumps({'type': 'error', 'message': 'Crisis support is temporarily unavailable. Please reach out to a helpline.'})}\n\n"
        return

    yield f"data: {json.dumps({'type': 'done', 'panic': True})}\n\n"
