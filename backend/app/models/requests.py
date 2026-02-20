from pydantic import BaseModel, Field
from typing import Literal


class InlineAttachment(BaseModel):
    name: str
    type: Literal["image", "document"]
    mime_type: str
    base64: str | None = None


class ChatRequest(BaseModel):
    session_id: str
    coach_id: str
    message: str
    attachments: list[InlineAttachment] | None = None


class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"


class CreateGoalRequest(BaseModel):
    title: str
    description: str | None = None
    category: str = "personal"
    deadline: str | None = None
    difficulty: Literal["easy", "medium", "hard", "epic"] = "medium"
    coach_id: str | None = None


class UpdateGoalRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    status: Literal["active", "completed", "paused", "abandoned"] | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    deadline: str | None = None


class CreateSubtaskRequest(BaseModel):
    title: str
    due_date: str | None = None
    order_index: int = 0


class UpdateSubtaskRequest(BaseModel):
    title: str | None = None
    status: Literal["pending", "in_progress", "completed", "blocked"] | None = None


class UpdateSettingsRequest(BaseModel):
    firmness_level: int | None = Field(default=None, ge=0, le=10)


class GoalPlanRequest(BaseModel):
    goal_description: str
    context: str | None = None


class PanicRequest(BaseModel):
    initial_message: str | None = None
