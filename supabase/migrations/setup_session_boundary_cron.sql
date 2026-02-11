-- Migration: Set up cron job for session boundary checking
-- This migration enables pg_cron and creates a scheduled job that runs every 5 minutes
-- to check for inactive coaching sessions and automatically end them.
-- 
-- Validates: Requirements 1.1, 1.3
-- Related: Task 2.3 - Implement background job for session boundary checking

-- ============================================================================
-- ENABLE PG_CRON EXTENSION
-- ============================================================================
-- Enable the pg_cron extension for scheduled jobs
-- Note: This may require superuser privileges and may already be enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- ENABLE HTTP EXTENSION
-- ============================================================================
-- Enable the http extension for making HTTP requests from SQL
-- This is needed to call the Edge Function from the cron job
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ============================================================================
-- CREATE CRON JOB FOR SESSION BOUNDARY CHECKING
-- ============================================================================
-- This job runs every 5 minutes and calls the check-session-boundaries Edge Function
-- The Edge Function will query for active sessions and end those that have been
-- inactive for more than 30 minutes.

-- First, unschedule any existing job with the same name (for idempotency)
SELECT cron.unschedule('check-session-boundaries') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-session-boundaries'
);

-- Schedule the new job
-- Cron expression: */5 * * * * means "every 5 minutes"
-- Format: minute hour day month weekday
SELECT cron.schedule(
  'check-session-boundaries',           -- Job name
  '*/5 * * * *',                        -- Every 5 minutes
  $$
  -- Call the Edge Function using the http extension
  SELECT
    extensions.http_post(
      -- Replace with your actual Supabase project URL
      -- Format: https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-session-boundaries
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/check-session-boundaries',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================================================
-- CONFIGURATION SETTINGS
-- ============================================================================
-- Store the Supabase URL and service role key as configuration settings
-- These will be used by the cron job to call the Edge Function
-- 
-- IMPORTANT: You need to set these values after running this migration:
-- 
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
--
-- Or use environment variables in your Supabase project settings

-- ============================================================================
-- VERIFY CRON JOB
-- ============================================================================
-- Query to verify the cron job was created successfully
-- Run this after the migration to confirm:
-- SELECT * FROM cron.job WHERE jobname = 'check-session-boundaries';

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================
-- Useful queries for monitoring the cron job:

-- View all scheduled jobs
-- SELECT * FROM cron.job;

-- View recent job runs
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname = 'check-session-boundaries'
-- ORDER BY start_time DESC
-- LIMIT 10;

-- View failed job runs
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname = 'check-session-boundaries'
--   AND status = 'failed'
-- ORDER BY start_time DESC;

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================
-- To remove the cron job (for testing or cleanup):
-- SELECT cron.unschedule('check-session-boundaries');

-- To disable the job temporarily without removing it:
-- UPDATE cron.job SET active = false WHERE jobname = 'check-session-boundaries';

-- To re-enable the job:
-- UPDATE cron.job SET active = true WHERE jobname = 'check-session-boundaries';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. The pg_cron extension runs jobs in the database timezone (usually UTC)
-- 2. The job will continue running even if the Edge Function fails
-- 3. Check the cron.job_run_details table for execution history and errors
-- 4. The Edge Function should complete in <10 seconds for typical loads
-- 5. If you have many active sessions, consider adjusting the schedule or
--    implementing batch processing in the Edge Function

