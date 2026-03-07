-- Migration: Add admin and subscription management tables
-- Description: Adds tables for admin functionality and manual subscription management

-- Add is_pro and is_admin columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create user_subscriptions table for manual subscription management
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT false,
  plan_type TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id), -- Admin who granted the subscription
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id), -- Admin who revoked the subscription
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_is_active ON user_subscriptions(is_active);

-- Enable RLS on user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscription
CREATE POLICY "Users can read own subscription"
ON user_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions"
ON user_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can insert subscriptions
CREATE POLICY "Admins can insert subscriptions"
ON user_subscriptions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can update subscriptions
CREATE POLICY "Admins can update subscriptions"
ON user_subscriptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Policy: Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
ON user_subscriptions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Function to sync profile is_pro with subscription status
CREATE OR REPLACE FUNCTION sync_profile_is_pro()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET is_pro = NEW.is_active
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_profile_is_pro
AFTER INSERT OR UPDATE OF is_active ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_profile_is_pro();

-- Set the first admin (max@north.app)
-- Note: You'll need to run this separately after the user signs up
-- UPDATE profiles SET is_admin = true WHERE email = 'max@north.app';

-- Grant admin additional permissions on profiles
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_admin = true
  )
);

-- Comment: To make a user admin, run:
-- UPDATE profiles SET is_admin = true WHERE email = 'max@north.app';
