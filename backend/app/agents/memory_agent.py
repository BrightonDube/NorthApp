import json
from groq import AsyncGroq
from app.config import get_settings
from app.services.supabase import get_async_supabase_client
from app.services.embeddings import create_embedding

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
    settings = get_settings()
    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        response = await client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
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
