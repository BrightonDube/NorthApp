/**
 * Property-Based Tests for Session Detection
 * 
 * Feature: session-reports-memory
 * Task: 2.2 Write property tests for session detection
 * 
 * These tests verify the correctness properties for session boundary detection,
 * explicit session ending, and new session creation after a session ends.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.4**
 */

import fc from 'fast-check';
import { SessionDetector, SESSION_CONFIG } from '../../lib/sessionDetector';
import { supabase } from '../../lib/supabase';
import { runPropertyTest, property, uuidArbitrary } from '../utils/property-helpers';
import type { CoachingSession } from '../../lib/database.types';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Feature: session-reports-memory - Session Detection Properties', () => {
  let detector: SessionDetector;

  beforeEach(() => {
    detector = new SessionDetector();
    jest.clearAllMocks();
  });

  /**
   * Property 1: Session Inactivity Timeout
   * 
   * For any active session, if the time since the last message exceeds 30 minutes,
   * then the session should be marked as ended.
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Session Inactivity Timeout', () => {
    it('should mark session as ended when inactive for more than 30 minutes', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 31, max: 1000 }), // Minutes of inactivity (>30)
          async (userId, coachId, sessionId, inactivityMinutes) => {
            // Setup: Create a session with a last message time that exceeds threshold
            const now = new Date();
            const lastMessageTime = new Date(now.getTime() - inactivityMinutes * 60 * 1000);
            const sessionStartTime = new Date(lastMessageTime.getTime() - 5 * 60 * 1000); // Started 5 min before last message

            const mockSession: CoachingSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: null,
              message_count: 5,
              status: 'active',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionStartTime.toISOString(),
            };

            const mockChatSessionId = fc.sample(uuidArbitrary, 1)[0];

            // Mock database responses
            const mockSessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            const mockMessagesQuery = {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [{ created_at: lastMessageTime.toISOString(), chat_session_id: mockChatSessionId }],
                error: null,
              }),
            };

            const mockChatSessionsQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
            };

            (supabase.from as jest.Mock)
              .mockReturnValueOnce(mockSessionQuery)
              .mockReturnValueOnce(mockMessagesQuery)
              .mockReturnValueOnce({
                ...mockChatSessionsQuery,
                eq: jest.fn().mockReturnValue({
                  ...mockChatSessionsQuery,
                  eq: jest.fn().mockResolvedValue({
                    data: [{ id: mockChatSessionId }],
                    error: null,
                  }),
                }),
              });

            // Execute
            const result = await detector.checkSessionBoundary(userId, coachId);

            // Verify: Session should be marked for ending
            expect(result.shouldEndSession).toBe(true);
            expect(result.sessionId).toBe(sessionId);
            expect(result.timeSinceLastMessage).toBeGreaterThan(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);
          }
        )
      );
    });

    it('should NOT mark session as ended when inactive for less than 30 minutes', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 0, max: 29 }), // Minutes of inactivity (<30)
          async (userId, coachId, sessionId, inactivityMinutes) => {
            // Setup: Create a session with a last message time within threshold
            const now = new Date();
            const lastMessageTime = new Date(now.getTime() - inactivityMinutes * 60 * 1000);
            const sessionStartTime = new Date(lastMessageTime.getTime() - 5 * 60 * 1000);

            const mockSession: CoachingSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: null,
              message_count: 5,
              status: 'active',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionStartTime.toISOString(),
            };

            const mockChatSessionId = fc.sample(uuidArbitrary, 1)[0];

            // Mock database responses
            const mockSessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            const mockMessagesQuery = {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [{ created_at: lastMessageTime.toISOString(), chat_session_id: mockChatSessionId }],
                error: null,
              }),
            };

            const mockChatSessionsQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
            };

            (supabase.from as jest.Mock)
              .mockReturnValueOnce(mockSessionQuery)
              .mockReturnValueOnce(mockMessagesQuery)
              .mockReturnValueOnce({
                ...mockChatSessionsQuery,
                eq: jest.fn().mockReturnValue({
                  ...mockChatSessionsQuery,
                  eq: jest.fn().mockResolvedValue({
                    data: [{ id: mockChatSessionId }],
                    error: null,
                  }),
                }),
              });

            // Execute
            const result = await detector.checkSessionBoundary(userId, coachId);

            // Verify: Session should NOT be marked for ending
            expect(result.shouldEndSession).toBe(false);
            expect(result.sessionId).toBe(sessionId);
            expect(result.timeSinceLastMessage).toBeLessThanOrEqual(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);
          }
        )
      );
    });
  });

  /**
   * Property 2: Explicit Session Ending
   * 
   * For any active session, when the end session function is called,
   * the session status should immediately change to "ended".
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: Explicit Session Ending', () => {
    it('should change session status to "ended" when endSession is called', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 1, max: 100 }), // Message count
          async (userId, coachId, sessionId, messageCount) => {
            // Setup: Create an active session
            const sessionStartTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

            const mockSession: CoachingSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: null,
              message_count: messageCount,
              status: 'active',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionStartTime.toISOString(),
            };

            // Mock database responses
            const mockFetchQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            const mockUpdateQuery = {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ error: null }),
            };

            (supabase.from as jest.Mock)
              .mockReturnValueOnce(mockFetchQuery)
              .mockReturnValueOnce(mockUpdateQuery);

            // Execute
            await detector.endSession(sessionId);

            // Verify: Update was called with correct parameters
            expect(mockUpdateQuery.update).toHaveBeenCalledWith(
              expect.objectContaining({
                status: 'ended',
                end_time: expect.any(String),
              })
            );
            expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', sessionId);
          }
        )
      );
    });

    it('should handle already ended sessions gracefully', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (userId, coachId, sessionId) => {
            // Clear mocks before each property test iteration
            jest.clearAllMocks();

            // Setup: Create an already ended session
            const sessionStartTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
            const sessionEndTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

            const mockSession: CoachingSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: sessionEndTime.toISOString(),
              message_count: 10,
              status: 'ended',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionEndTime.toISOString(),
            };

            // Mock database responses
            const mockFetchQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            (supabase.from as jest.Mock).mockReturnValue(mockFetchQuery);

            // Execute - should not throw
            await expect(detector.endSession(sessionId)).resolves.not.toThrow();

            // Verify: Update should not be called for already ended sessions
            expect(supabase.from).toHaveBeenCalledTimes(1); // Only fetch, no update
          }
        )
      );
    });
  });

  /**
   * Property 4: New Session After End
   * 
   * For any ended session, when a new message is sent by the same user to the same coach,
   * a new session should be created rather than reusing the ended session.
   * 
   * **Validates: Requirements 1.4**
   */
  describe('Property 4: New Session After End', () => {
    it('should create a new session when previous session has ended', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 31, max: 1000 }), // Minutes since last message (>30)
          async (userId, coachId, oldSessionId, newSessionId, inactivityMinutes) => {
            // Setup: Create an ended session (inactive for >30 minutes)
            const now = new Date();
            const lastMessageTime = new Date(now.getTime() - inactivityMinutes * 60 * 1000);
            const sessionStartTime = new Date(lastMessageTime.getTime() - 60 * 60 * 1000);

            const mockOldSession: CoachingSession = {
              id: oldSessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: null,
              message_count: 10,
              status: 'active',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionStartTime.toISOString(),
            };

            const mockNewSession: CoachingSession = {
              id: newSessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: now.toISOString(),
              end_time: null,
              message_count: 0,
              status: 'active',
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            };

            const mockChatSessionId = fc.sample(uuidArbitrary, 1)[0];

            // Mock database responses for getCurrentSession flow
            const mockFetchSessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: mockOldSession, error: null }),
            };

            const mockCheckBoundarySessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockOldSession, error: null }),
            };

            const mockMessagesQuery = {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [{ created_at: lastMessageTime.toISOString(), chat_session_id: mockChatSessionId }],
                error: null,
              }),
            };

            const mockChatSessionsQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
            };

            const mockEndSessionFetchQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockOldSession, error: null }),
            };

            const mockEndSessionUpdateQuery = {
              update: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({ error: null }),
            };

            const mockInsertQuery = {
              insert: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockNewSession, error: null }),
            };

            // Setup mock call sequence
            (supabase.from as jest.Mock)
              .mockReturnValueOnce(mockFetchSessionQuery) // getCurrentSession fetch
              .mockReturnValueOnce(mockCheckBoundarySessionQuery) // checkSessionBoundary session fetch
              .mockReturnValueOnce(mockMessagesQuery) // checkSessionBoundary messages fetch
              .mockReturnValueOnce({
                ...mockChatSessionsQuery,
                eq: jest.fn().mockReturnValue({
                  ...mockChatSessionsQuery,
                  eq: jest.fn().mockResolvedValue({
                    data: [{ id: mockChatSessionId }],
                    error: null,
                  }),
                }),
              }) // checkSessionBoundary chat sessions fetch
              .mockReturnValueOnce(mockEndSessionFetchQuery) // endSession fetch
              .mockReturnValueOnce(mockEndSessionUpdateQuery) // endSession update
              .mockReturnValueOnce(mockInsertQuery); // createNewSession insert

            // Execute
            const session = await detector.getCurrentSession(userId, coachId);

            // Verify: A new session was created (not the old one)
            expect(session.id).toBe(newSessionId);
            expect(session.id).not.toBe(oldSessionId);
            expect(session.status).toBe('active');
            expect(session.message_count).toBe(0);
            expect(session.user_id).toBe(userId);
            expect(session.coach_id).toBe(coachId);

            // Verify: Old session was ended
            expect(mockEndSessionUpdateQuery.update).toHaveBeenCalledWith(
              expect.objectContaining({
                status: 'ended',
                end_time: expect.any(String),
              })
            );
          }
        )
      );
    });

    it('should reuse active session when it has not expired', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          fc.integer({ min: 0, max: 29 }), // Minutes since last message (<30)
          async (userId, coachId, sessionId, inactivityMinutes) => {
            // Setup: Create an active session (inactive for <30 minutes)
            const now = new Date();
            const lastMessageTime = new Date(now.getTime() - inactivityMinutes * 60 * 1000);
            const sessionStartTime = new Date(lastMessageTime.getTime() - 60 * 60 * 1000);

            const mockSession: CoachingSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              start_time: sessionStartTime.toISOString(),
              end_time: null,
              message_count: 10,
              status: 'active',
              created_at: sessionStartTime.toISOString(),
              updated_at: sessionStartTime.toISOString(),
            };

            const mockChatSessionId = fc.sample(uuidArbitrary, 1)[0];

            // Mock database responses
            const mockFetchSessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            const mockCheckBoundarySessionQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({ data: mockSession, error: null }),
            };

            const mockMessagesQuery = {
              select: jest.fn().mockReturnThis(),
              gte: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
              limit: jest.fn().mockResolvedValue({
                data: [{ created_at: lastMessageTime.toISOString(), chat_session_id: mockChatSessionId }],
                error: null,
              }),
            };

            const mockChatSessionsQuery = {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
            };

            (supabase.from as jest.Mock)
              .mockReturnValueOnce(mockFetchSessionQuery)
              .mockReturnValueOnce(mockCheckBoundarySessionQuery)
              .mockReturnValueOnce(mockMessagesQuery)
              .mockReturnValueOnce({
                ...mockChatSessionsQuery,
                eq: jest.fn().mockReturnValue({
                  ...mockChatSessionsQuery,
                  eq: jest.fn().mockResolvedValue({
                    data: [{ id: mockChatSessionId }],
                    error: null,
                  }),
                }),
              });

            // Execute
            const session = await detector.getCurrentSession(userId, coachId);

            // Verify: Same session was returned (not a new one)
            expect(session.id).toBe(sessionId);
            expect(session.status).toBe('active');
            expect(session.message_count).toBe(10);
            expect(session.user_id).toBe(userId);
            expect(session.coach_id).toBe(coachId);

            // Verify: No insert was called (session was reused)
            const fromCalls = (supabase.from as jest.Mock).mock.calls;
            const insertCalls = fromCalls.filter(call => {
              const returnValue = (supabase.from as jest.Mock).mock.results.find(
                result => result.value && typeof result.value.insert === 'function'
              );
              return returnValue !== undefined;
            });
            expect(insertCalls.length).toBe(0);
          }
        )
      );
    });
  });
});
