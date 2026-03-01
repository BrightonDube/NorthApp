import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from app.dependencies import get_current_user, AuthUser
from app.config import get_settings
from app.services.calendar import (
    get_google_auth_url,
    exchange_code_for_tokens,
    fetch_today_events,
    store_user_tokens,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _sign_state(user_id: str, secret: str) -> str:
    """Create an HMAC-signed OAuth state string: `user_id.signature`."""
    sig = hmac.new(secret.encode(), user_id.encode(), hashlib.sha256).hexdigest()[:16]
    return f"{user_id}.{sig}"


def _verify_state(state: str, secret: str) -> str:
    """Verify HMAC-signed state and return the user_id.

    Raises:
        ValueError: If the signature is invalid or missing.
    """
    if "." not in state:
        raise ValueError("Invalid OAuth state format")
    user_id, sig = state.rsplit(".", 1)
    expected_sig = hmac.new(secret.encode(), user_id.encode(), hashlib.sha256).hexdigest()[:16]
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("Invalid OAuth state signature")
    return user_id


@router.get("/integrations/calendar/auth")
async def calendar_auth(user: AuthUser = Depends(get_current_user)):
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google Calendar not configured")

    signed_state = _sign_state(user.id, settings.secret_key)
    auth_url = get_google_auth_url(signed_state)
    return {"auth_url": auth_url}


@router.get("/integrations/calendar/callback")
async def calendar_callback(request: Request, code: str, state: str):
    """OAuth2 callback — validates the HMAC-signed state before trusting user_id."""
    settings = get_settings()
    try:
        user_id = _verify_state(state, settings.secret_key)
    except ValueError as e:
        logger.warning("OAuth state verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    try:
        tokens = await exchange_code_for_tokens(code)
        await store_user_tokens(user_id, tokens)
        logger.info("Google Calendar connected for user %s", user_id)
        return {"status": "connected"}
    except Exception as e:
        logger.error("OAuth token exchange failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=400, detail="OAuth token exchange failed")


@router.get("/integrations/calendar/events")
async def get_calendar_events(user: AuthUser = Depends(get_current_user)):
    try:
        events = await fetch_today_events(user.id)
        return {"events": events}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
