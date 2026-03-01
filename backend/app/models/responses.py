from pydantic import BaseModel
from typing import Literal


class MemoryResponse(BaseModel):
    id: str
    content: str
    category: str
    importance: str
    created_at: str


class SubtaskResponse(BaseModel):
    id: str
    goal_id: str
    title: str
    status: str
    order_index: int
    due_date: str | None
    created_at: str
    completed_at: str | None


class GoalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str | None
    category: str
    deadline: str | None
    status: str
    difficulty: str
    progress: int
    coach_id: str | None
    created_at: str
    updated_at: str
    subtasks: list[SubtaskResponse] = []


class XPResponse(BaseModel):
    xp_earned: int
    total_xp: int
    level: int
    leveled_up: bool = False


class SettingsResponse(BaseModel):
    firmness_level: int
    user_id: str
    voice_enabled: bool = False


class TranscriptResponse(BaseModel):
    text: str


class GoalPlanResponse(BaseModel):
    title: str
    description: str
    difficulty: str
    suggested_deadline: str | None
    subtasks: list[dict]


class GrowStateResponse(BaseModel):
    state: Literal["goal", "reality", "options", "way_forward", "complete"]
    data: dict
    updated_at: str | None = None


class CheckInResponse(BaseModel):
    id: str
    user_id: str
    mood: int
    energy: int
    priorities: list[str]
    # reflection and gratitude are nullable in the database schema; default to
    # empty string so Pydantic validation never fails on a NULL value.
    reflection: str = ""
    gratitude: str = ""
    type: Literal["morning", "evening"]
    created_at: str
