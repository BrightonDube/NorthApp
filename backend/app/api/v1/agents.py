from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user, AuthUser
from app.models.requests import GoalPlanRequest, PanicRequest
from app.models.responses import GoalPlanResponse
from app.agents.goal_planner import generate_goal_plan
from app.agents.panic_agent import stream_panic_response
from app.agents.curator_agent import curate_resources
from app.agents.proactive_agent import get_user_context_summary

router = APIRouter()


@router.post("/agent/plan", response_model=GoalPlanResponse)
async def plan_goal(
    body: GoalPlanRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Generate an AI-powered goal plan with subtasks and timeline.
    
    Uses AI to break down a high-level goal into actionable subtasks with suggested
    difficulty, deadline, and implementation strategy. Considers user context for
    personalized recommendations.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    ```json
    {
      "goal_description": "Launch a successful side project in 3 months",
      "context": "I'm a full-time software engineer with 10 hours/week available"
    }
    ```
    
    **Required Fields:**
    - `goal_description` (string): High-level goal description
    
    **Optional Fields:**
    - `context` (string): Additional context (constraints, resources, preferences)
      - If not provided, system retrieves user's stored context automatically
    
    **Response:**
    ```json
    {
      "title": "Launch Side Project MVP",
      "description": "Build and ship a minimum viable product in 3 months",
      "difficulty": "hard",
      "suggested_deadline": "2026-05-24T00:00:00Z",
      "subtasks": [
        {
          "title": "Define MVP features and scope",
          "order_index": 0,
          "due_date": "2026-03-01T00:00:00Z"
        },
        {
          "title": "Set up development environment",
          "order_index": 1,
          "due_date": "2026-03-05T00:00:00Z"
        },
        {
          "title": "Build core functionality",
          "order_index": 2,
          "due_date": "2026-04-15T00:00:00Z"
        }
      ]
    }
    ```
    
    **AI Planning Features:**
    - Breaks goals into 3-8 actionable subtasks
    - Suggests realistic timelines
    - Considers user constraints
    - Recommends appropriate difficulty level
    - Sequences tasks logically
    
    **Error Codes:**
    - `400 Bad Request`: Invalid or missing goal description
    - `401 Unauthorized`: Invalid or missing JWT token
    - `503 Service Unavailable`: LLM API temporarily unavailable
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/agent/plan" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{
        "goal_description": "Get fit and run a 5K",
        "context": "Beginner runner, 30 minutes available 3x/week"
      }'
    ```
    
    **Tips:**
    - Be specific in goal description
    - Include constraints in context
    - Review and adjust AI suggestions
    - Use as starting point, not final plan
    
    **Workflow:**
    1. Call this endpoint to generate plan
    2. Review and adjust subtasks
    3. Create goal via `POST /v1/goals`
    4. Add subtasks via `POST /v1/goals/{id}/subtasks`
    
    **Related Endpoints:**
    - `POST /v1/goals` - Create goal from plan
    - `POST /v1/goals/{id}/subtasks` - Add subtasks
    """
    context = body.context
    if not context:
        context = await get_user_context_summary(user.id)

    plan = await generate_goal_plan(body.goal_description, context)
    return GoalPlanResponse(**plan)


@router.post("/agent/panic")
async def panic_mode(
    body: PanicRequest,
    user: AuthUser = Depends(get_current_user),
):
    """
    Activate crisis support mode for immediate emotional support.
    
    Provides immediate, compassionate support during moments of crisis or overwhelm.
    Streams calming, grounding responses and offers crisis resources when appropriate.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Request Body:**
    ```json
    {
      "initial_message": "I'm feeling completely overwhelmed and don't know what to do"
    }
    ```
    
    **Optional Fields:**
    - `initial_message` (string): User's initial crisis message
      - If not provided, agent starts with supportive greeting
    
    **Response:** Server-Sent Events stream
    - Content-Type: `text/event-stream`
    - Streams compassionate, grounding responses
    - May include crisis resources if needed
    
    **Panic Agent Features:**
    - Immediate emotional validation
    - Grounding techniques
    - Crisis resource recommendations
    - Non-judgmental support
    - Encourages professional help when appropriate
    
    **Crisis Detection:**
    - Keywords: "suicide", "self-harm", "end it all"
    - Sentiment analysis below threshold
    - Explicit requests for help
    
    **Crisis Resources Provided:**
    - National Suicide Prevention Lifeline: 988
    - Crisis Text Line: Text HOME to 741741
    - International resources based on location
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `503 Service Unavailable`: LLM API temporarily unavailable
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/agent/panic" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
      -H "Content-Type: application/json" \\
      -d '{
        "initial_message": "Everything feels like too much right now"
      }'
    ```
    
    **Important Notes:**
    - This is NOT a replacement for professional help
    - In true emergencies, call 911 or local emergency services
    - Agent encourages seeking professional support
    - All panic mode sessions are logged for safety
    
    **Response Style:**
    - Calm, grounding tone
    - Short, digestible messages
    - Validates feelings without judgment
    - Offers practical coping strategies
    - Maintains hope and perspective
    
    **Related Endpoints:**
    - `POST /v1/chat/stream` - Regular coaching conversations
    """
    return StreamingResponse(
        stream_panic_response(
            user_id=user.id,
            initial_message=body.initial_message,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/agent/curate")
async def curate(
    query: str,
    user: AuthUser = Depends(get_current_user),
):
    """
    Curate personalized resources (articles, books, tools) based on user query.
    
    Uses AI to recommend relevant resources tailored to user's context, goals, and
    current challenges. Provides curated learning materials and tools.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Query Parameters:**
    - `query` (string, required): What resources to find
    
    **Response:**
    ```json
    {
      "resources": [
        {
          "title": "Deep Work by Cal Newport",
          "type": "book",
          "description": "Strategies for focused work in a distracted world",
          "url": "https://example.com/deep-work",
          "relevance": "Addresses your goal of improving productivity"
        },
        {
          "title": "Pomodoro Technique Guide",
          "type": "article",
          "description": "Time management method for sustained focus",
          "url": "https://example.com/pomodoro",
          "relevance": "Practical tool for your 10-hour weekly constraint"
        }
      ],
      "context_used": "Based on your goal to launch a side project with limited time"
    }
    ```
    
    **Resource Types:**
    - `book`: Recommended reading
    - `article`: Blog posts, guides
    - `tool`: Software, apps, frameworks
    - `course`: Online courses, tutorials
    - `podcast`: Audio content
    - `video`: Video tutorials, talks
    
    **Curation Features:**
    - Personalized to user context
    - Considers current goals
    - Filters by relevance
    - Provides actionable recommendations
    - Explains why each resource is relevant
    
    **Error Codes:**
    - `400 Bad Request`: Missing or invalid query
    - `401 Unauthorized`: Invalid or missing JWT token
    - `503 Service Unavailable`: LLM API temporarily unavailable
    
    **Example Usage:**
    ```bash
    curl -X POST "https://api.example.com/v1/agent/curate?query=time%20management%20for%20busy%20professionals" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Query Examples:**
    - "Books on strategic thinking"
    - "Tools for habit tracking"
    - "Courses on public speaking"
    - "Articles about overcoming procrastination"
    - "Podcasts on leadership"
    
    **Tips:**
    - Be specific in your query
    - Mention your context if relevant
    - Review multiple recommendations
    - Start with highest relevance items
    
    **Related Endpoints:**
    - `POST /v1/chat/stream` - Discuss resources with coach
    - `GET /v1/goals` - View goals that inform curation
    """
    context = await get_user_context_summary(user.id)
    result = await curate_resources(query, context)
    return result
