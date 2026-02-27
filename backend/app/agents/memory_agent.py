import json
from app.services.supabase import get_async_supabase_client
from app.services.embeddings import create_embedding
from app.services.groq_client import MODEL_FAST, get_groq_client

FACT_EXTRACTION_PROMPT = """Analyze the following conversation message and extract any NEW facts about the user.

Look for:
- Personal preferences (likes, dislikes, habits)
- Achievements or milestones
- Struggles or challenges
- Relationships (family, friends, colleagues)
- Decisions made
- Values or beliefs expressed
- Goal updates or progress

Return a JSON object with this exact structure:
{
  "facts": [
    {
      "content": "The user prefers working in the morning",
      "category": "preference",
      "importance": "medium"
    }
  ]
}

Categories: fact, preference, relationship, achievement, struggle, decision, value, goal_update
Importance: high, medium, low

If no new facts are present, return: {"facts": []}

Message to analyze:
"""


async def extract_and_store_facts(message: str, user_id: str, source_message_id: str | None = None) -> int:
    client = get_groq_client()

    try:
        response = await client.chat.completions.create(
            model=MODEL_FAST,
            messages=[
                {"role": "user", "content": FACT_EXTRACTION_PROMPT + message}
            ],
            temperature=0.1,
            max_tokens=512,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        data = json.loads(raw)
        facts = data.get("facts", [])
    except Exception as e:
        print(f"[MemoryAgent] Fact extraction failed: {e}")
        return 0

    if not facts:
        return 0

    supabase = await get_async_supabase_client()
    stored = 0

    for fact in facts:
        content = fact.get("content", "").strip()
        if not content:
            continue

        try:
            embedding = await create_embedding(content)
            insert_data = {
                "user_id": user_id,
                "content": content,
                "category": fact.get("category", "fact"),
                "importance": fact.get("importance", "medium"),
                "embedding": embedding,
            }
            if source_message_id:
                insert_data["source_message_id"] = source_message_id

            await supabase.from_("memories").insert(insert_data).execute()
            stored += 1
        except Exception as e:
            print(f"[MemoryAgent] Failed to store fact: {e}")

    return stored


INSIGHT_EXTRACTION_PROMPT = """Analyze the following coaching conversation and extract high-level insights and key takeaways.

Focus on:
- Major breakthroughs or realizations the user had
- Patterns in thinking or behavior identified
- Commitments or decisions made
- Progress toward goals
- Shifts in perspective or understanding
- Recurring themes or challenges
- Action items or next steps agreed upon

Return a JSON object with this exact structure:
{
  "insights": [
    {
      "content": "The user realized they've been avoiding difficult conversations due to fear of conflict",
      "confidence": 0.9
    }
  ]
}

Confidence should be between 0.0 and 1.0, where:
- 0.9-1.0: Explicitly stated by user or clearly evident
- 0.7-0.9: Strongly implied or demonstrated
- 0.5-0.7: Moderately evident
- Below 0.5: Speculative or uncertain

Only include insights with confidence >= 0.7.
If no significant insights are present, return: {"insights": []}

Conversation to analyze:
"""


async def extract_conversation_insights(
    session_id: str,
    user_id: str,
    coach_id: str,
    min_messages: int = 5
) -> int:
    """
    Extract high-level insights from a completed conversation.
    
    Args:
        session_id: UUID of the chat session
        user_id: UUID of the user
        coach_id: UUID of the coach
        min_messages: Minimum number of messages required (default: 5)
    
    Returns:
        Number of insights extracted and stored
    """
    supabase = await get_async_supabase_client()
    
    # Get conversation messages
    messages_result = await supabase.from_("messages").select("role, content").eq(
        "chat_session_id", session_id
    ).order("created_at", desc=False).execute()
    
    if not messages_result.data:
        print(f"[MemoryAgent] No messages found for session {session_id}")
        return 0
    
    messages = messages_result.data
    
    # Check if conversation has enough messages
    if len(messages) < min_messages:
        print(f"[MemoryAgent] Session {session_id} has only {len(messages)} messages, need at least {min_messages}")
        return 0
    
    # Format conversation for analysis
    conversation_text = "\n\n".join([
        f"{'User' if msg['role'] == 'user' else 'Coach'}: {msg['content']}"
        for msg in messages
    ])
    
    # Extract insights using LLM
    client = get_groq_client()
    
    try:
        response = await client.chat.completions.create(
            model=MODEL_FAST,
            messages=[
                {"role": "user", "content": INSIGHT_EXTRACTION_PROMPT + conversation_text}
            ],
            temperature=0.2,
            max_tokens=1024,
            response_format={"type": "json_object"},
        )
        
        raw = response.choices[0].message.content
        data = json.loads(raw)
        insights = data.get("insights", [])
    except Exception as e:
        print(f"[MemoryAgent] Insight extraction failed: {e}")
        return 0
    
    if not insights:
        print(f"[MemoryAgent] No insights extracted from session {session_id}")
        return 0
    
    # Store insights in database
    stored = 0
    
    for insight in insights:
        content = insight.get("content", "").strip()
        confidence = insight.get("confidence", 0.8)
        
        if not content or confidence < 0.7:
            continue
        
        try:
            await supabase.from_("conversation_insights").insert({
                "user_id": user_id,
                "coach_id": coach_id,
                "session_id": session_id,
                "insight": content,
                "confidence": confidence,
            }).execute()
            stored += 1
            print(f"[MemoryAgent] Stored insight: {content[:100]}... (confidence: {confidence})")
        except Exception as e:
            print(f"[MemoryAgent] Failed to store insight: {e}")
    
    return stored
