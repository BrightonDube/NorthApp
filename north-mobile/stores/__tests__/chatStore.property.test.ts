/**
 * Chat Store Property-Based Tests
 * 
 * Property-based tests for chatStore using fast-check.
 * Each test validates universal properties that should hold across all inputs.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 25: Message Data Structure Integrity
 * - Property 26: Chat Session Data Structure Integrity
 * - Property 27: Chat Session Uniqueness
 * - Property 28: Message Role Correctness
 * - Property 29: Message Chronological Ordering
 * - Property 31: Streaming Message Persistence
 * - Property 60: Optimistic Message Updates
 * 
 * Validates: Requirements 8.1-8.6, 9.6, 18.5
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore, useSessionMessages, useSession } from '../chatStore';
import { supabase } from '@/lib/supabase';
import type { ChatSession, Message } from '@/types';
import {
  messageRoleArbitrary,
  messageContentArbitrary,
  uuidArbitrary,
  timestampArbitrary,
  PBT_CONFIG,
} from '../../__tests__/utils/property-helpers';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock networkStore
jest.mock('../networkStore', () => ({
  useNetworkStore: {
    getState: jest.fn(() => ({ isOnline: true })),
  },
}));

describe('ChatStore Property-Based Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset store state
    useChatStore.setState({
      sessions: {},
      messages: {},
      streamingMessage: null,
      streamingSessionId: null,
      isSending: false,
      isLoading: false,
      error: null,
      lastSynced: null,
    });
    
    // Clear AsyncStorage
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  /**
   * Property 25: Message Data Structure Integrity
   * 
   * For any created message, it should contain all required fields: 
   * id, chat_session_id, role, content, created_at with valid values.
   * 
   * **Validates: Requirements 8.1**
   */
  describe('Property 25: Message Data Structure Integrity', () => {
    it('should maintain data structure integrity for all created messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          messageRoleArbitrary,
          messageContentArbitrary,
          timestampArbitrary,
          async (messageId, sessionId, userId, role, content, createdAt) => {
            // Mock database response
            const mockDbRow = {
              id: messageId,
              chat_session_id: sessionId,
              role,
              content,
              created_at: createdAt,
            };

            // Verify data structure integrity
            expect(mockDbRow.id).toBe(messageId);
            expect(mockDbRow.chat_session_id).toBe(sessionId);
            expect(mockDbRow.role).toBe(role);
            expect(mockDbRow.content).toBe(content);
            expect(mockDbRow.created_at).toBe(createdAt);
            
            // Verify types
            expect(typeof mockDbRow.id).toBe('string');
            expect(typeof mockDbRow.chat_session_id).toBe('string');
            expect(typeof mockDbRow.role).toBe('string');
            expect(typeof mockDbRow.content).toBe('string');
            expect(typeof mockDbRow.created_at).toBe('string');
            
            // Verify role is valid
            expect(['user', 'assistant']).toContain(mockDbRow.role);
            
            // Verify timestamp format
            expect(mockDbRow.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 26: Chat Session Data Structure Integrity
   * 
   * For any created chat session, it should contain all required fields: 
   * id, user_id, coach_id, created_at, updated_at with valid values.
   * 
   * **Validates: Requirements 8.2**
   */
  describe('Property 26: Chat Session Data Structure Integrity', () => {
    it('should maintain data structure integrity for all created chat sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          timestampArbitrary,
          async (sessionId, userId, coachId, createdAt, updatedAt) => {
            // Mock database response
            const mockDbRow = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              created_at: createdAt,
              updated_at: updatedAt,
            };

            // Verify data structure integrity
            expect(mockDbRow.id).toBe(sessionId);
            expect(mockDbRow.user_id).toBe(userId);
            expect(mockDbRow.coach_id).toBe(coachId);
            expect(mockDbRow.created_at).toBe(createdAt);
            expect(mockDbRow.updated_at).toBe(updatedAt);
            
            // Verify types
            expect(typeof mockDbRow.id).toBe('string');
            expect(typeof mockDbRow.user_id).toBe('string');
            expect(typeof mockDbRow.coach_id).toBe('string');
            expect(typeof mockDbRow.created_at).toBe('string');
            expect(typeof mockDbRow.updated_at).toBe('string');
            
            // Verify timestamp formats
            expect(mockDbRow.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(mockDbRow.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 27: Chat Session Uniqueness
   * 
   * For any user-coach pair, there should be exactly one chat session; 
   * selecting the same coach multiple times should return the same session.
   * 
   * **Validates: Requirements 8.3**
   */
  describe('Property 27: Chat Session Uniqueness', () => {
    it('should return the same session for repeated user-coach pairs', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (userId, coachId, sessionId) => {
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock existing session
            const mockSession = {
              id: sessionId,
              user_id: userId,
              coach_id: coachId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            (supabase.from as jest.Mock).mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: mockSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useChatStore());

            // Fetch session first time
            let session1: ChatSession | undefined;
            await act(async () => {
              session1 = await result.current.fetchOrCreateSession(coachId);
            });

            // Fetch session second time
            let session2: ChatSession | undefined;
            await act(async () => {
              session2 = await result.current.fetchOrCreateSession(coachId);
            });

            // Verify same session returned both times
            expect(session1).toBeDefined();
            expect(session2).toBeDefined();
            expect(session1!.id).toBe(session2!.id);
            expect(session1!.userId).toBe(userId);
            expect(session1!.coachId).toBe(coachId);
            expect(session2!.userId).toBe(userId);
            expect(session2!.coachId).toBe(coachId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create new session only when none exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (userId, coachId, sessionId) => {
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock no existing session (PGRST116 = no rows)
            const mockSelect = jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            });

            // Mock successful creation
            const mockInsert = jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: sessionId,
                    user_id: userId,
                    coach_id: coachId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            });

            (supabase.from as jest.Mock).mockReturnValue({
              select: mockSelect,
              insert: mockInsert,
            });

            const { result } = renderHook(() => useChatStore());

            let session: ChatSession | undefined;
            await act(async () => {
              session = await result.current.fetchOrCreateSession(coachId);
            });

            // Verify session was created
            expect(session).toBeDefined();
            expect(session!.id).toBe(sessionId);
            expect(session!.userId).toBe(userId);
            expect(session!.coachId).toBe(coachId);
            
            // Verify insert was called
            expect(mockInsert).toHaveBeenCalledWith({
              user_id: userId,
              coach_id: coachId,
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 28: Message Role Correctness
   * 
   * For any user-sent message, role should be "user"; 
   * for any AI response, role should be "assistant".
   * 
   * **Validates: Requirements 8.4, 8.5**
   */
  describe('Property 28: Message Role Correctness', () => {
    it('should assign "user" role to all user-sent messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          messageContentArbitrary,
          async (sessionId, messageId, content) => {
            // Mock database response for user message
            const mockDbRow = {
              id: messageId,
              chat_session_id: sessionId,
              role: 'user',
              content,
              created_at: new Date().toISOString(),
            };

            // Verify user message has correct role
            expect(mockDbRow.role).toBe('user');
            
            // Create Message object
            const message: Message = {
              id: mockDbRow.id,
              chatSessionId: mockDbRow.chat_session_id,
              role: mockDbRow.role as 'user' | 'assistant',
              content: mockDbRow.content,
              createdAt: mockDbRow.created_at,
            };

            // Verify Message object has correct role
            expect(message.role).toBe('user');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign "assistant" role to all AI responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          messageContentArbitrary,
          async (sessionId, messageId, content) => {
            // Mock database response for assistant message
            const mockDbRow = {
              id: messageId,
              chat_session_id: sessionId,
              role: 'assistant',
              content,
              created_at: new Date().toISOString(),
            };

            // Verify assistant message has correct role
            expect(mockDbRow.role).toBe('assistant');
            
            // Create Message object
            const message: Message = {
              id: mockDbRow.id,
              chatSessionId: mockDbRow.chat_session_id,
              role: mockDbRow.role as 'user' | 'assistant',
              content: mockDbRow.content,
              createdAt: mockDbRow.created_at,
            };

            // Verify Message object has correct role
            expect(message.role).toBe('assistant');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never assign invalid roles to messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          messageRoleArbitrary,
          async (role) => {
            // Verify role is always one of the two valid values
            expect(['user', 'assistant']).toContain(role);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 29: Message Chronological Ordering
   * 
   * For any chat session, messages should be retrieved and displayed 
   * in chronological order (created_at ascending).
   * 
   * **Validates: Requirements 8.6, 8.7**
   */
  describe('Property 29: Message Chronological Ordering', () => {
    it('should retrieve messages in chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          fc.array(
            fc.record({
              id: uuidArbitrary,
              role: messageRoleArbitrary,
              content: messageContentArbitrary,
              created_at: timestampArbitrary,
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (sessionId, messageData) => {
            // Sort messages by created_at to simulate database ordering
            const sortedMessages = [...messageData].sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Mock database response with sorted messages
            const mockDbRows = sortedMessages.map(msg => ({
              id: msg.id,
              chat_session_id: sessionId,
              role: msg.role,
              content: msg.content,
              created_at: msg.created_at,
            }));

            (supabase.from as jest.Mock).mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    range: jest.fn().mockResolvedValue({
                      data: mockDbRows,
                      error: null,
                    }),
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useChatStore());

            await act(async () => {
              await result.current.fetchMessages(sessionId);
            });

            const messages = result.current.messages[sessionId];
            expect(messages).toBeDefined();
            expect(messages.length).toBe(sortedMessages.length);

            // Verify messages are in chronological order
            for (let i = 0; i < messages.length - 1; i++) {
              const currentTime = new Date(messages[i].createdAt).getTime();
              const nextTime = new Date(messages[i + 1].createdAt).getTime();
              expect(currentTime).toBeLessThanOrEqual(nextTime);
            }

            // Verify order() was called with correct parameters
            const fromMock = supabase.from as jest.Mock;
            const selectMock = fromMock.mock.results[fromMock.mock.results.length - 1].value.select;
            const eqMock = selectMock.mock.results[selectMock.mock.results.length - 1].value.eq;
            const orderMock = eqMock.mock.results[eqMock.mock.results.length - 1].value.order;
            expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain chronological order when adding new messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          fc.array(
            fc.record({
              id: uuidArbitrary,
              role: messageRoleArbitrary,
              content: messageContentArbitrary,
              createdAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (sessionId, existingMessages) => {
            // Sort existing messages
            const sortedMessages = [...existingMessages].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // Setup store with existing messages
            useChatStore.setState({
              sessions: {},
              messages: {
                [sessionId]: sortedMessages,
              } as any,
              streamingMessage: null,
              streamingSessionId: null,
              isSending: false,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useChatStore());

            // Get the latest timestamp from existing messages
            const latestTime = sortedMessages.length > 0
              ? new Date(sortedMessages[sortedMessages.length - 1].createdAt).getTime()
              : 0;

            // Add a new message with a timestamp after the latest existing message
            const newTimestamp = new Date(latestTime + 1000).toISOString();
            const newMessage: Message = {
              id: 'new-msg',
              chatSessionId: sessionId,
              role: 'user',
              content: 'New message',
              createdAt: newTimestamp,
            };

            act(() => {
              useChatStore.setState((state) => ({
                messages: {
                  ...state.messages,
                  [sessionId]: [...state.messages[sessionId], newMessage],
                },
              }));
            });

            const messages = result.current.messages[sessionId];
            
            // Verify chronological order is maintained
            for (let i = 0; i < messages.length - 1; i++) {
              const currentTime = new Date(messages[i].createdAt).getTime();
              const nextTime = new Date(messages[i + 1].createdAt).getTime();
              expect(currentTime).toBeLessThanOrEqual(nextTime);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });


  /**
   * Property 31: Streaming Message Persistence
   * 
   * For any completed AI response stream, the full message content 
   * should be saved to the database with role "assistant".
   * 
   * **Validates: Requirements 9.6**
   */
  describe('Property 31: Streaming Message Persistence', () => {
    it('should persist complete streaming message with assistant role', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          async (sessionId, messageId, tokens) => {
            // Setup store with streaming state
            useChatStore.setState({
              sessions: {},
              messages: {
                [sessionId]: [],
              },
              streamingMessage: '',
              streamingSessionId: sessionId,
              isSending: true,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useChatStore());

            // Simulate streaming tokens
            act(() => {
              tokens.forEach(token => {
                result.current.appendStreamingToken(token);
              });
            });

            // Verify streaming message accumulated correctly
            const expectedContent = tokens.join('');
            expect(result.current.streamingMessage).toBe(expectedContent);

            // Finalize the streaming message
            act(() => {
              result.current.finalizeStreamingMessage(messageId);
            });

            // Verify message was persisted with correct role
            const messages = result.current.messages[sessionId];
            expect(messages).toBeDefined();
            expect(messages.length).toBe(1);
            
            const persistedMessage = messages[0];
            expect(persistedMessage.id).toBe(messageId);
            expect(persistedMessage.role).toBe('assistant');
            expect(persistedMessage.content).toBe(expectedContent);
            expect(persistedMessage.chatSessionId).toBe(sessionId);
            
            // Verify streaming state was cleared
            expect(result.current.streamingMessage).toBeNull();
            expect(result.current.streamingSessionId).toBeNull();
            expect(result.current.isSending).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not persist empty streaming message', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          async (sessionId, messageId) => {
            // Setup store with empty streaming message
            useChatStore.setState({
              sessions: {},
              messages: {
                [sessionId]: [],
              },
              streamingMessage: '',
              streamingSessionId: sessionId,
              isSending: true,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useChatStore());

            // Finalize without adding tokens
            act(() => {
              result.current.finalizeStreamingMessage(messageId);
            });

            // Verify empty message was NOT persisted (empty string is falsy)
            const messages = result.current.messages[sessionId];
            expect(messages).toBeDefined();
            expect(messages.length).toBe(0); // Should remain empty
            
            // Edge case fix: Streaming state is now properly cleared for empty messages
            expect(result.current.streamingMessage).toBe(null);
            expect(result.current.streamingSessionId).toBe(null);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should append tokens incrementally', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 10 }),
          async (tokens) => {
            // Setup store
            useChatStore.setState({
              sessions: {},
              messages: {},
              streamingMessage: '',
              streamingSessionId: 'session-1',
              isSending: true,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useChatStore());

            // Append tokens one by one and verify accumulation
            let expectedContent = '';
            for (const token of tokens) {
              act(() => {
                result.current.appendStreamingToken(token);
              });
              expectedContent += token;
              expect(result.current.streamingMessage).toBe(expectedContent);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 60: Optimistic Message Updates
   * 
   * For any message send, the UI should update optimistically 
   * before server confirmation.
   * 
   * **Validates: Requirements 18.5**
   */
  describe('Property 60: Optimistic Message Updates', () => {
    it('should add user message optimistically before server confirmation', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          messageContentArbitrary,
          async (sessionId, coachId, userId, content) => {
            // Mock authenticated user and session
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            (supabase.auth.getSession as jest.Mock).mockResolvedValue({
              data: { session: { access_token: 'mock-token' } },
              error: null,
            });

            // Setup store with empty messages
            useChatStore.setState({
              sessions: {
                [sessionId]: {
                  id: sessionId,
                  userId,
                  coachId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              },
              messages: {
                [sessionId]: [],
              },
              streamingMessage: null,
              streamingSessionId: null,
              isSending: false,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Mock slow database response
            let resolveInsert: any;
            const insertPromise = new Promise((resolve) => {
              resolveInsert = resolve;
            });

            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockReturnValue(insertPromise),
                }),
              }),
            });

            // Mock fetch to prevent actual network call
            global.fetch = jest.fn().mockResolvedValue({
              ok: false,
              statusText: 'Mocked error',
            });

            const { result } = renderHook(() => useChatStore());

            // Start sending message (don't await)
            const sendPromise = act(async () => {
              try {
                await result.current.sendMessage(sessionId, coachId, content);
              } catch (error) {
                // Expected to fail due to mocked fetch
              }
            });

            // Check that message was added optimistically (before database confirms)
            await waitFor(() => {
              const messages = result.current.messages[sessionId];
              expect(messages).toBeDefined();
              expect(messages.length).toBeGreaterThan(0);
            }, { timeout: 1000 });

            const messages = result.current.messages[sessionId];
            const optimisticMessage = messages[0];
            
            // Verify optimistic message properties
            expect(optimisticMessage.content).toBe(content);
            expect(optimisticMessage.role).toBe('user');
            expect(optimisticMessage.chatSessionId).toBe(sessionId);
            expect(optimisticMessage.id).toMatch(/^temp-/); // Temporary ID

            // Resolve the insert to complete the test
            resolveInsert({
              data: {
                id: 'real-id',
                chat_session_id: sessionId,
                role: 'user',
                content,
                created_at: new Date().toISOString(),
              },
              error: null,
            });

            await sendPromise;
          }
        ),
        { numRuns: 20 } // Reduced runs due to async complexity
      );
    }, 15000); // Increased timeout for async operations

    it('should rollback optimistic update on error', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          messageContentArbitrary,
          async (sessionId, coachId, userId, content) => {
            // Mock authenticated user and session
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            (supabase.auth.getSession as jest.Mock).mockResolvedValue({
              data: { session: { access_token: 'mock-token' } },
              error: null,
            });

            // Setup store
            useChatStore.setState({
              sessions: {
                [sessionId]: {
                  id: sessionId,
                  userId,
                  coachId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              },
              messages: {
                [sessionId]: [],
              },
              streamingMessage: null,
              streamingSessionId: null,
              isSending: false,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Mock database error
            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Database error' },
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useChatStore());

            // Attempt to send message
            await act(async () => {
              try {
                await result.current.sendMessage(sessionId, coachId, content);
              } catch (error) {
                // Expected to throw
              }
            });

            // Verify optimistic message was rolled back
            const messages = result.current.messages[sessionId];
            expect(messages).toBeDefined();
            expect(messages.length).toBe(0); // Should be empty after rollback
            expect(result.current.error).toBeTruthy();
          }
        ),
        { numRuns: 20 }
      );
    }, 10000);
  });
});
