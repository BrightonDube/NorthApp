/**
 * Session Detector Service
 * 
 * This service manages coaching session boundaries by detecting when sessions
 * should end based on inactivity or explicit user actions.
 * 
 * Key Features:
 * - Automatic session ending after 30 minutes of inactivity
 * - Explicit session ending via user action
 * - Session creation and retrieval
 * - Message count tracking
 * 
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { supabase } from './supabase';
import type { CoachingSession, CoachingSessionInsert, CoachingSessionUpdate } from './database.types';

/**
 * Configuration for session detection
 */
export const SESSION_CONFIG = {
  /**
   * Inactivity threshold in milliseconds (30 minutes)
   * After this period without messages, a session is considered ended
   */
  INACTIVITY_THRESHOLD_MS: 30 * 60 * 1000, // 30 minutes
  
  /**
   * Inactivity threshold in minutes (for display/logging)
   */
  INACTIVITY_THRESHOLD_MINUTES: 30,
} as const;

/**
 * Result of checking session boundary
 */
export interface SessionBoundaryResult {
  /**
   * Whether the session should be ended due to inactivity
   */
  shouldEndSession: boolean;
  
  /**
   * The session ID if a session exists
   */
  sessionId?: string;
  
  /**
   * The last message time if available
   */
  lastMessageTime?: Date;
  
  /**
   * Time since last message in milliseconds
   */
  timeSinceLastMessage?: number;
}

/**
 * Session Detector Class
 * 
 * Manages coaching session lifecycle including:
 * - Detecting session boundaries based on inactivity
 * - Explicitly ending sessions
 * - Creating and retrieving sessions
 * 
 * @example
 * ```typescript
 * const detector = new SessionDetector();
 * 
 * // Check if session should end
 * const result = await detector.checkSessionBoundary(userId, coachId);
 * if (result.shouldEndSession) {
 *   await detector.endSession(result.sessionId!);
 * }
 * 
 * // Get or create current session
 * const session = await detector.getCurrentSession(userId, coachId);
 * ```
 */
