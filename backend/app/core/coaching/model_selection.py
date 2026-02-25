"""
AI model selection logic.

WHY: Centralizes model selection strategy for consistency.
DESIGN: Pure functions based on context, no external dependencies.
TRADE-OFF: Hardcoded rules, but easy to test and modify.
"""

from .models import CoachType, ModelSelection


# Model identifiers (Groq only)
MODEL_FAST = "llama-3.1-8b-instant"
MODEL_COMPLEX = "llama-3.3-70b-versatile"
MODEL_REASONING = "deepseek-r1-distill-llama-70b"

# Temperature settings by model type
TEMPERATURE_REASONING = 0.2  # Low for logical tasks
TEMPERATURE_COMPLEX = 0.45   # Moderate for coaching
TEMPERATURE_FAST = 0.6       # Higher for creative responses

# Token limits
MAX_TOKENS_DEFAULT = 1024
MAX_TOKENS_LONG = 2048


def select_model_for_context(
    coach_type: CoachType,
    message_length: int,
    has_images: bool,
    conversation_depth: int
) -> ModelSelection:
    """
    Select appropriate AI model based on context.
    
    WHY: Optimizes cost vs quality trade-off.
    DESIGN: Rule-based selection with clear reasoning.
    TRADE-OFF: Not ML-based, but predictable and debuggable.
    
    Args:
        coach_type: Type of coaching session
        message_length: Length of user's message in characters
        has_images: Whether message contains images
        conversation_depth: Number of messages in conversation
        
    Returns:
        ModelSelection with primary model, fallbacks, and parameters
        
    Rules:
    1. Deep reasoning (strategic/systems + long message) -> REASONING model
    2. Complex coaching (leadership/EQ or images) -> COMPLEX model
    3. Simple queries -> FAST model
    4. Fallback order: COMPLEX -> FAST -> REASONING
    
    Examples:
        >>> # Strategic coach with long message
        >>> selection = select_model_for_context(
        ...     CoachType.STRATEGIC, 1500, False, 5
        ... )
        >>> assert selection.primary_model == MODEL_REASONING
        
        >>> # Quick question
        >>> selection = select_model_for_context(
        ...     CoachType.GENERAL, 100, False, 2
        ... )
        >>> assert selection.primary_model == MODEL_FAST
    """
    # Rule 1: Deep reasoning for strategic/systems with long messages
    if coach_type in [CoachType.STRATEGIC, CoachType.SYSTEMS]:
        if message_length > 1200 or conversation_depth > 14:
            return ModelSelection(
                primary_model=MODEL_REASONING,
                fallback_models=[MODEL_COMPLEX, MODEL_FAST],
                temperature=TEMPERATURE_REASONING,
                max_tokens=MAX_TOKENS_LONG,
                reasoning="Deep reasoning required for strategic/systems coaching with complex context"
            )

    # Rule 2: Complex model for leadership/EQ or images
    if has_images or coach_type in [CoachType.LEADERSHIP, CoachType.EQ] or message_length > 700:
        return ModelSelection(
            primary_model=MODEL_COMPLEX,
            fallback_models=[MODEL_FAST, MODEL_REASONING],
            temperature=TEMPERATURE_COMPLEX,
            max_tokens=MAX_TOKENS_DEFAULT,
            reasoning="Complex coaching or multimodal input requires capable model"
        )

    # Rule 3: Fast model for simple queries
    return ModelSelection(
        primary_model=MODEL_FAST,
        fallback_models=[MODEL_COMPLEX, MODEL_REASONING],
        temperature=TEMPERATURE_FAST,
        max_tokens=MAX_TOKENS_DEFAULT,
        reasoning="Simple query can use fast, cost-effective model"
    )


def get_fallback_chain(primary_model: str) -> list[str]:
    """
    Get ordered fallback models for a primary model.
    
    WHY: Ensures graceful degradation on API failures.
    DESIGN: Predefined fallback chains based on model capabilities.
    
    Args:
        primary_model: The primary model identifier
        
    Returns:
        Ordered list of fallback models (includes primary)
        
    Example:
        >>> chain = get_fallback_chain(MODEL_REASONING)
        >>> assert chain[0] == MODEL_REASONING
        >>> assert MODEL_COMPLEX in chain
    """
    fallback_chains = {
        MODEL_REASONING: [MODEL_REASONING, MODEL_COMPLEX, MODEL_FAST],
        MODEL_COMPLEX: [MODEL_COMPLEX, MODEL_FAST, MODEL_REASONING],
        MODEL_FAST: [MODEL_FAST, MODEL_COMPLEX, MODEL_REASONING],
    }

    return fallback_chains.get(primary_model, [MODEL_COMPLEX, MODEL_FAST])


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text.
    
    WHY: Needed for cost tracking and context window management.
    DESIGN: Simple approximation (4 chars ≈ 1 token).
    TRADE-OFF: Not exact, but fast and good enough for estimates.
    
    Args:
        text: Input text
        
    Returns:
        Estimated token count
        
    Example:
        >>> estimate_tokens("Hello world")
        3
        >>> estimate_tokens("")
        0
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int
) -> float:
    """
    Calculate cost in USD for model usage.
    
    WHY: Track and optimize AI spending.
    DESIGN: Per-1M token pricing from Groq.
    
    Args:
        model: Model identifier
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        
    Returns:
        Cost in USD (rounded to 6 decimals)
        
    Pricing (per 1M tokens):
    - llama-3.3-70b-versatile: $0.59 input, $0.79 output
    - llama-3.1-8b-instant: $0.05 input, $0.08 output
    - deepseek-r1-distill-llama-70b: $0.99 input, $0.99 output
    
    Example:
        >>> cost = calculate_cost(MODEL_FAST, 1000, 500)
        >>> assert cost < 0.001  # Very cheap
    """
    pricing = {
        MODEL_COMPLEX: (0.59, 0.79),
        MODEL_FAST: (0.05, 0.08),
        MODEL_REASONING: (0.99, 0.99),
    }

    input_rate, output_rate = pricing.get(model, (0.10, 0.10))

    input_cost = (input_tokens / 1_000_000) * input_rate
    output_cost = (output_tokens / 1_000_000) * output_rate

    return round(input_cost + output_cost, 6)
