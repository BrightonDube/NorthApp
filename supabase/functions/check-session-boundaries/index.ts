/**
 * Check Session Boundaries - Scheduled Edge Function
 * 
 * This function runs every 5 minutes to check for inactive coaching sessions
 * and automatically end them if they've been inactive for more than 30 minutes.
 * 
 * Validates: Requirements 1.1, 1.3
 * 
 * Schedule: Every 5 minutes (configured via Supabase cron)
 * 
 * Process:
 * 1. Query all active coaching sessions
 * 2. For each session, check the last message time
 * 3. If last message was >30 minutes ago, end the session
 * 4. Trigger report generation for ended sessions (future implementation)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Session inactivity threshold (30 minutes in milliseconds)
const INACTIVITY_THRESHOLD_MS = 30 * 60 * 1000;

interface CoachingSession {
  id: string;
  user_id: string;
  coach_id: string;
  start_time: string;
  message_count: number;
  status: 'active' | 'ended';
}

interface Message {
  created_at: string;
  chat_session_id: string;
}

interface ChatSession {
  id: string;
}

/**
 * Main handler for the scheduled function
 */
Deno.serve(async (req: Request) => {
  try {
    // Verify this is a scheduled invocation (optional security check)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting session boundary check...');

    // Get all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('status', 'active')
      .order('start_time', { ascending: true });

    if (sessionsError) {
      throw new Error(`Failed to fetch active sessions: ${sessionsError.message}`);
    }

    if (!activeSessions || activeSessions.length === 0) {
      console.log('No active sessions found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active sessions to check',
          sessionsChecked: 0,
          sessionsEnded: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${activeSessions.length} active sessions to check`);

    const now = new Date();
    let sessionsEnded = 0;
    const results = [];

    // Check each active session
    for (const session of activeSessions as CoachingSession[]) {
      try {
        // Get chat sessions for this user and coach
        const { data: chatSessions, error: chatSessionsError } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', session.user_id)
          .eq('coach_id', session.coach_id);

        if (chatSessionsError) {
          console.error(`Error fetching chat sessions for session ${session.id}:`, chatSessionsError);
          results.push({
            sessionId: session.id,
            status: 'error',
            error: chatSessionsError.message,
          });
          continue;
        }

        const chatSessionIds = (chatSessions as ChatSession[] || []).map(cs => cs.id);

        // Get the last message for this session
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('created_at, chat_session_id')
          .gte('created_at', session.start_time)
          .order('created_at', { ascending: false })
          .limit(10); // Get a few messages to ensure we find one in the right chat session

        if (messagesError) {
          console.error(`Error fetching messages for session ${session.id}:`, messagesError);
          results.push({
            sessionId: session.id,
            status: 'error',
            error: messagesError.message,
          });
          continue;
        }

        // Find the last message that belongs to one of the chat sessions
        const lastMessage = (messages as Message[] || []).find(m => 
          chatSessionIds.includes(m.chat_session_id)
        );

        // Determine the last activity time
        const lastActivityTime = lastMessage
          ? new Date(lastMessage.created_at)
          : new Date(session.start_time);

        // Calculate time since last activity
        const timeSinceLastActivity = now.getTime() - lastActivityTime.getTime();

        // Check if session should be ended
        if (timeSinceLastActivity > INACTIVITY_THRESHOLD_MS) {
          console.log(
            `Ending session ${session.id} - inactive for ${Math.round(timeSinceLastActivity / 60000)} minutes`
          );

          // End the session
          const { error: updateError } = await supabase
            .from('coaching_sessions')
            .update({
              status: 'ended',
              end_time: now.toISOString(),
            })
            .eq('id', session.id);

          if (updateError) {
            console.error(`Error ending session ${session.id}:`, updateError);
            results.push({
              sessionId: session.id,
              status: 'error',
              error: updateError.message,
            });
            continue;
          }

          sessionsEnded++;
          results.push({
            sessionId: session.id,
            status: 'ended',
            inactiveMinutes: Math.round(timeSinceLastActivity / 60000),
            lastActivityTime: lastActivityTime.toISOString(),
          });

          // TODO: Trigger report generation (Task 4.1)
          // This will be implemented when the Report Generator service is ready
          console.log(`Session ${session.id} ended successfully - report generation pending`);
        } else {
          // Session is still active
          const remainingMinutes = Math.round(
            (INACTIVITY_THRESHOLD_MS - timeSinceLastActivity) / 60000
          );
          results.push({
            sessionId: session.id,
            status: 'active',
            remainingMinutes,
            lastActivityTime: lastActivityTime.toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        results.push({
          sessionId: session.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Session boundary check complete - ${sessionsEnded} sessions ended`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Session boundary check completed',
        sessionsChecked: activeSessions.length,
        sessionsEnded,
        results,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in session boundary check:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
