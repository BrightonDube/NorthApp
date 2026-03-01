import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from uuid import uuid4

from app.services.supabase import get_async_supabase_client
from app.services.rag import retrieve_relevant_memories, format_memories_for_prompt
from app.services.cache import (
    get_cache,
    make_coach_prompt_key,
    make_user_context_key,
    make_user_firmness_key,
    TTL_COACH_PROMPT,
    TTL_USER_CONTEXT,
    TTL_USER_FIRMNESS,
)
from app.services.monitoring import get_metrics_collector
from app.services.ai_service import (
    AIService,
    AIRequest,
    AIServiceError,
    MODEL_PRIMARY,
)

logger = logging.getLogger(__name__)

PERSONA_PROMPTS = {
    "gentle": (
        "You are an extremely supportive and gentle coach. "
        "Always validate feelings first. Never push back or challenge. "
        "Offer encouragement and gentle suggestions only."
    ),
    "balanced": (
        "You are a balanced coach — warm and supportive, but willing to "
        "challenge the user when needed. You celebrate wins and gently "
        "call out excuses. You ask powerful questions."
    ),
    "tough": (
        "You are a tough-love coach. No excuses accepted. "
        "You hold the user to their commitments, call out self-sabotage directly, "
        "and push them to do better. You still care — but you show it through honesty."
    ),
}


# Initialize AIService instance
# This will be used in future tasks to replace direct Groq client calls
def get_ai_service() -> AIService:
    """
    Get AIService instance with Groq API key.
    
    Returns:
        Initialized AIService instance
    """
    from app.config import get_settings
    settings = get_settings()
    return AIService(api_key=settings.groq_api_key)


def get_persona_prompt(firmness_level: int) -> str:
    if firmness_level <= 3:
        return PERSONA_PROMPTS["gentle"]
    elif firmness_level <= 7:
        return PERSONA_PROMPTS["balanced"]
    else:
        return PERSONA_PROMPTS["tough"]


def get_grow_stage_guidance(grow_state: str) -> str:
    """
    Get stage-specific coaching guidance for the GROW model.

    Args:
        grow_state: Current GROW stage ('goal', 'reality', 'options', 'way_forward', 'complete')

    Returns:
        Stage-specific guidance text to inject into system prompt
    """
    guidance_map = {
        "goal": """
Current GROW Stage: Goal

Guide the user to clarify what they truly want to achieve.
Ask questions like:
- What would success look like?
- Why is this important to you?
- What would change if you achieved this?
""",
        "reality": """
Current GROW Stage: Reality

Help the user assess their current situation honestly.
Ask questions like:
- What's happening right now?
- What have you tried so far?
- What resources do you have available?
""",
        "options": """
Current GROW Stage: Options

Explore multiple possibilities without judgment.
Ask questions like:
- What are all the ways you could approach this?
- What would you do if you had unlimited resources?
- What options haven't you considered yet?
""",
        "way_forward": """
Current GROW Stage: Way Forward

Help the user commit to specific actions.
Ask questions like:
- What will you do first?
- When will you start?
- How will you know you're making progress?
""",
        "complete": """
The user has completed the GROW process for this topic.
Help them reflect on their journey and maintain momentum.
"""
    }

    return guidance_map.get(grow_state, guidance_map["goal"])



def estimate_tokens(text: str) -> int:
    # Simple approximation for provider-agnostic token accounting.
    if not text:
        return 0
    return max(1, len(text) // 4)


def calculate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    # Approximate per-1M token pricing for Groq models only.
    # Legacy provider pricing removed as part of consolidation to Groq + Voyage.
    pricing = {
        "llama-3.3-70b-versatile": (0.59, 0.79),
        "llama-3.1-8b-instant": (0.05, 0.08),
        "deepseek-r1-distill-llama-70b": (0.99, 0.99),
    }
    input_rate, output_rate = pricing.get(model, (0.10, 0.10))
    return round((input_tokens / 1_000_000) * input_rate + (output_tokens / 1_000_000) * output_rate, 6)


async def log_model_usage(
    user_id: str,
    session_id: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
):
    try:
        supabase = await get_async_supabase_client()
        await (
            supabase.from_("model_usage_logs")
            .insert(
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "model": model,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": calculate_cost_usd(model, input_tokens, output_tokens),
                }
            )
            .execute()
        )
    except Exception as e:
        # Non-blocking: analytics failures should not impact chat UX.
        logger.warning("Failed to log model usage: %s", e)


