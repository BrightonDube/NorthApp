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
