import httpx
from groq import AsyncGroq
from app.config import get_settings

CURATOR_SYSTEM = """You are a research assistant. Given search results and a user query, 
extract the 3 most relevant and actionable insights.

Return a concise summary (3-5 sentences) followed by the key takeaways as bullet points.
Be practical and specific. Avoid generic advice."""


async def curate_resources(query: str, user_context: str | None = None) -> dict:
    settings = get_settings()

    if not settings.tavily_api_key:
        return {"summary": "Resource search not configured.", "sources": []}

    search_query = query
    if user_context:
        search_query = f"{query} {user_context}"

    async with httpx.AsyncClient() as http:
        resp = await http.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": search_query,
                "max_results": 5,
                "include_raw_content": False,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        search_data = resp.json()

    results = search_data.get("results", [])
    if not results:
        return {"summary": "No relevant resources found.", "sources": []}

    results_text = "\n\n".join(
        [f"Title: {r.get('title')}\nURL: {r.get('url')}\nSnippet: {r.get('content', '')[:300]}"
         for r in results[:5]]
    )

    client = AsyncGroq(api_key=settings.groq_api_key)
    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "system", "content": CURATOR_SYSTEM},
            {"role": "user", "content": f"Query: {query}\n\nSearch results:\n{results_text}"},
        ],
        temperature=0.3,
        max_tokens=512,
    )

    summary = response.choices[0].message.content.strip()
    sources = [r.get("url") for r in results[:3] if r.get("url")]

    return {"summary": summary, "sources": sources}