export class SessionDetector {
  /**
   * Check if the current session should end based on inactivity
   * 
   * This method:
   * 1. Finds the active session for the user and coach
   * 2. Gets the last message time from the messages table
   * 3. Calculates time since last message
   * 4. Determines if session should end (>30 minutes inactive)
   * 
   * Validates: Requirement 1.1 - Automatic session ending after 30 minutes
   * 
   * @param userId - The user's ID
   * @param coachId - The coach's ID
   * @returns Session boundary check result
   * 
   * @example
   * ```typescript
   * const result = await detector.checkSessionBoundary(userId, coachId);
   * if (result.shouldEndSession) {
   *   console.log(`Session ${result.sessionId} should end`);
   *   console.log(`Last message was ${result.timeSinceLastMessage}ms ago`);
   * }
   * ```
   */
  async checkSessionBoundary(
    userId: string,
    coachId: string
  ): Promise<SessionBoundaryResult> {
    try {
      // Find active session for this user and coach
      const { data: session, error: sessionError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      // If no active session, no boundary to check
      if (sessionError || !session) {
        return {
          shouldEndSession: false,
        };
      }

      // Get the last message time for this session
      // We'll query messages for this user/coach combination after the session start time
      const { data: messages, error: messageError } = await supabase
        .from('messages')
        .select('created_at, chat_session_id')
        .gte('created_at', session.start_time)
        .order('created_at', { ascending: false })
        .limit(1);

      // Get chat sessions for this user and coach to filter messages
      const { data: chatSessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('coach_id', coachId);

      const chatSessionIds = chatSessions?.map(cs => cs.id) || [];

      // Find the last message that belongs to one of these chat sessions
      const lastMessage = messages?.find(m => chatSessionIds.includes(m.chat_session_id));

      // If no messages found, use session start time
      const lastMessageTime = lastMessage 
        ? new Date(lastMessage.created_at)
        : new Date(session.start_time);

      // Calculate time since last message
      const now = new Date();
      const timeSinceLastMessage = now.getTime() - lastMessageTime.getTime();

      // Check if session should end (inactive for more than threshold)
      const shouldEndSession = timeSinceLastMessage > SESSION_CONFIG.INACTIVITY_THRESHOLD_MS;

      return {
        shouldEndSession,
        sessionId: session.id,
        lastMessageTime,
        timeSinceLastMessage,
      };
    } catch (error) {
      console.error('Error checking session boundary:', error);
      throw new Error(`Failed to check session boundary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Explicitly end a session
   * 
   * This method:
   * 1. Updates the session status to 'ended'
   * 2. Sets the end_time to current time
   * 3. Triggers report generation (in future implementation)
   * 
   * Validates: Requirement 1.2 - Explicit session ending
   * 
   * @param sessionId - The session ID to end
   * @throws Error if session not found or update fails
   * 
   * @example
   * ```typescript
   * await detector.endSession(sessionId);
   * console.log('Session ended successfully');
   * ```
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      // Get the session to verify it exists and is active
      const { data: session, error: fetchError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      if (session.status === 'ended') {
        // Session already ended, nothing to do
        return;
      }

      // Update session to ended status
      const update: CoachingSessionUpdate = {
        status: 'ended',
        end_time: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('coaching_sessions')
        .update(update)
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(`Failed to end session: ${updateError.message}`);
      }

      // TODO: Trigger report generation (Requirement 1.3)
      // This will be implemented in Task 4.1
      console.log(`Session ${sessionId} ended successfully`);
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get the current active session or create a new one
   * 
   * This method:
   * 1. Checks for an active session for the user and coach
   * 2. If found and not expired, returns it
   * 3. If expired, ends it and creates a new one
   * 4. If not found, creates a new one
   * 
   * Validates: Requirement 1.4 - New session creation after previous session ends
   * 
   * @param userId - The user's ID
   * @param coachId - The coach's ID
   * @returns The current or newly created session
   * 
   * @example
   * ```typescript
   * const session = await detector.getCurrentSession(userId, coachId);
   * console.log(`Using session: ${session.id}`);
   * ```
   */
  async getCurrentSession(
    userId: string,
    coachId: string
  ): Promise<CoachingSession> {
    try {
      // Check for existing active session
      const { data: existingSession, error: fetchError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is fine
        throw new Error(`Failed to fetch session: ${fetchError.message}`);
      }

      // If we have an active session, check if it should be ended
      if (existingSession) {
        const boundaryCheck = await this.checkSessionBoundary(userId, coachId);
        
        if (boundaryCheck.shouldEndSession) {
          // Session is inactive, end it and create a new one
          await this.endSession(existingSession.id);
          return this.createNewSession(userId, coachId);
        }
        
        // Session is still active, return it
        return existingSession;
      }

      // No active session found, create a new one
      return this.createNewSession(userId, coachId);
    } catch (error) {
      console.error('Error getting current session:', error);
      throw error;
    }
  }

  /**
   * Create a new coaching session
   * 
   * This is a private helper method that creates a new session record
   * in the database with default values.
   * 
   * @param userId - The user's ID
   * @param coachId - The coach's ID
   * @returns The newly created session
   * @private
   */
  private async createNewSession(
    userId: string,
    coachId: string
  ): Promise<CoachingSession> {
    try {
      const newSession: CoachingSessionInsert = {
        user_id: userId,
        coach_id: coachId,
        start_time: new Date().toISOString(),
        message_count: 0,
        status: 'active',
      };

      const { data: session, error } = await supabase
        .from('coaching_sessions')
        .insert(newSession)
        .select()
        .single();

      if (error || !session) {
        throw new Error(`Failed to create session: ${error?.message || 'Unknown error'}`);
      }

      console.log(`Created new session: ${session.id}`);
      return session;
    } catch (error) {
      console.error('Error creating new session:', error);
      throw error;
    }
  }

  /**
   * Increment the message count for a session
   * 
   * This method should be called whenever a new message is added to a session.
   * It updates the message_count field in the coaching_sessions table.
   * 
   * @param sessionId - The session ID to update
   * @throws Error if session not found or update fails
   * 
   * @example
   * ```typescript
   * await detector.incrementMessageCount(sessionId);
   * ```
   */
  async incrementMessageCount(sessionId: string): Promise<void> {
    try {
      // Get current message count
      const { data: session, error: fetchError } = await supabase
        .from('coaching_sessions')
        .select('message_count')
        .eq('id', sessionId)
        .single();

      if (fetchError || !session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Increment message count
      const { error: updateError } = await supabase
        .from('coaching_sessions')
        .update({ message_count: session.message_count + 1 })
        .eq('id', sessionId);

      if (updateError) {
        throw new Error(`Failed to increment message count: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Error incrementing message count:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions (for background job processing)
   * 
   * This method is used by background jobs to find sessions that may need
   * to be ended due to inactivity.
   * 
   * @returns Array of active sessions
   * 
   * @example
   * ```typescript
   * const activeSessions = await detector.getActiveSessions();
   * for (const session of activeSessions) {
   *   const result = await detector.checkSessionBoundary(
   *     session.user_id,
   *     session.coach_id
   *   );
   *   if (result.shouldEndSession) {
   *     await detector.endSession(session.id);
   *   }
   * }
   * ```
   */
  async getActiveSessions(): Promise<CoachingSession[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('status', 'active')
        .order('start_time', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch active sessions: ${error.message}`);
      }

      return sessions || [];
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of SessionDetector
 * 
 * Use this instance throughout the application to ensure consistent
 * session management.
 * 
 * @example
 * ```typescript
 * import { sessionDetector } from '@/lib/sessionDetector';
 * 
 * const session = await sessionDetector.getCurrentSession(userId, coachId);
 * ```
 */
export const sessionDetector = new SessionDetector();
