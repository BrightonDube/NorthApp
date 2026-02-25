"""
Core domain models for coaching.

WHY: Centralized domain models ensure consistency and type safety.
DESIGN: Pydantic models for validation and serialization.
"""

from enum import Enum
from pydantic import BaseModel, Field


class GrowStage(str, Enum):
    """
    GROW model stages.
    
    WHY: Enum ensures type safety and prevents invalid states.
    """
    GOAL = "goal"
    REALITY = "reality"
    OPTIONS = "options"
    WAY_FORWARD = "way_forward"
    COMPLETE = "complete"


class CoachType(str, Enum):
    """
    Coach specialization types.
    
    WHY: Used for intelligent model selection.
    """
    STRATEGIC = "strategic"
    SYSTEMS = "systems"
    LEADERSHIP = "leadership"
    EQ = "eq"
    GENERAL = "general"


class Message(BaseModel):
    """
    Chat message model.
    
    WHY: Standardized message format across all AI providers.
    """
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str | list = Field(..., description="Message content (text or multimodal)")


class StreamChunk(BaseModel):
    """
    Streaming response chunk.
    
    WHY: Standardized streaming format for frontend consumption.
    """
    type: str = Field(..., description="Chunk type: token, done, or error")
    data: str | dict = Field(..., description="Chunk data")


class CoachingContext(BaseModel):
    """
    Complete context for a coaching session.
    
    WHY: Encapsulates all data needed for prompt construction.
    DESIGN: Immutable data class for thread safety.
    """
    coach_prompt: str
    coach_name: str
    coach_type: CoachType
    user_context: str
    memories: str
    grow_stage: GrowStage
    grow_data: dict
    firmness_level: int = Field(ge=0, le=10)
    conversation_history: list[Message]

    class Config:
        frozen = True  # Immutable


class ModelSelection(BaseModel):
    """
    AI model selection result.
    
    WHY: Encapsulates model selection logic output.
    """
    primary_model: str
    fallback_models: list[str]
    temperature: float = Field(ge=0.0, le=2.0)
    max_tokens: int = Field(gt=0)
    reasoning: str  # Why this model was selected