async def get_user_firmness(user_id: str) -> int:
    """
    Get user's firmness level with caching.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Firmness level (0-10), defaults to 5
    """
    cache = get_cache()
    cache_key = make_user_firmness_key(user_id)

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - fetch from database
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("profiles")
        .select("firmness_level")
        .eq("id", user_id)
        .single()
        .execute()
    )

    firmness = 5  # Default
    if result.data and result.data.get("firmness_level") is not None:
        firmness = result.data["firmness_level"]

    # Cache the result
    cache.set(cache_key, firmness, TTL_USER_FIRMNESS)

    return firmness


async def get_coach_system_prompt(coach_id: str) -> str:
    """
    Get coach system prompt with caching.
    
    Args:
        coach_id: The coach's UUID
        
    Returns:
        The coach's system prompt
    """
    cache = get_cache()
    cache_key = make_coach_prompt_key(coach_id)

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - fetch from database
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("coaches")
        .select("system_prompt, name")
        .eq("id", coach_id)
        .single()
        .execute()
    )

    prompt = "You are a helpful life coach."  # Default
    if result.data:
        prompt = result.data.get("system_prompt", prompt)

    # Cache the result (coach prompts rarely change)
    cache.set(cache_key, prompt, TTL_COACH_PROMPT)

    return prompt


async def get_coach_info(coach_id: str) -> dict:
    """
    Get coach information including name and system prompt with caching.
    
    Args:
        coach_id: The UUID of the coach
        
    Returns:
        dict with 'name' and 'system_prompt' keys
    """
    cache = get_cache()
    cache_key = f"coach_info:{coach_id}"

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - fetch from database
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("coaches")
        .select("system_prompt, name")
        .eq("id", coach_id)
        .single()
        .execute()
    )

    coach_info = {
        "name": "General Coach",
        "system_prompt": "You are a helpful life coach."
    }

    if result.data:
        coach_info = {
            "name": result.data.get("name", "General Coach"),
            "system_prompt": result.data.get("system_prompt", "You are a helpful life coach.")
        }

    # Cache the result (coach info rarely changes)
    cache.set(cache_key, coach_info, TTL_COACH_PROMPT)

    return coach_info


async def get_user_context_text(user_id: str) -> str:
    """
    Get user context text with caching.
    
    Args:
        user_id: The user's UUID
        
    Returns:
        Formatted user context text
    """
    cache = get_cache()
    cache_key = make_user_context_key(user_id)

    # Try cache first
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        return cached_value

    # Cache miss - fetch from database
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("user_context")
        .select("category, content")
        .eq("user_id", user_id)
        .execute()
    )

    if not result.data:
        context_text = ""
    else:
        sections: dict[str, list[str]] = {}
        for item in result.data:
            cat = item["category"]
            sections.setdefault(cat, []).append(item["content"])

        lines = ["## User Context:"]
        for cat, items in sections.items():
            lines.append(f"**{cat.title()}**: {', '.join(items)}")
        context_text = "\n".join(lines)

    # Cache the result
    cache.set(cache_key, context_text, TTL_USER_CONTEXT)

    return context_text
