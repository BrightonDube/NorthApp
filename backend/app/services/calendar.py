import json
from datetime import datetime, timedelta, timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import get_settings
from app.services.supabase import get_supabase_client

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]


def get_google_auth_url(user_id: str) -> str:
    settings = get_settings()
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [settings.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.google_redirect_uri
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=user_id,
    )
    return auth_url


async def exchange_code_for_tokens(code: str) -> dict:
    settings = get_settings()
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uris": [settings.google_redirect_uri],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = settings.google_redirect_uri
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes) if creds.scopes else [],
    }


async def store_user_tokens(user_id: str, tokens: dict) -> None:
    supabase = get_supabase_client()
    supabase.from_("profiles").update({
        "google_calendar_tokens": json.dumps(tokens)
    }).eq("id", user_id).execute()


async def get_user_tokens(user_id: str) -> dict | None:
    supabase = get_supabase_client()
    result = (
        supabase.from_("profiles")
        .select("google_calendar_tokens")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if result.data and result.data.get("google_calendar_tokens"):
        raw = result.data["google_calendar_tokens"]
        return json.loads(raw) if isinstance(raw, str) else raw
    return None


async def fetch_today_events(user_id: str) -> list[dict]:
    tokens = await get_user_tokens(user_id)
    if not tokens:
        raise ValueError("Google Calendar not connected for this user")

    settings = get_settings()
    creds = Credentials(
        token=tokens.get("token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=tokens.get("client_id", settings.google_client_id),
        client_secret=tokens.get("client_secret", settings.google_client_secret),
        scopes=tokens.get("scopes", SCOPES),
    )

    service = build("calendar", "v3", credentials=creds)
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=1)

    events_result = (
        service.events()
        .list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    items = events_result.get("items", [])
    return [
        {
            "id": e.get("id"),
            "summary": e.get("summary", "Untitled"),
            "start": e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"),
            "end": e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"),
            "location": e.get("location"),
        }
        for e in items
    ]
