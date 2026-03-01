import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    from app.tasks.inactivity import check_inactive_users
    from app.tasks.reminders import morning_goal_reminders
    from app.tasks.calendar_sync import sync_all_calendars
    from app.services.monitoring import check_alerts_periodically

    # Hourly: check for inactive users and re-engage
    scheduler.add_job(
        check_inactive_users,
        IntervalTrigger(hours=1),
        id="inactivity_check",
        replace_existing=True,
    )

    # Hourly: send morning reminders (checks each user's timezone)
    scheduler.add_job(
        morning_goal_reminders,
        IntervalTrigger(hours=1),
        id="morning_reminders",
        replace_existing=True,
    )

    # Daily 7 AM UTC: sync calendars and cache context
    scheduler.add_job(
        sync_all_calendars,
        CronTrigger(hour=7, minute=0),
        id="calendar_sync",
        replace_existing=True,
    )

    # Every 5 minutes: check for alert conditions
    scheduler.add_job(
        check_alerts_periodically,
        IntervalTrigger(minutes=5),
        id="alert_check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with 4 jobs: inactivity, reminders, calendar_sync, alert_check")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
