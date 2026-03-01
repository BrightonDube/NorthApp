-- Migration: Make all current users pro users
-- Description: Updates all existing users to have pro subscription status

-- Update all existing profiles to be pro users
UPDATE profiles 
SET is_pro = true 
WHERE is_pro = false;

-- Grant voice features to all pro users (if there's a voice_enabled column)
-- This is a safety check in case the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'voice_enabled'
  ) THEN
    UPDATE profiles SET voice_enabled = true WHERE is_pro = true;
  END IF;
END $$;