async def get_conversation_insights(user_id: str, coach_id: str, limit: int = 3) -> str:
    """
    Retrieve relevant conversation insights for the user and coach.

    Args:
        user_id: The user's UUID
        coach_id: The coach's UUID
        limit: Maximum number of insights to retrieve (default: 3)

    Returns:
        Formatted insights text for system prompt
    """
    try:
        supabase = await get_async_supabase_client()

        # Query insights for this user and coach, ordered by confidence and recency
        result = await (
            supabase.from_("conversation_insights")
            .select("insight, confidence, created_at")
            .eq("user_id", user_id)
            .eq("coach_id", coach_id)
            .order("confidence", desc=True)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        if not result.data:
            return ""

        # Format insights for system prompt
        lines = ["## Past Insights from Previous Conversations:"]
        for idx, item in enumerate(result.data, 1):
            insight = item["insight"]
            confidence = item.get("confidence", 0.8)
            lines.append(f"{idx}. {insight} (confidence: {confidence:.1f})")

        return "\n".join(lines)

    except Exception as e:
        # Non-blocking: if insights retrieval fails, continue without them
        logger.warning("Error retrieving conversation insights: %s", e)
        return ""


async def get_conversation_history(session_id: str, limit: int = 20) -> list[dict]:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("messages")
        .select("role, content")
        .eq("chat_session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    if not result.data:
        return []
    return list(reversed(result.data))


async def get_grow_state(session_id: str) -> dict:
    """
    Retrieve the current GROW state for a chat session.
    
    Args:
        session_id: The UUID of the chat session
        
    Returns:
        dict with 'state' (str) and 'data' (dict) keys
        Defaults to 'goal' state if not set or session not found
    """
    try:
        supabase = await get_async_supabase_client()
        result = await (
            supabase.from_("chat_sessions")
            .select("grow_state, grow_data")
            .eq("id", session_id)
            .single()
            .execute()
        )

        if result.data:
            # Use 'or' to handle None values, not just missing keys
            return {
                "state": result.data.get("grow_state") or "goal",
                "data": result.data.get("grow_data") or {},
            }
    except Exception as e:
        # Log error but don't fail - return default state
        logger.warning("Error retrieving GROW state for session %s: %s", session_id, e)

    # Return default state if session not found or error occurred
    return {
        "state": "goal",
        "data": {},
    }

async def detect_stage_completion(session_id: str, user_message: str, assistant_response: str) -> dict:
    """
    Analyze the conversation to detect if the current GROW stage is complete.

    Args:
        session_id: The UUID of the chat session
        user_message: The user's latest message
        assistant_response: The assistant's response

    Returns:
        dict with 'should_advance' (bool) and 'next_state' (str) keys
    """
    ai_service = get_ai_service()

    # Get current GROW state
    grow_state_data = await get_grow_state(session_id)
    current_state = grow_state_data["state"]

    # Don't advance if already complete
    if current_state == "complete":
        return {"should_advance": False, "next_state": current_state}

    # Get recent conversation history for context
    history = await get_conversation_history(session_id, limit=10)
    conversation_context = "\n".join([
        f"{msg['role'].upper()}: {msg['content']}"
        for msg in history[-5:]  # Last 5 messages for context
    ])

    # Stage detection prompts from design doc
    stage_detection_questions = {
        "goal": "Has the user clearly articulated what they want to achieve?",
        "reality": "Has the user honestly assessed their current situation?",
        "options": "Has the user explored multiple possible approaches?",
        "way_forward": "Has the user committed to specific actions?",
    }

    # State progression map
    next_state_map = {
        "goal": "reality",
        "reality": "options",
        "options": "way_forward",
        "way_forward": "complete",
    }

    detection_question = stage_detection_questions.get(current_state)
    if not detection_question:
        return {"should_advance": False, "next_state": current_state}

    # Build detection prompt
    detection_prompt = f"""You are analyzing a coaching conversation to determine if the current GROW stage is complete.

Current GROW Stage: {current_state.upper()}

Recent conversation:
{conversation_context}

Latest exchange:
USER: {user_message}
ASSISTANT: {assistant_response}

Question: {detection_question}

Analyze the conversation and determine if this stage is sufficiently complete to move forward naturally.

Consider:
- Has the user provided enough depth and clarity for this stage?
- Does it feel natural to progress, or would it be forced?
- Is the user ready to move on, or do they need more exploration?

Respond with ONLY a JSON object in this exact format:
{{"should_advance": true/false, "reasoning": "brief explanation"}}"""

    try:
        # Use AIService to detect stage completion
        request = AIRequest(
            messages=[
                {"role": "system", "content": "You are a GROW coaching expert analyzing conversation progress. Respond only with valid JSON."},
                {"role": "user", "content": detection_prompt}
            ],
            temperature=0.2,
            max_tokens=150,
            model=MODEL_PRIMARY,
            stream=False
        )
        
        response = await ai_service.complete(request)
        result_text = response.content.strip()

        # Parse JSON response
        result = json.loads(result_text)
        should_advance = result.get("should_advance", False)

        if should_advance:
            next_state = next_state_map.get(current_state, current_state)
            return {
                "should_advance": True,
                "next_state": next_state,
                "reasoning": result.get("reasoning", "")
            }
        else:
            return {
                "should_advance": False,
                "next_state": current_state,
                "reasoning": result.get("reasoning", "")
            }

    except (AIServiceError, json.JSONDecodeError) as e:
        # If detection fails, don't advance - safer to stay in current stage
        logger.warning("Error detecting stage completion: %s", e)
        return {"should_advance": False, "next_state": current_state}


async def update_grow_state(session_id: str, new_state: str, reasoning: str = "") -> bool:
    """
    Update the GROW state for a chat session.

    Args:
        session_id: The UUID of the chat session
        new_state: The new GROW state to set
        reasoning: Optional reasoning for the state change

    Returns:
        bool indicating success
    """
    try:
        supabase = await get_async_supabase_client()

        # Get current state data
        current_data = await get_grow_state(session_id)
        grow_data = current_data.get("data", {})

        # Add transition record to grow_data
        if "transitions" not in grow_data:
            grow_data["transitions"] = []

        grow_data["transitions"].append({
            "from_state": current_data.get("state", "goal"),
            "to_state": new_state,
            "reasoning": reasoning,
            "timestamp": None  # Will be set by database
        })

        # Update database
        result = await (
            supabase.from_("chat_sessions")
            .update({
                "grow_state": new_state,
                "grow_data": grow_data,
                "grow_updated_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("id", session_id)
            .execute()
        )

        return result.data is not None

    except Exception as e:
        logger.error("Error updating GROW state for session %s: %s", session_id, e)
        return False



async def save_message(session_id: str, role: str, content: str) -> str:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("messages")
        .insert(
            {
                "chat_session_id": session_id,
                "role": role,
                "content": content,
            }
        )
        .select("id")
        .single()
        .execute()
    )
    if result.data and result.data.get("id"):
        return result.data["id"]
    raise RuntimeError("Message insert completed without returning an id")


async def _run_post_response_tasks(
    user_id: str,
    session_id: str,
    message: str,
    full_response: str,
    model: str,
    input_text: str,
    previous_grow_state: str,
) -> None:
    """Run non-critical tasks after the client already received the done event."""
    try:
        await log_model_usage(
            user_id=user_id,
            session_id=session_id,
            model=model,
            input_tokens=estimate_tokens(input_text),
            output_tokens=estimate_tokens(full_response),
        )
    except Exception as e:
        logger.warning("Failed to log usage for session %s: %s", session_id, e)

    try:
        detection_result = await detect_stage_completion(session_id, message, full_response)
        if detection_result.get("should_advance"):
            new_state = detection_result.get("next_state")
            reasoning = detection_result.get("reasoning", "")
            success = await update_grow_state(session_id, new_state, reasoning)
            if success:
                logger.info("GROW state advanced: %s -> %s", previous_grow_state, new_state)
    except Exception as e:
        logger.warning("Error in GROW stage detection: %s", e)


def build_multimodal_content(message: str, attachments: list | None) -> str | list:
    if not attachments:
        return message

    image_attachments = [a for a in attachments if a.get("type") == "image" and a.get("base64")]
    if not image_attachments:
        return message

    parts = [{"type": "text", "text": message}]
    for img in image_attachments:
        parts.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{img.get('mime_type', 'image/jpeg')};base64,{img['base64']}"
            },
        })
    return parts


