from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies import get_current_user, AuthUser
from app.config import get_settings
from app.services.calendar import (
    get_google_auth_url,
    exchange_code_for_tokens,
    fetch_today_events,
    store_user_tokens,
)

router = APIRouter()


@router.get("/integrations/calendar/auth")
async def calendar_auth(user: AuthUser = Depends(get_current_user)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google Calendar not configured")

    auth_url = get_google_auth_url(user.id)
    return {"auth_url": auth_url}


@router.get("/integrations/calendar/callback")
async def calendar_callback(request: Request, code: str, state: str):
    try:
        user_id = state
        tokens = await exchange_code_for_tokens(code)
        await store_user_tokens(user_id, tokens)
        return {"status": "connected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")


@router.get("/integrations/calendar/events")
async def get_calendar_events(user: AuthUser = Depends(get_current_user)):
    try:
        events = await fetch_today_events(user.id)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
