-- ============================================================================
-- Migration: Fix profiles RLS for onboarding + user_xp insert safety
-- 
-- Problem 1: New users cannot upsert their own profile during onboarding
-- because the profiles table may lack an INSERT/UPDATE policy for auth.uid().
-- The mobile client calls supabase.from('profiles').upsert({id, name, updated_at})
-- using the user's auth token — this requires RLS to allow it.
--
-- Problem 2: The user_xp table needs INSERT access for service_role so the
-- backend can create XP rows for new users.
-- ============================================================================

-- ============================================================================
-- 1. Ensure profiles has proper RLS policies for authenticated users
-- ============================================================================

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Allow users to insert their own profile (onboarding creates profile row)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (onboarding updates name, settings updates firmness etc.)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Service role needs full access for backend operations (proactive agent, scheduler, etc.)
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
CREATE POLICY "Service role can manage all profiles"
    ON profiles FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. Ensure user_xp has INSERT policy for service_role
--    (The backend creates XP rows via the service key when a user first
--    triggers an XP event like check_in or task_complete.)
-- ============================================================================

-- These policies already exist from 20260220000000 but we ensure they cover INSERT
DROP POLICY IF EXISTS "Service role can manage xp" ON user_xp;
CREATE POLICY "Service role can manage xp"
    ON user_xp FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 3. Ensure profiles table has RLS enabled (idempotent)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
