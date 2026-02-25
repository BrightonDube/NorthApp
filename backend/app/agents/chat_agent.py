import json
from groq import AsyncGroq
from app.config import get_settings
from app.services.supabase import get_async_supabase_client
from app.services.rag import retrieve_relevant_memories, format_memories_for_prompt

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
def get_coach_type_from_name(coach_name: str) -> str:
    """
    Map coach name to coach type for model selection.

    Args:
        coach_name: The name of the coach (e.g., "Strategy Coach")

    Returns:
        Coach type string: "strategic", "systems", "leadership", "eq", or "general"
    """
    coach_name_lower = coach_name.lower()

    if "strategy" in coach_name_lower or "strategic" in coach_name_lower:
        return "strategic"
    elif "systems" in coach_name_lower or "system" in coach_name_lower:
        return "systems"
    elif "leadership" in coach_name_lower:
        return "leadership"
    elif "eq" in coach_name_lower or "emotional" in coach_name_lower:
        return "eq"
    else:
        return "general"


def select_model(
    coach_type: str,
    message_length: int,
    has_images: bool,
    conversation_depth: int = 0,
) -> str:
    """
    Select the appropriate LLM model based on context.

    Args:
        coach_type: Type of coach ("strategic", "systems", "leadership", "eq", "general")
        message_length: Length of the user's message in characters
        has_images: Whether the message contains images
        conversation_depth: Number of messages in the conversation

    Returns:
        Model identifier string for the LLM API
    """
    # Multimodal requests require vision-capable models
    if has_images:
        return "meta-llama/llama-4-scout-17b-16e-instruct"

    # Complex reasoning for strategic/systems coaches with long messages.
    # NOTE: Claude integration is pending; callers should fall back if provider unavailable.
    if coach_type in ["strategic", "systems"] and message_length > 1000:
        return "claude-3-5-sonnet-20241022"

    # High-context conversations for leadership/EQ coaches.
    # NOTE: Gemini integration is pending; callers should fall back if provider unavailable.
    if coach_type in ["leadership", "eq"] and conversation_depth > 10:
        return "gemini-1.5-flash"

    # Standard coaching - default to Groq Llama 4 Scout
    return "meta-llama/llama-4-scout-17b-16e-instruct"


def resolve_runtime_model(selected_model: str) -> str:
    """
    Resolve a selected model to one currently supported by the active runtime.

    The chat runtime currently uses Groq only. If a routing rule selects a
    model for a provider that is not integrated yet, we degrade gracefully to
    the default Groq model instead of failing the entire request.
    """
    groq_default = "meta-llama/llama-4-scout-17b-16e-instruct"
    if selected_model.startswith("claude-") or selected_model.startswith("gemini-"):
        return groq_default
    return selected_model


def get_runtime_fallback_models(selected_model: str) -> list[str]:
    """
    Build ordered runtime fallback models.

    The first model is the selected runtime model. If that fails, we try known
    stable Groq alternatives before giving up.
    """
    candidates = [
        resolve_runtime_model(selected_model),
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ]
    deduped: list[str] = []
    for model in candidates:
        if model and model not in deduped:
            deduped.append(model)
    return deduped


async def get_user_firmness(user_id: str) -> int:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("profiles")
        .select("firmness_level")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if result.data and result.data.get("firmness_level") is not None:
        return result.data["firmness_level"]
    return 5


async def get_coach_system_prompt(coach_id: str) -> str:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("coaches")
        .select("system_prompt, name")
        .eq("id", coach_id)
        .single()
        .execute()
    )
    if result.data:
        return result.data.get("system_prompt", "You are a helpful life coach.")
    return "You are a helpful life coach."


async def get_coach_info(coach_id: str) -> dict:
    """
    Get coach information including name and system prompt.
    
    Args:
        coach_id: The UUID of the coach
        
    Returns:
        dict with 'name' and 'system_prompt' keys
    """
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("coaches")
        .select("system_prompt, name")
        .eq("id", coach_id)
        .single()
        .execute()
    )
    if result.data:
        return {
            "name": result.data.get("name", "General Coach"),
            "system_prompt": result.data.get("system_prompt", "You are a helpful life coach.")
        }
    return {
        "name": "General Coach",
        "system_prompt": "You are a helpful life coach."
    }


