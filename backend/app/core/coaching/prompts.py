"""
Prompt construction logic.

WHY: Separates prompt building from data fetching and AI calls.
DESIGN: Pure functions for easy testing and reuse.
TRADE-OFF: More verbose, but testable without mocks.
"""

from .models import GrowStage, CoachingContext


# Persona prompts based on firmness level
PERSONA_GENTLE = (
    "You are an extremely supportive and gentle coach. "
    "Always validate feelings first. Never push back or challenge. "
    "Offer encouragement and gentle suggestions only."
)

PERSONA_BALANCED = (
    "You are a balanced coach — warm and supportive, but willing to "
    "challenge the user when needed. You celebrate wins and gently "
    "call out excuses. You ask powerful questions."
)

PERSONA_TOUGH = (
    "You are a tough-love coach. No excuses accepted. "
    "You hold the user to their commitments, call out self-sabotage directly, "
    "and push them to do better. You still care — but you show it through honesty."
)

# GROW stage guidance
GROW_GUIDANCE = {
    GrowStage.GOAL: """
Current GROW Stage: Goal

Guide the user to clarify what they truly want to achieve.
Ask questions like:
- What would success look like?
- Why is this important to you?
- What would change if you achieved this?
""",
    GrowStage.REALITY: """
Current GROW Stage: Reality

Help the user assess their current situation honestly.
Ask questions like:
- What's happening right now?
- What have you tried so far?
- What resources do you have available?
""",
    GrowStage.OPTIONS: """
Current GROW Stage: Options

Explore multiple possibilities without judgment.
Ask questions like:
- What are all the ways you could approach this?
- What would you do if you had unlimited resources?
- What options haven't you considered yet?
""",
    GrowStage.WAY_FORWARD: """
Current GROW Stage: Way Forward

Help the user commit to specific actions.
Ask questions like:
- What will you do first?
- When will you start?
- How will you know you're making progress?
""",
    GrowStage.COMPLETE: """
The user has completed the GROW process for this topic.
Help them reflect on their journey and maintain momentum.
"""
}


def get_persona_for_firmness(firmness_level: int) -> str:
    """
    Get coaching persona based on firmness level.
    
    WHY: Separates persona logic from prompt construction.
    
    Args:
        firmness_level: User's firmness preference (0-10)
        
    Returns:
        Persona prompt text
        
    Examples:
        >>> get_persona_for_firmness(2)
        'You are an extremely supportive...'
        >>> get_persona_for_firmness(5)
        'You are a balanced coach...'
        >>> get_persona_for_firmness(9)
        'You are a tough-love coach...'
    """
    if firmness_level <= 3:
        return PERSONA_GENTLE
    elif firmness_level <= 7:
        return PERSONA_BALANCED
    else:
        return PERSONA_TOUGH


def get_grow_guidance(stage: GrowStage) -> str:
    """
    Get GROW stage-specific guidance.
    
    WHY: Centralizes GROW guidance text.
    
    Args:
        stage: Current GROW stage
        
    Returns:
        Stage-specific guidance text
    """
    return GROW_GUIDANCE.get(stage, GROW_GUIDANCE[GrowStage.GOAL])


def build_system_prompt(context: CoachingContext) -> str:
    """
    Build complete system prompt from coaching context.
    
    WHY: Pure function makes testing trivial.
    DESIGN: Takes all inputs as parameters, returns string.
    TRADE-OFF: More parameters, but no hidden dependencies.
    
    Args:
        context: Complete coaching context
        
    Returns:
        Formatted system prompt
        
    Example:
        >>> context = CoachingContext(...)
        >>> prompt = build_system_prompt(context)
        >>> assert "You are" in prompt
        >>> assert context.coach_prompt in prompt
    """
    # Start with coach's base prompt
    sections = [context.coach_prompt]

    # Add persona based on firmness
    persona = get_persona_for_firmness(context.firmness_level)
    sections.append(persona)

    # Add user context if available
    if context.user_context:
        sections.append(f"## User Context:\n{context.user_context}")

    # Add relevant memories if available
    if context.memories:
        sections.append(f"## Relevant Memories:\n{context.memories}")

    # Add GROW stage guidance
    grow_guidance = get_grow_guidance(context.grow_stage)
    sections.append(grow_guidance)

    # Join all sections with double newlines
    return "\n\n".join(sections)


def format_user_context(context_items: list[dict]) -> str:
    """
    Format user context items into prompt text.
    
    WHY: Separates formatting logic from data fetching.
    
    Args:
        context_items: List of {category, content} dicts
        
    Returns:
        Formatted context text
        
    Example:
        >>> items = [
        ...     {"category": "goals", "content": "Launch startup"},
        ...     {"category": "challenges", "content": "Time management"}
        ... ]
        >>> text = format_user_context(items)
        >>> assert "Goals: Launch startup" in text
    """
    if not context_items:
        return ""

    # Group by category
    by_category: dict[str, list[str]] = {}
    for item in context_items:
        category = item["category"]
        content = item["content"]
        by_category.setdefault(category, []).append(content)

    # Format as sections
    lines = []
    for category, contents in by_category.items():
        formatted_category = category.replace("_", " ").title()
        formatted_contents = ", ".join(contents)
        lines.append(f"**{formatted_category}**: {formatted_contents}")

    return "\n".join(lines)


def format_memories(memories: list[dict]) -> str:
    """
    Format memory items into prompt text.
    
    WHY: Separates formatting from retrieval logic.
    
    Args:
        memories: List of memory dicts with 'content' key
        
    Returns:
        Formatted memories text
        
    Example:
        >>> memories = [
        ...     {"content": "User prefers morning work"},
        ...     {"content": "Struggles with delegation"}
        ... ]
        >>> text = format_memories(memories)
        >>> assert "morning work" in text
    """
    if not memories:
        return ""

    memory_texts = [m["content"] for m in memories if m.get("content")]
    if not memory_texts:
        return ""

    return "\n".join(f"- {text}" for text in memory_texts)
