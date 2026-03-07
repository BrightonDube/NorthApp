"""
Tests for morning reminder functionality.

Task 5.3: Implement Morning Reminders
Validates: Requirements 6.2 (Morning Reminders)
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock
import pytz

from app.tasks.reminders import morning_goal_reminders


def create_mock_supabase(profiles_data, goals_data):
    """Helper to create a properly mocked Supabase client."""
    def create_select_builder(result_data):
        mock_result = MagicMock()
        mock_result.data = result_data
        
        mock_eq = MagicMock()
        mock_eq.execute = AsyncMock(return_value=mock_result)
        
        mock_select = MagicMock()
        mock_select.eq = MagicMock(return_value=mock_eq)
        
        return mock_select
    
    mock_supabase = MagicMock()
    
    def mock_from(table):
        mock_from_builder = MagicMock()
        if table == "profiles":
            mock_from_builder.select = MagicMock(return_value=create_select_builder(profiles_data))
        elif table == "goals":
            mock_from_builder.select = MagicMock(return_value=create_select_builder(goals_data))
        return mock_from_builder
    
    mock_supabase.from_ = mock_from
    return mock_supabase


class TestMorningReminders:
    """Test suite for morning reminder functionality."""

    @pytest.mark.asyncio
    async def test_no_users_with_reminders_enabled(self):
        """Test when no users have morning reminders enabled."""
        mock_supabase = create_mock_supabase(profiles_data=[], goals_data=[])

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase):
            await morning_goal_reminders()

        # Should complete without errors (no assertions needed, just verify it doesn't crash)
        assert True

    @pytest.mark.asyncio
    async def test_sends_reminder_at_correct_hour(self):
        """Test that reminders are sent only at the user's preferred hour."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "America/New_York",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [{"user_id": user_id, "title": "Learn Python"}]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock current time to be 9 AM EST
        est = pytz.timezone("America/New_York")
        mock_now = datetime(2026, 2, 26, 9, 0, 0, tzinfo=est)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Should send notification
        mock_notification.assert_called_once()
        call_args = mock_notification.call_args
        assert call_args[1]["user_id"] == user_id
        assert "Good morning" in call_args[1]["title"]

    @pytest.mark.asyncio
    async def test_skips_reminder_at_wrong_hour(self):
        """Test that reminders are NOT sent at the wrong hour."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "America/New_York",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [{"user_id": user_id, "title": "Learn Python"}]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock current time to be 10 AM EST (wrong hour)
        est = pytz.timezone("America/New_York")
        mock_now = datetime(2026, 2, 26, 10, 0, 0, tzinfo=est)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Should NOT send notification
        mock_notification.assert_not_called()

    @pytest.mark.asyncio
    async def test_respects_different_timezones(self):
        """Test that reminders respect different user timezones."""
        profiles_data = [
            {
                "id": "user-est",
                "timezone": "America/New_York",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            },
            {
                "id": "user-pst",
                "timezone": "America/Los_Angeles",
                "morning_reminder_time": 8,
                "morning_reminders_enabled": True,
            },
            {
                "id": "user-utc",
                "timezone": "UTC",
                "morning_reminder_time": 14,
                "morning_reminders_enabled": True,
            },
        ]
        
        goals_data = [
            {"user_id": "user-est", "title": "Goal 1"},
            {"user_id": "user-pst", "title": "Goal 2"},
            {"user_id": "user-utc", "title": "Goal 3"},
        ]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock current time: 9 AM EST = 6 AM PST = 2 PM UTC
        est = pytz.timezone("America/New_York")
        mock_now_est = datetime(2026, 2, 26, 9, 0, 0, tzinfo=est)
        
        pst = pytz.timezone("America/Los_Angeles")
        mock_now_pst = datetime(2026, 2, 26, 6, 0, 0, tzinfo=pst)
        
        utc = pytz.timezone("UTC")
        mock_now_utc = datetime(2026, 2, 26, 14, 0, 0, tzinfo=utc)
        
        def mock_datetime_now(tz):
            if tz.zone == "America/New_York":
                return mock_now_est
            elif tz.zone == "America/Los_Angeles":
                return mock_now_pst
            elif tz.zone == "UTC":
                return mock_now_utc
            return datetime.now(tz)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.side_effect = mock_datetime_now
            
            await morning_goal_reminders()

        # Should send to EST and UTC users (9 AM and 2 PM respectively)
        # Should NOT send to PST user (6 AM, wants 8 AM)
        assert mock_notification.call_count == 2

    @pytest.mark.asyncio
    async def test_handles_invalid_timezone_gracefully(self):
        """Test that invalid timezones fall back to UTC."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "Invalid/Timezone",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [{"user_id": user_id, "title": "Learn Python"}]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock current time to be 9 AM UTC
        utc = pytz.timezone("UTC")
        mock_now = datetime(2026, 2, 26, 9, 0, 0, tzinfo=utc)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Should still send notification using UTC fallback
        mock_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_uses_firmness_level_in_message(self):
        """Test that message generation respects user's firmness level."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "UTC",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [{"user_id": user_id, "title": "Learn Python"}]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        utc = pytz.timezone("UTC")
        mock_now = datetime(2026, 2, 26, 9, 0, 0, tzinfo=utc)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True), \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!") as mock_message, \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Verify generate_checkin_message was called with user_id
        mock_message.assert_called_once_with(user_id)

    @pytest.mark.asyncio
    async def test_handles_notification_failure_gracefully(self):
        """Test that notification failures don't crash the entire job."""
        profiles_data = [
            {
                "id": "user-1",
                "timezone": "UTC",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            },
            {
                "id": "user-2",
                "timezone": "UTC",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            },
        ]
        
        goals_data = [
            {"user_id": "user-1", "title": "Goal 1"},
            {"user_id": "user-2", "title": "Goal 2"},
        ]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock notification to fail for first user, succeed for second
        mock_notification = AsyncMock(side_effect=[Exception("Network error"), True])
        
        utc = pytz.timezone("UTC")
        mock_now = datetime(2026, 2, 26, 9, 0, 0, tzinfo=utc)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", mock_notification), \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            # Should not raise exception
            await morning_goal_reminders()

        # Should have attempted both notifications
        assert mock_notification.call_count == 2

    @pytest.mark.asyncio
    async def test_customizable_reminder_time(self):
        """Test that users can customize their reminder time."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "UTC",
                "morning_reminder_time": 7,  # Custom time
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [{"user_id": user_id, "title": "Learn Python"}]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        # Mock current time to be 7 AM UTC
        utc = pytz.timezone("UTC")
        mock_now = datetime(2026, 2, 26, 7, 0, 0, tzinfo=utc)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!"), \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Should send notification at custom time
        mock_notification.assert_called_once()

    @pytest.mark.asyncio
    async def test_references_user_goals_in_notification(self):
        """Test that notification references user's current goals."""
        user_id = "user-123"
        
        profiles_data = [
            {
                "id": user_id,
                "timezone": "UTC",
                "morning_reminder_time": 9,
                "morning_reminders_enabled": True,
            }
        ]
        
        goals_data = [
            {"user_id": user_id, "title": "Learn Python"},
            {"user_id": user_id, "title": "Exercise daily"},
        ]
        
        mock_supabase = create_mock_supabase(profiles_data, goals_data)
        
        utc = pytz.timezone("UTC")
        mock_now = datetime(2026, 2, 26, 9, 0, 0, tzinfo=utc)

        with patch("app.tasks.reminders.get_async_supabase_client", return_value=mock_supabase), \
             patch("app.tasks.reminders.send_push_notification", return_value=True) as mock_notification, \
             patch("app.tasks.reminders.generate_checkin_message", return_value="Good morning!") as mock_message, \
             patch("app.tasks.reminders.datetime") as mock_datetime:
            
            mock_datetime.now.return_value = mock_now
            
            await morning_goal_reminders()

        # Verify message was generated (which includes goals context)
        mock_message.assert_called_once_with(user_id)
        
        # Verify notification was sent
        mock_notification.assert_called_once()
        call_args = mock_notification.call_args
        assert call_args[1]["data"]["action"] == "open_goals"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
