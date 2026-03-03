-- ============================================================================
-- Migration: Fix infinite recursion in profiles RLS policies (42P17)
--
-- ROOT CAUSE: The "Admins can read all profiles" policy does
--   SELECT 1 FROM profiles WHERE ... AND is_admin = true
-- inside a SELECT policy ON profiles — Postgres evaluates the sub-query
-- through the same RLS policies, creating an infinite loop.
--
-- FIX: Create a SECURITY DEFINER function that checks admin status
-- bypassing RLS, then reference that function in the policy.
-- ============================================================================

-- 1. Create a helper function that checks if the current user is an admin.
--    SECURITY DEFINER runs as the function owner (superuser/migration role),
--    bypassing RLS on profiles so it doesn't trigger the recursive check.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Drop the broken recursive policy on profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- 3. Recreate it using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.is_admin()
);

-- 4. Also fix the user_subscriptions policies that reference profiles directly.
--    These are not recursive (different table) but should use the helper for consistency.
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can read all subscriptions"
ON user_subscriptions
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can insert subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can insert subscriptions"
ON user_subscriptions
FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can update subscriptions"
ON user_subscriptions
FOR UPDATE
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete subscriptions" ON user_subscriptions;
CREATE POLICY "Admins can delete subscriptions"
ON user_subscriptions
FOR DELETE
USING (public.is_admin());
