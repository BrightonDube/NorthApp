from fastapi import APIRouter

from app.api.v1 import chat, voice, memories, goals, settings, agents, integrations, xp, grow, checkins, analytics, cache, monitoring

router = APIRouter()

router.include_router(chat.router, tags=["Chat"])
router.include_router(voice.router, tags=["Voice"])
router.include_router(memories.router, tags=["Memories"])
router.include_router(goals.router, tags=["Goals"])
router.include_router(settings.router, tags=["Settings"])
router.include_router(agents.router, tags=["Agents"])
router.include_router(integrations.router, tags=["Integrations"])
router.include_router(xp.router, tags=["XP"])
router.include_router(grow.router, tags=["GROW"])
router.include_router(checkins.router, tags=["Check-ins"])
router.include_router(analytics.router, tags=["Analytics"])
router.include_router(cache.router, tags=["Cache"])
router.include_router(monitoring.router, tags=["Monitoring"])
