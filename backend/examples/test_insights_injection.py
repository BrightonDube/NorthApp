"""
Example script demonstrating conversation insights injection
Shows how past insights are retrieved and injected into new conversations
"""
import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


async def demonstrate_insights_injection():
    """
    Demonstrates the complete insights injection flow:
    1. User has previous conversation with insights
    2. User starts new conversation
    3. System retrieves past insights
    4. Insights are injected into system prompt
    """
    print("=" * 80)
    print("CONVERSATION INSIGHTS INJECTION DEMONSTRATION")
    print("=" * 80)
    print()
    
    # Import the function
    from app.agents.chat_agent import get_conversation_insights
    
    # Simulate user and coach IDs
    user_id = "user-123"
    coach_id = "strategic-thinking-coach"
    
    print(f"User ID: {user_id}")
    print(f"Coach ID: {coach_id}")
    print()
    
    # Mock Supabase to return sample insights
    mock_supabase = AsyncMock()
    mock_result = MagicMock()
    mock_result.data = [
        {
            "insight": "User realized they procrastinate due to fear of failure",
            "confidence": 0.9,
            "created_at": "2026-02-24T10:30:00Z"
        },
        {
            "insight": "User prefers morning work sessions for deep focus",
            "confidence": 0.85,
            "created_at": "2026-02-23T15:20:00Z"
        },
        {
            "insight": "User struggles with setting boundaries at work",
            "confidence": 0.8,
            "created_at": "2026-02-22T09:15:00Z"
        }
    ]
    
    # Create proper mock chain
    mock_execute = AsyncMock(return_value=mock_result)
    mock_limit = MagicMock()
    mock_limit.execute = mock_execute
    mock_order_created = MagicMock()
    mock_order_created.limit = MagicMock(return_value=mock_limit)
    mock_order_confidence = MagicMock()
    mock_order_confidence.order = MagicMock(return_value=mock_order_created)
    mock_eq_coach = MagicMock()
    mock_eq_coach.order = MagicMock(return_value=mock_order_confidence)
    mock_eq_user = MagicMock()
    mock_eq_user.eq = MagicMock(return_value=mock_eq_coach)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq_user)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    mock_supabase.from_ = MagicMock(return_value=mock_from)
    
    print("SCENARIO: User returns for a new coaching session")
    print("-" * 80)
    print()
    
    print("Previous Sessions:")
    print("  Week 1: Discussed procrastination and fear of failure")
    print("  Week 2: Explored optimal work schedules")
    print("  Week 3: Worked on workplace boundaries")
    print()
    
    print("Insights Extracted from Previous Sessions:")
    for idx, insight in enumerate(mock_result.data, 1):
        print(f"  {idx}. {insight['insight']}")
        print(f"     Confidence: {insight['confidence']}")
        print(f"     Date: {insight['created_at']}")
        print()
    
    print("=" * 80)
    print("RETRIEVING INSIGHTS FOR NEW CONVERSATION")
    print("=" * 80)
    print()
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        insights_text = await get_conversation_insights(user_id, coach_id)
    
    print("Insights Retrieved and Formatted:")
    print("-" * 80)
    print(insights_text)
    print("-" * 80)
    print()
    
    print("=" * 80)
    print("SYSTEM PROMPT CONSTRUCTION")
    print("=" * 80)
    print()
    
    # Simulate system prompt building
    coach_prompt = "You are a strategic thinking coach helping users develop long-term plans."
    persona = "You are a balanced coach — warm and supportive, but willing to challenge."
    user_context = "## User Context:\n**Goals**: Launch a startup, Improve time management"
    memory_text = "## Recent Memories:\n- User mentioned feeling overwhelmed with tasks"
    grow_guidance = "Current GROW Stage: Goal\nGuide the user to clarify what they truly want to achieve."
    
    system_prompt = f"{coach_prompt}\n\n{persona}"
    if user_context:
        system_prompt += f"\n\n{user_context}"
    if memory_text:
        system_prompt += f"\n\n{memory_text}"
    if insights_text:
        system_prompt += f"\n\n{insights_text}"
    system_prompt += f"\n\n{grow_guidance}"
    
    print("Complete System Prompt:")
    print("-" * 80)
    print(system_prompt)
    print("-" * 80)
    print()
    
    print("=" * 80)
    print("BENEFITS OF INSIGHTS INJECTION")
    print("=" * 80)
    print()
    print("✓ Coach has context from previous sessions")
    print("✓ User doesn't need to repeat past realizations")
    print("✓ Conversation builds on previous progress")
    print("✓ Coaching feels continuous and personalized")
    print("✓ Insights filtered by coach for relevance")
    print("✓ Top 3 most confident insights prioritized")
    print()
    
    print("=" * 80)
    print("DEMONSTRATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(demonstrate_insights_injection())
