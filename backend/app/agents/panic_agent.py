import json
from app.services.groq_client import MODEL_COMPLEX, get_groq_client

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
    client = get_groq_client()

    user_content = initial_message or "I pressed the panic button. I need help."

    messages = [
        {"role": "system", "content": PANIC_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    full_response = ""

    async with client.chat.completions.stream(
        model=MODEL_COMPLEX,
        messages=messages,
        temperature=0.35,
        max_tokens=512,
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                full_response += delta
                yield f"data: {json.dumps({'type': 'token', 'data': delta})}\n\n"

    yield f"data: {json.dumps({'type': 'done', 'data': {'panic': True}})}\n\n"
