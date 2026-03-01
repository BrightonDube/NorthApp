-- Migration: Set up pro subscriptions for all users
-- Description: Creates pro subscription entries for all existing users

-- Create pro subscriptions for all users that don't have active pro subscriptions
INSERT INTO user_subscriptions (user_id, is_active, plan_type, started_at, expires_at, notes)
SELECT 
  p.id as user_id,
  true as is_active,
  'pro' as plan_type,
  NOW() as started_at,
  NULL as expires_at, -- No expiration for permanent pro status
  'Granted pro status to all existing users - mass promotion' as notes
FROM profiles p
LEFT JOIN user_subscriptions us ON p.id = us.user_id
WHERE p.id NOT IN (
  SELECT user_id FROM user_subscriptions WHERE is_active = true AND plan_type = 'pro'
)
AND p.id IS NOT NULL;

-- Update any existing inactive subscriptions to active pro
UPDATE user_subscriptions 
SET 
  is_active = true,
  plan_type = 'pro',
  expires_at = NULL,
  notes = 'Reactivated as pro user - mass promotion',
  updated_at = NOW()
WHERE is_active = false OR plan_type != 'pro';
