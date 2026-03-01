import json
import logging

from app.services.groq_client import MODEL_REASONING
from app.services.ai_service import AIService, AIRequest
from app.config import get_settings

logger = logging.getLogger(__name__)

GOAL_PLANNER_SYSTEM = """You are an expert goal-setting coach. When given a goal description, 
you break it down into a structured, actionable plan.

You MUST respond with valid JSON only, following this exact structure:
{
  "title": "Clear, concise goal title",
  "description": "2-3 sentence description of the goal and why it matters",
  "difficulty": "easy|medium|hard|epic",
  "suggested_deadline": "YYYY-MM-DD or null",
  "subtasks": [
    {"title": "First concrete action step", "order": 1},
    {"title": "Second action step", "order": 2}
  ]
}

Guidelines:
- difficulty: easy (<1 week), medium (1-4 weeks), hard (1-3 months), epic (3+ months)
- subtasks: 3-7 specific, actionable steps. Each should be completable in 1-3 days.
- suggested_deadline: realistic estimate based on difficulty, or null if open-ended
- title: max 60 characters, action-oriented
"""


async def generate_goal_plan(goal_description: str, user_context: str | None = None) -> dict:
    """Generate a structured goal plan using the reasoning model.

    Args:
        goal_description: Free-text description of the user's goal.
        user_context: Optional additional context about the user.

    Returns:
        Parsed JSON dict with title, description, difficulty, deadline, subtasks.
    """
    settings = get_settings()
    ai = AIService(api_key=settings.groq_api_key)

    user_message = f"Goal: {goal_description}"
    if user_context:
        user_message += f"\n\nUser context: {user_context}"

    request = AIRequest(
        messages=[
            {"role": "system", "content": GOAL_PLANNER_SYSTEM},
            {"role": "user", "content": user_message},
        ],
        temperature=0.2,
        max_tokens=1024,
        model=MODEL_REASONING,
        stream=False,
    )
    response = await ai.complete(request)

    if not response.success:
        logger.warning("Goal plan generation failed: %s", response.error)
        raise RuntimeError(f"Goal planning failed: {response.error}")

    return json.loads(response.content)
