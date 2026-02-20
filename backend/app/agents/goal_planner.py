import json
from groq import AsyncGroq
from app.config import get_settings

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
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    user_message = f"Goal: {goal_description}"
    if user_context:
        user_message += f"\n\nUser context: {user_context}"

    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "system", "content": GOAL_PLANNER_SYSTEM},
            {"role": "user", "content": user_message},
        ],
        temperature=0.4,
        max_tokens=1024,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
