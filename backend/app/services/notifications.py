import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def send_push_notification(
    user_id: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    settings = get_settings()

    if not settings.onesignal_app_id or not settings.onesignal_api_key:
        logger.warning("OneSignal not configured, skipping push for user %s", user_id)
        return False

    payload = {
        "app_id": settings.onesignal_app_id,
        "headings": {"en": title},
        "contents": {"en": body},
        "filters": [
            {"field": "tag", "key": "user_id", "relation": "=", "value": user_id}
        ],
    }

    if data:
        payload["data"] = data

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://onesignal.com/api/v1/notifications",
            headers={
                "Authorization": f"Basic {settings.onesignal_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code == 200:
        return True

    logger.error("OneSignal error %d: %s", response.status_code, response.text)
    return False