async def get_user_context_text(user_id: str) -> str:
    supabase = await get_async_supabase_client()
    result = await (
        supabase.from_("user_context")
        .select("category, content")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return ""

    sections: dict[str, list[str]] = {}
    for item in result.data:
        cat = item["category"]
        sections.setdefault(cat, []).append(item["content"])

    lines = ["## User Context:"]
    for cat, items in sections.items():
        lines.append(f"**{cat.title()}**: {', '.join(items)}")
    return "\n".join(lines)


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
        print(f"Error retrieving GROW state for session {session_id}: {e}")
    
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
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

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
        # Use LLM to detect stage completion
        response = await client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": "You are a GROW coaching expert analyzing conversation progress. Respond only with valid JSON."},
                {"role": "user", "content": detection_prompt}
            ],
            temperature=0.3,  # Lower temperature for more consistent analysis
            max_tokens=150,
        )

        result_text = response.choices[0].message.content.strip()

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

    except Exception as e:
        # If detection fails, don't advance - safer to stay in current stage
        print(f"Error detecting stage completion: {e}")
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
                "grow_updated_at": "now()"
            })
            .eq("id", session_id)
            .execute()
        )

        return result.data is not None

    except Exception as e:
        print(f"Error updating GROW state for session {session_id}: {e}")
        return False



async def save_message(session_id: str, role: str, content: str) -> str:
    supabase = await get_async_supabase_client()
    result = await supabase.from_("messages").insert({"chat_session_id": session_id, "role": role, "content": content}).execute()
    if result.data and len(result.data) > 0:
        return result.data[0].get("id", "")
    return ""


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
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    firmness = await get_user_firmness(user_id)
    coach_info = await get_coach_info(coach_id)
    coach_prompt = coach_info["system_prompt"]
    coach_name = coach_info["name"]
    user_context = await get_user_context_text(user_id)
    memories = await retrieve_relevant_memories(user_id, message)
    memory_text = await format_memories_for_prompt(memories)
    history = await get_conversation_history(session_id)
    grow_state_data = await get_grow_state(session_id)

    persona = get_persona_prompt(firmness)
    grow_guidance = get_grow_stage_guidance(grow_state_data["state"])
    
    system_prompt = f"{coach_prompt}\n\n{persona}"
    if user_context:
        system_prompt += f"\n\n{user_context}"
    if memory_text:
        system_prompt += f"\n\n{memory_text}"
    
    # Add GROW stage guidance
    system_prompt += f"\n\n{grow_guidance}"

    user_content = build_multimodal_content(message, attachments)

    has_images = isinstance(user_content, list)
    
    # Intelligent model selection
    coach_type = get_coach_type_from_name(coach_name)
    conversation_depth = len(history)
    selected_model = select_model(
        coach_type=coach_type,
        message_length=len(message),
        has_images=has_images,
        conversation_depth=conversation_depth,
    )
    model_candidates = get_runtime_fallback_models(selected_model)

    messages = [
        {"role": "system", "content": system_prompt},
        *history,
        {"role": "user", "content": user_content},
    ]

    full_response = ""

    stream_errors: list[str] = []
    for model in model_candidates:
        try:
            async with client.chat.completions.stream(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            ) as stream:
                async for chunk in stream:
                    delta = chunk.choices[0].delta.content if chunk.choices else None
                    if delta:
                        full_response += delta
                        yield f"data: {json.dumps({'type': 'token', 'data': delta})}\n\n"
            # Successfully streamed with this model.
            break
        except Exception as e:
            stream_errors.append(f"{model}: {e}")
            print(f"Error streaming chat response with model={model}: {e}")
            continue
    else:
        print(
            f"Error streaming chat response (selected={selected_model}). "
            f"Attempts: {' | '.join(stream_errors)}"
        )
        yield f"data: {json.dumps({'type': 'error', 'data': {'message': 'AI service is not available at the moment. Please try again later.'}})}\n\n"
        return

    saved_id = await save_message(session_id, "assistant", full_response)
    
    # Detect if GROW stage should advance
    try:
        detection_result = await detect_stage_completion(session_id, message, full_response)
        if detection_result.get("should_advance"):
            new_state = detection_result.get("next_state")
            reasoning = detection_result.get("reasoning", "")
            success = await update_grow_state(session_id, new_state, reasoning)
            if success:
                print(f"GROW state advanced: {grow_state_data['state']} -> {new_state}")
    except Exception as e:
        # Don't fail the response if stage detection fails
        print(f"Error in GROW stage detection: {e}")
    
    yield f"data: {json.dumps({'type': 'done', 'data': {'messageId': saved_id}})}\n\n"
