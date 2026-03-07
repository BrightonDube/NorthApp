# Check Session Boundaries - Scheduled Edge Function

This Supabase Edge Function runs on a schedule to automatically detect and end inactive coaching sessions.

## Purpose

Implements **Task 2.3** of the Session Reports & Conversation Memory feature:
- Runs every 5 minutes to check for inactive sessions
- Queries for active sessions with last message >30 minutes ago
- Automatically ends sessions that exceed the inactivity threshold
- Prepares sessions for report generation (future implementation)

**Validates**: Requirements 1.1, 1.3

## How It Works

1. **Query Active Sessions**: Fetches all coaching sessions with `status = 'active'`
2. **Check Last Message Time**: For each session, finds the most recent message
3. **Calculate Inactivity**: Compares current time with last message time
4. **End Inactive Sessions**: If inactive for >30 minutes, updates session status to 'ended'
5. **Log Results**: Returns summary of sessions checked and ended

## Configuration

### Environment Variables

The function requires these environment variables (automatically available in Supabase):
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin access

### Inactivity Threshold

The inactivity threshold is set to **30 minutes** (configurable in the code):

```typescript
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
```

## Deployment

### 1. Deploy the Function

```bash
# Deploy to Supabase
supabase functions deploy check-session-boundaries
```

### 2. Set Up Cron Schedule

You have two options for scheduling:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Database** → **Extensions**
3. Enable the `pg_cron` extension if not already enabled
4. Go to **SQL Editor** and run:

```sql
-- Create a cron job that runs every 5 minutes
SELECT cron.schedule(
  'check-session-boundaries',           -- Job name
  '*/5 * * * *',                        -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-session-boundaries',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference.

#### Option B: Using External Cron Service

If you prefer an external service (like GitHub Actions, Vercel Cron, or Cron-job.org):

1. Set up a cron job to call the function every 5 minutes
2. Use the function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-session-boundaries`
3. Include the service role key in the Authorization header

Example with curl:
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-session-boundaries \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### 3. Verify the Schedule

Check that the cron job is running:

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
WHERE jobname = 'check-session-boundaries'
ORDER BY start_time DESC
LIMIT 10;
```

## Testing

### Manual Invocation

You can manually trigger the function for testing:

```bash
# Using Supabase CLI
supabase functions invoke check-session-boundaries \
  --env-file supabase/.env.local

# Using curl
curl -X POST \
  http://localhost:54321/functions/v1/check-session-boundaries \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Expected Response

```json
{
  "success": true,
  "message": "Session boundary check completed",
  "sessionsChecked": 5,
  "sessionsEnded": 2,
  "results": [
    {
      "sessionId": "uuid-1",
      "status": "ended",
      "inactiveMinutes": 45,
      "lastActivityTime": "2024-01-15T10:30:00Z"
    },
    {
      "sessionId": "uuid-2",
      "status": "active",
      "remainingMinutes": 15,
      "lastActivityTime": "2024-01-15T11:00:00Z"
    }
  ],
  "timestamp": "2024-01-15T11:15:00Z"
}
```

## Monitoring

### Logs

View function logs in the Supabase Dashboard:
1. Go to **Edge Functions**
2. Select `check-session-boundaries`
3. View the **Logs** tab

Or use the CLI:
```bash
supabase functions logs check-session-boundaries
```

### Key Metrics to Monitor

- **Sessions Checked**: Total active sessions processed
- **Sessions Ended**: Number of sessions ended due to inactivity
- **Errors**: Any errors during processing
- **Execution Time**: Should complete in <10 seconds for typical loads

### Alerts

Consider setting up alerts for:
- Function execution failures
- High number of sessions being ended (may indicate an issue)
- Long execution times (>30 seconds)

## Troubleshooting

### Function Not Running

1. Check that pg_cron extension is enabled
2. Verify the cron schedule is active: `SELECT * FROM cron.job;`
3. Check for errors in job run history: `SELECT * FROM cron.job_run_details;`

### Sessions Not Being Ended

1. Verify active sessions exist: `SELECT * FROM coaching_sessions WHERE status = 'active';`
2. Check message timestamps: `SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;`
3. Review function logs for errors
4. Manually invoke the function to test

### Permission Errors

Ensure the function is using the service role key, not the anon key. The service role key has admin access needed to update sessions.

## Future Enhancements

- **Report Generation Trigger**: When Task 4.1 is complete, this function will trigger report generation for ended sessions
- **Batch Processing**: For high-volume scenarios, implement batch processing with pagination
- **Retry Logic**: Add retry mechanism for failed session updates
- **Metrics Collection**: Track and store metrics about session boundaries over time

## Related Tasks

- **Task 2.1**: SessionDetector class implementation
- **Task 2.2**: Property tests for session detection
- **Task 4.1**: Report Generator service (will be triggered by this function)

## Security

- Uses service role key for admin access (required to update all sessions)
- Validates authorization header on each invocation
- Follows RLS policies for data access
- Logs all operations for audit trail
