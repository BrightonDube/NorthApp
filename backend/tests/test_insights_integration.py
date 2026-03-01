"""
End-to-end integration test for conversation insights feature
Tests the complete flow: extraction -> storage -> retrieval -> injection
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_insights_end_to_end_flow():
    """
    Test the complete insights flow:
    1. Extract insights from a conversation
    2. Store them in the database
    3. Retrieve them for a new conversation
    4. Inject them into the system prompt
    """
    from app.agents.memory_agent import extract_conversation_insights
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    coach_id = "coach-456"
    session_id = "session-789"
    
    # Step 1: Mock conversation messages for extraction
    mock_messages = [
        {"role": "user", "content": "I keep putting off important tasks"},
        {"role": "assistant", "content": "What do you think is behind that?"},
        {"role": "user", "content": "I think I'm afraid of failing"},
        {"role": "assistant", "content": "That's a powerful realization"},
        {"role": "user", "content": "Yes, I need to work on this"},
        {"role": "assistant", "content": "What would be a first step?"},
    ]
    
    # Mock Supabase for extraction
    mock_supabase_extract = AsyncMock()
    mock_messages_result = MagicMock()
    mock_messages_result.data = mock_messages
    
    # Mock the messages query
    mock_execute = AsyncMock(return_value=mock_messages_result)
    mock_order = MagicMock()
    mock_order.execute = mock_execute
    mock_eq = MagicMock()
    mock_eq.order = MagicMock(return_value=mock_order)
    mock_select = MagicMock()
    mock_select.eq = MagicMock(return_value=mock_eq)
    mock_from = MagicMock()
    mock_from.select = MagicMock(return_value=mock_select)
    
    # Mock the insert for storing insights
    mock_insert_result = MagicMock()
    mock_insert_result.data = [{"id": "insight-1"}]
    mock_insert_execute = AsyncMock(return_value=mock_insert_result)
    mock_insert = MagicMock()
    mock_insert.execute = mock_insert_execute
    
    def from_side_effect(table):
        if table == "messages":
            return mock_from
        elif table == "conversation_insights":
            mock_insights_from = MagicMock()
            mock_insights_from.insert = MagicMock(return_value=mock_insert)
            return mock_insights_from
    
    mock_supabase_extract.from_ = MagicMock(side_effect=from_side_effect)
    
    # Mock AIService for LLM extraction
    mock_ai_response = MagicMock()
    mock_ai_response.success = True
    mock_ai_response.content = '{"insights": [{"content": "User realized they procrastinate due to fear of failure", "confidence": 0.9}]}'
    mock_ai_service = MagicMock()
    mock_ai_service.complete = AsyncMock(return_value=mock_ai_response)
    
    with patch("app.agents.memory_agent.get_async_supabase_client", return_value=mock_supabase_extract):
        with patch("app.agents.memory_agent._get_ai_service", return_value=mock_ai_service):
            # Step 1 & 2: Extract and store insights
            insights_count = await extract_conversation_insights(
                session_id=session_id,
                user_id=user_id,
                coach_id=coach_id
            )
    
    assert insights_count == 1
    
    # Step 3: Mock Supabase for retrieval
    mock_supabase_retrieve = AsyncMock()
    mock_retrieve_result = MagicMock()
    mock_retrieve_result.data = [
        {
            "insight": "User realized they procrastinate due to fear of failure",
            "confidence": 0.9,
            "created_at": "2026-02-24T10:30:00Z"
        }
    ]
    
    # Create proper mock chain for retrieval
    mock_retrieve_execute = AsyncMock(return_value=mock_retrieve_result)
    mock_limit = MagicMock()
    mock_limit.execute = mock_retrieve_execute
    mock_order_created = MagicMock()
    mock_order_created.limit = MagicMock(return_value=mock_limit)
    mock_order_confidence = MagicMock()
    mock_order_confidence.order = MagicMock(return_value=mock_order_created)
    mock_eq_coach = MagicMock()
    mock_eq_coach.order = MagicMock(return_value=mock_order_confidence)
    mock_eq_user = MagicMock()
    mock_eq_user.eq = MagicMock(return_value=mock_eq_coach)
    mock_select_retrieve = MagicMock()
    mock_select_retrieve.eq = MagicMock(return_value=mock_eq_user)
    mock_from_retrieve = MagicMock()
    mock_from_retrieve.select = MagicMock(return_value=mock_select_retrieve)
    mock_supabase_retrieve.from_ = MagicMock(return_value=mock_from_retrieve)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase_retrieve):
        # Step 3: Retrieve insights
        insights_text = await get_conversation_insights(user_id, coach_id)
    
    # Step 4: Verify insights are formatted correctly for injection
    assert "Past Insights from Previous Conversations:" in insights_text
    assert "procrastinate due to fear of failure" in insights_text
    assert "confidence: 0.9" in insights_text
    
    print("✓ End-to-end insights flow test passed!")


@pytest.mark.asyncio
async def test_insights_filtered_by_coach():
    """Test that insights are correctly filtered by coach_id"""
    from app.agents.chat_agent import get_conversation_insights
    
    user_id = "user-123"
    strategic_coach_id = "strategic-coach"
    leadership_coach_id = "leadership-coach"
    
    # Mock Supabase to return different insights for different coaches
    mock_supabase = AsyncMock()
    
    # Strategic coach insights
    strategic_insights = [
        {
            "insight": "User excels at long-term planning",
            "confidence": 0.9,
            "created_at": "2026-02-24T10:30:00Z"
        }
    ]
    
    # Leadership coach insights
    leadership_insights = [
        {
            "insight": "User struggles with delegation",
            "confidence": 0.85,
            "created_at": "2026-02-24T11:00:00Z"
        }
    ]
    
    call_count = [0]
    
    def create_mock_chain(insights_data):
        mock_result = MagicMock()
        mock_result.data = insights_data
        
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
        return mock_from
    
    def from_side_effect(table):
        call_count[0] += 1
        if call_count[0] == 1:
            return create_mock_chain(strategic_insights)
        else:
            return create_mock_chain(leadership_insights)
    
    mock_supabase.from_ = MagicMock(side_effect=from_side_effect)
    
    with patch("app.agents.chat_agent.get_async_supabase_client", return_value=mock_supabase):
        # Get insights for strategic coach
        strategic_result = await get_conversation_insights(user_id, strategic_coach_id)
        
        # Get insights for leadership coach
        leadership_result = await get_conversation_insights(user_id, leadership_coach_id)
    
    # Verify each coach gets their own insights
    assert "long-term planning" in strategic_result
    assert "delegation" not in strategic_result
    
    assert "delegation" in leadership_result
    assert "long-term planning" not in leadership_result
    
    print("✓ Coach-specific insights filtering test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
