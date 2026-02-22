-- Add voice_enabled column to profiles
-- Voice is a Pro-only feature, off by default for all users
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Add is_pro column if it doesn't exist (may already exist via billing)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
