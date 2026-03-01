from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_current_user, AuthUser
from app.services.supabase import get_async_supabase_client

router = APIRouter()


@router.get("/analytics/usage")
async def get_usage_analytics(
    days: int = Query(default=30, ge=1, le=365),
    scope: str = Query(default="me", pattern="^(me|all)$"),
    user: AuthUser = Depends(get_current_user),
):
    """
    Retrieve LLM usage analytics and cost metrics.
    
    Provides detailed insights into AI model usage, token consumption, and associated
    costs. Useful for monitoring personal usage or (for admins) system-wide metrics.
    
    **Authentication:** Required (JWT Bearer token)
    
    **Query Parameters:**
    - `days` (integer, optional): Number of days to analyze (1-365, default: 30)
    - `scope` (string, optional): "me" for personal stats, "all" for system-wide (admin only)
    
    **Response:**
    ```json
    {
      "scope": "me",
      "days": 30,
      "total_requests": 145,
      "total_input_tokens": 87500,
      "total_output_tokens": 52300,
      "total_cost_usd": 0.142,
      "by_model": {
        "meta-llama/llama-4-scout-17b-16e-instruct": {
          "requests": 120,
          "input_tokens": 72000,
          "output_tokens": 43000,
          "cost_usd": 0.115
        },
        "llama-3.1-8b-instant": {
          "requests": 25,
          "input_tokens": 15500,
          "output_tokens": 9300,
          "cost_usd": 0.002
        }
      }
    }
    ```
    
    **Model Pricing (per 1M tokens):**
    - Groq Llama 4 Scout: $0.10 input, $0.10 output
    - Groq Llama 3.3 70B: $0.59 input, $0.79 output
    - Groq Llama 3.1 8B: $0.05 input, $0.08 output
    - DeepSeek R1 Distill: $0.99 input, $0.99 output
    
    **Error Codes:**
    - `401 Unauthorized`: Invalid or missing JWT token
    - `403 Forbidden`: Admin access required for scope=all
    
    **Example Usage:**
    ```bash
    # Personal usage for last 7 days
    curl -X GET "https://api.example.com/v1/analytics/usage?days=7&scope=me" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    
    # System-wide usage (admin only)
    curl -X GET "https://api.example.com/v1/analytics/usage?days=30&scope=all" \\
      -H "Authorization: Bearer YOUR_JWT_TOKEN"
    ```
    
    **Use Cases:**
    - Monitor personal AI usage
    - Track costs over time
    - Identify expensive queries
    - Compare model efficiency
    - Budget planning
    
    **Performance Notes:**
    - Query limited to 2000 most recent logs
    - Response time: < 500ms for typical queries
    - Data updated in real-time after each request
    
    **Related Endpoints:**
    - `POST /v1/chat/stream` - Usage logged here
    """
    supabase = await get_async_supabase_client()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    if scope == "all":
        profile_result = await (
            supabase.from_("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single()
            .execute()
        )
        is_admin = bool(profile_result.data and profile_result.data.get("is_admin"))
        if not is_admin:
            raise HTTPException(status_code=403, detail="Admin access required for scope=all")

    query = (
        supabase.from_("model_usage_logs")
        .select("model, input_tokens, output_tokens, cost_usd, created_at, user_id")
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(2000)
    )
    if scope == "me":
        query = query.eq("user_id", user.id)

    result = await query.execute()
    rows = result.data or []

    total_input_tokens = sum(int(r.get("input_tokens") or 0) for r in rows)
    total_output_tokens = sum(int(r.get("output_tokens") or 0) for r in rows)
    total_cost_usd = round(sum(float(r.get("cost_usd") or 0.0) for r in rows), 6)

    by_model: dict[str, dict] = {}
    for row in rows:
        model = row.get("model") or "unknown"
        if model not in by_model:
            by_model[model] = {
                "requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0.0,
            }
        by_model[model]["requests"] += 1
        by_model[model]["input_tokens"] += int(row.get("input_tokens") or 0)
        by_model[model]["output_tokens"] += int(row.get("output_tokens") or 0)
        by_model[model]["cost_usd"] += float(row.get("cost_usd") or 0.0)

    for model in by_model:
        by_model[model]["cost_usd"] = round(by_model[model]["cost_usd"], 6)

    return {
        "scope": scope,
        "days": days,
        "total_requests": len(rows),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_cost_usd": total_cost_usd,
        "by_model": by_model,
    }