async def stream_chat_response(
    user_id: str,
    session_id: str,
    coach_id: str,
    message: str,
    attachments: list | None = None,
):
    firmness = await get_user_firmness(user_id)
    coach_info = await get_coach_info(coach_id)
    coach_prompt = coach_info["system_prompt"]
    user_context = await get_user_context_text(user_id)
    memories = await retrieve_relevant_memories(user_id, message)
    memory_text = await format_memories_for_prompt(memories)
    insights_text = await get_conversation_insights(user_id, coach_id)
    history = await get_conversation_history(session_id)
    grow_state_data = await get_grow_state(session_id)

    persona = get_persona_prompt(firmness)
    grow_guidance = get_grow_stage_guidance(grow_state_data["state"])

    system_prompt = f"{coach_prompt}\n\n{persona}"
    if user_context:
        system_prompt += f"\n\n{user_context}"
    if memory_text:
        system_prompt += f"\n\n{memory_text}"
    if insights_text:
        system_prompt += f"\n\n{insights_text}"

    # Add GROW stage guidance
    system_prompt += f"\n\n{grow_guidance}"

    user_content = build_multimodal_content(message, attachments)

    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": user_content},
    ]

    full_response = ""

    # Initialize monitoring
    metrics_collector = get_metrics_collector()
    llm_start_time = time.time()
    llm_success = False
    llm_error = None
    
    # Get AIService instance
    ai_service = get_ai_service()
    
    try:
        # Use MODEL_PRIMARY with default temperature 0.7
        request = AIRequest(
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            model=MODEL_PRIMARY,
            stream=True
        )
        
        async for chunk in ai_service.stream_completion(request):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        # Successfully streamed
        llm_success = True
    except (AIServiceError, Exception) as e:
        llm_error = str(e)
        logger.error("Error streaming chat response with model=%s: %s", MODEL_PRIMARY, e)

    # Record LLM metrics
    llm_duration = time.time() - llm_start_time
    estimated_tokens = estimate_tokens(full_response) if full_response else 0
    metrics_collector.record_llm_call(
        model=MODEL_PRIMARY,
        tokens=estimated_tokens,
        success=llm_success,
        duration=llm_duration,
        error=llm_error if not llm_success else None,
    )

    if not llm_success:
        logger.error("Error streaming chat response with model=%s: %s", MODEL_PRIMARY, llm_error)
        yield f"data: {json.dumps({'type': 'error', 'message': 'AI service is not available at the moment. Please try again later.'})}\n\n"
        return

    if not full_response.strip():
        logger.warning("Empty response from AI for session %s — skipping save", session_id)
        yield f"data: {json.dumps({'type': 'error', 'message': 'The coach returned an empty response. Please try again.'})}\n\n"
        return

    saved_id = f"assistant-{uuid4()}"
    try:
        saved_id = await save_message(session_id, "assistant", full_response)
    except Exception as e:
        logger.error("Failed to persist assistant message for session %s: %s", session_id, e)

    yield f"data: {json.dumps({'type': 'done', 'messageId': saved_id})}\n\n"

    input_text = "\n".join([str(m.get("content", "")) for m in messages])
    asyncio.create_task(
        _run_post_response_tasks(
            user_id=user_id,
            session_id=session_id,
            message=message,
            full_response=full_response,
            model=MODEL_PRIMARY,
            input_text=input_text,
            previous_grow_state=grow_state_data["state"],
        )
    )
