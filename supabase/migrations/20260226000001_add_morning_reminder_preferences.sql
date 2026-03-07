-- ============================================================================
-- Migration: Add morning reminder preferences to profiles
-- Task 5.3: Implement Morning Reminders
-- ============================================================================

-- Add morning reminder preferences to profiles table
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS morning_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS morning_reminder_time INTEGER NOT NULL DEFAULT 9 CHECK (morning_reminder_time >= 0 AND morning_reminder_time <= 23),
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Create index for efficient querying of users with morning reminders enabled
CREATE INDEX IF NOT EXISTS profiles_morning_reminders_idx 
    ON profiles(morning_reminders_enabled) 
    WHERE morning_reminders_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.morning_reminders_enabled IS 'Whether user wants to receive daily morning reminders';
COMMENT ON COLUMN profiles.morning_reminder_time IS 'Hour of day (0-23) when user wants to receive morning reminder in their timezone';
COMMENT ON COLUMN profiles.timezone IS 'User timezone in IANA format (e.g., America/New_York, Europe/London)';
