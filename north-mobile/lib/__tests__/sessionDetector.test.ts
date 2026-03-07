/**
 * Unit Tests for SessionDetector
 * 
 * These tests verify the core functionality of the SessionDetector class
 * including session boundary detection, explicit session ending, and
 * session creation.
 * 
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { SessionDetector, SESSION_CONFIG } from '../sessionDetector';
import { supabase } from '../supabase';
import type { CoachingSession } from '../database.types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('SessionDetector', () => {
  let detector: SessionDetector;
  const mockUserId = 'user-123';
  const mockCoachId = 'coach-456';
  const mockSessionId = 'session-789';

  beforeEach(() => {
    detector = new SessionDetector();
    jest.clearAllMocks();
  });

  describe('checkSessionBoundary', () => {
    it('should return shouldEndSession=false when no active session exists', async () => {
      // Mock no active session found
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116', message: 'No rows returned' },
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await detector.checkSessionBoundary(mockUserId, mockCoachId);

      expect(result.shouldEndSession).toBe(false);
      expect(result.sessionId).toBeUndefined();
      expect(result.lastMessageTime).toBeUndefined();
    });

    it('should return shouldEndSession=true when session is inactive for >30 minutes', async () => {
      const now = new Date();
      const lastMessageTime = new Date(now.getTime() - 35 * 60 * 1000); // 35 minutes ago
      const sessionStartTime = new Date(now.getTime() - 40 * 60 * 1000); // 40 minutes ago

      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: sessionStartTime.toISOString(),
        end_time: null,
        message_count: 5,
        status: 'active',
        created_at: sessionStartTime.toISOString(),
        updated_at: sessionStartTime.toISOString(),
      };

      // Mock active session found
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock last message query
      const mockMessageQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{
                  created_at: lastMessageTime.toISOString(),
                  chat_session_id: 'chat-123',
                }],
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock chat sessions query
      const mockChatSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'chat-123' }],
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockMessageQuery)
        .mockReturnValueOnce(mockChatSessionsQuery);

      const result = await detector.checkSessionBoundary(mockUserId, mockCoachId);

      expect(result.shouldEndSession).toBe(true);
      expect(result.sessionId).toBe(mockSessionId);
      expect(result.lastMessageTime).toEqual(lastMessageTime);
      expect(result.timeSinceLastMessage).toBeGreaterThan(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);
    });

    it('should return shouldEndSession=false when session is active within 30 minutes', async () => {
      const now = new Date();
      const lastMessageTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
      const sessionStartTime = new Date(now.getTime() - 20 * 60 * 1000); // 20 minutes ago

      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: sessionStartTime.toISOString(),
        end_time: null,
        message_count: 5,
        status: 'active',
        created_at: sessionStartTime.toISOString(),
        updated_at: sessionStartTime.toISOString(),
      };

      // Mock active session found
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock last message query
      const mockMessageQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{
                  created_at: lastMessageTime.toISOString(),
                  chat_session_id: 'chat-123',
                }],
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock chat sessions query
      const mockChatSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'chat-123' }],
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockMessageQuery)
        .mockReturnValueOnce(mockChatSessionsQuery);

      const result = await detector.checkSessionBoundary(mockUserId, mockCoachId);

      expect(result.shouldEndSession).toBe(false);
      expect(result.sessionId).toBe(mockSessionId);
      expect(result.lastMessageTime).toEqual(lastMessageTime);
      expect(result.timeSinceLastMessage).toBeLessThan(SESSION_CONFIG.INACTIVITY_THRESHOLD_MS);
    });

    it('should use session start time when no messages found', async () => {
      const now = new Date();
      const sessionStartTime = new Date(now.getTime() - 35 * 60 * 1000); // 35 minutes ago

      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: sessionStartTime.toISOString(),
        end_time: null,
        message_count: 0,
        status: 'active',
        created_at: sessionStartTime.toISOString(),
        updated_at: sessionStartTime.toISOString(),
      };

      // Mock active session found
      const mockSessionQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock no messages found
      const mockMessageQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock chat sessions query
      const mockChatSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'chat-123' }],
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSessionQuery)
        .mockReturnValueOnce(mockMessageQuery)
        .mockReturnValueOnce(mockChatSessionsQuery);

      const result = await detector.checkSessionBoundary(mockUserId, mockCoachId);

      expect(result.shouldEndSession).toBe(true);
      expect(result.sessionId).toBe(mockSessionId);
      expect(result.lastMessageTime).toEqual(sessionStartTime);
    });
  });

  describe('endSession', () => {
    it('should successfully end an active session', async () => {
      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: new Date().toISOString(),
        end_time: null,
        message_count: 5,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock session fetch
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      // Mock session update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockSession, status: 'ended', end_time: new Date().toISOString() },
            error: null,
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      await expect(detector.endSession(mockSessionId)).resolves.not.toThrow();
    });

    it('should throw error when session not found', async () => {
      // Mock session not found
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFetchQuery);

      await expect(detector.endSession(mockSessionId)).rejects.toThrow('Session not found');
    });

    it('should not update session if already ended', async () => {
      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        message_count: 5,
        status: 'ended',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock session fetch
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockFetchQuery);

      await expect(detector.endSession(mockSessionId)).resolves.not.toThrow();
      
      // Verify update was not called (only fetch was called)
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCurrentSession', () => {
    it('should return existing active session if not expired', async () => {
      const now = new Date();
      const sessionStartTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
      const lastMessageTime = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

      const mockSession: CoachingSession = {
        id: mockSessionId,
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: sessionStartTime.toISOString(),
        end_time: null,
        message_count: 5,
        status: 'active',
        created_at: sessionStartTime.toISOString(),
        updated_at: sessionStartTime.toISOString(),
      };

      // Mock existing session query (for getCurrentSession)
      const mockSessionQuery1 = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock session query for boundary check
      const mockSessionQuery2 = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock message query for boundary check
      const mockMessageQuery = {
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: [{
                  created_at: lastMessageTime.toISOString(),
                  chat_session_id: 'chat-123',
                }],
                error: null,
              }),
            }),
          }),
        }),
      };

      // Mock chat sessions query
      const mockChatSessionsQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ id: 'chat-123' }],
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSessionQuery1) // For getCurrentSession
        .mockReturnValueOnce(mockSessionQuery2) // For boundary check session query
        .mockReturnValueOnce(mockMessageQuery) // For boundary check message query
        .mockReturnValueOnce(mockChatSessionsQuery); // For chat sessions query

      const result = await detector.getCurrentSession(mockUserId, mockCoachId);

      expect(result).toEqual(mockSession);
      expect(result.status).toBe('active');
    });

    it('should create new session when no active session exists', async () => {
      const newSession: CoachingSession = {
        id: 'new-session-123',
        user_id: mockUserId,
        coach_id: mockCoachId,
        start_time: new Date().toISOString(),
        end_time: null,
        message_count: 0,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock no existing session
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      // Mock session creation
      const mockInsertQuery = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newSession,
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockInsertQuery);

      const result = await detector.getCurrentSession(mockUserId, mockCoachId);

      expect(result).toEqual(newSession);
      expect(result.status).toBe('active');
      expect(result.message_count).toBe(0);
    });
  });

  describe('incrementMessageCount', () => {
    it('should increment message count successfully', async () => {
      const mockSession = {
        message_count: 5,
      };

      // Mock fetch current count
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockSession,
              error: null,
            }),
          }),
        }),
      };

      // Mock update
      const mockUpdateQuery = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { message_count: 6 },
            error: null,
          }),
        }),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      await expect(detector.incrementMessageCount(mockSessionId)).resolves.not.toThrow();
    });

    it('should throw error when session not found', async () => {
      // Mock session not found
      const mockFetchQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockFetchQuery);

      await expect(detector.incrementMessageCount(mockSessionId)).rejects.toThrow('Session not found');
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions', async () => {
      const mockSessions: CoachingSession[] = [
        {
          id: 'session-1',
          user_id: 'user-1',
          coach_id: 'coach-1',
          start_time: new Date().toISOString(),
          end_time: null,
          message_count: 3,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'session-2',
          user_id: 'user-2',
          coach_id: 'coach-2',
          start_time: new Date().toISOString(),
          end_time: null,
          message_count: 5,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock query
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockSessions,
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const result = await detector.getActiveSessions();

      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no active sessions', async () => {
      // Mock query
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery);

      const result = await detector.getActiveSessions();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
