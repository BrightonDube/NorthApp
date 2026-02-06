/**
 * Chat Store Pagination Tests
 * 
 * Unit tests for message pagination functionality in chatStore.
 * Validates that messages are loaded in pages of 50 and older messages
 * are prepended correctly.
 * 
 * Feature: north-mobile-app
 * Task: Implement message pagination (load 50 at a time)
 * 
 * Validates: Requirements 8.6, 20.3 (Memory Management)
 */

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from '../chatStore';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

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

describe('ChatStore Pagination Tests', () => {
  const sessionId = 'test-session-123';

  beforeEach(() => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Initial load fetches first 50 messages
   */
  it('should load first 50 messages on initial fetch', async () => {
    // Create 50 mock messages
    const mockMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      chat_session_id: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    // Mock database response
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockMessages,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 0);
    });

    // Verify messages were loaded
    const messages = result.current.messages[sessionId];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(50);
    expect(messages[0].id).toBe('msg-0');
    expect(messages[49].id).toBe('msg-49');
  });

  /**
   * Test: Loading more messages prepends older messages
   */
  it('should prepend older messages when loading more', async () => {
    // Setup: Store already has 50 messages (msg-50 to msg-99)
    const existingMessages: Message[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i + 50}`,
      chatSessionId: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 50}`,
      createdAt: new Date(Date.now() + (i + 50) * 1000).toISOString(),
    }));

    useChatStore.setState({
      sessions: {},
      messages: {
        [sessionId]: existingMessages,
      },
      streamingMessage: null,
      streamingSessionId: null,
      isSending: false,
      isLoading: false,
      error: null,
      lastSynced: Date.now(),
    });

    // Mock older messages (msg-0 to msg-49)
    const olderMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      chat_session_id: sessionId,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: olderMessages,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 50);
    });

    // Verify older messages were prepended
    const messages = result.current.messages[sessionId];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(100);
    
    // Verify order: older messages first, then existing messages
    expect(messages[0].id).toBe('msg-0');
    expect(messages[49].id).toBe('msg-49');
    expect(messages[50].id).toBe('msg-50');
    expect(messages[99].id).toBe('msg-99');
  });

  /**
   * Test: Pagination with offset parameter
   */
  it('should use correct offset when fetching paginated messages', async () => {
    const mockMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i + 100}`,
      chat_session_id: sessionId,
      role: 'user',
      content: `Message ${i + 100}`,
      created_at: new Date(Date.now() + (i + 100) * 1000).toISOString(),
    }));

    const mockRange = jest.fn().mockResolvedValue({
      data: mockMessages,
      error: null,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: mockRange,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 100);
    });

    // Verify range was called with correct offset
    expect(mockRange).toHaveBeenCalledWith(100, 149);
  });

  /**
   * Test: Loading fewer than 50 messages indicates no more messages
   */
  it('should handle partial page when fewer messages are available', async () => {
    // Only 30 messages available
    const mockMessages = Array.from({ length: 30 }, (_, i) => ({
      id: `msg-${i}`,
      chat_session_id: sessionId,
      role: 'user',
      content: `Message ${i}`,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockMessages,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 0);
    });

    // Verify only 30 messages were loaded
    const messages = result.current.messages[sessionId];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(30);
  });

  /**
   * Test: Offset 0 replaces existing messages
   */
  it('should replace messages when offset is 0', async () => {
    // Setup: Store has old messages
    const oldMessages: Message[] = Array.from({ length: 10 }, (_, i) => ({
      id: `old-msg-${i}`,
      chatSessionId: sessionId,
      role: 'user',
      content: `Old message ${i}`,
      createdAt: new Date(Date.now() - 10000 + i * 1000).toISOString(),
    }));

    useChatStore.setState({
      sessions: {},
      messages: {
        [sessionId]: oldMessages,
      },
      streamingMessage: null,
      streamingSessionId: null,
      isSending: false,
      isLoading: false,
      error: null,
      lastSynced: Date.now(),
    });

    // Mock new messages
    const newMessages = Array.from({ length: 50 }, (_, i) => ({
      id: `new-msg-${i}`,
      chat_session_id: sessionId,
      role: 'user',
      content: `New message ${i}`,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: newMessages,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 0);
    });

    // Verify old messages were replaced
    const messages = result.current.messages[sessionId];
    expect(messages).toBeDefined();
    expect(messages.length).toBe(50);
    expect(messages[0].id).toBe('new-msg-0');
    expect(messages.every(m => m.id.startsWith('new-msg'))).toBe(true);
  });

  /**
   * Test: Chronological order maintained with pagination
   */
  it('should maintain chronological order when paginating', async () => {
    // Load first page (most recent 50 messages)
    const firstPage = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i + 50}`,
      chat_session_id: sessionId,
      role: 'user',
      content: `Message ${i + 50}`,
      created_at: new Date(Date.now() + (i + 50) * 1000).toISOString(),
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: firstPage,
              error: null,
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useChatStore());

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 0);
    });

    // Load second page (older messages with earlier timestamps)
    const secondPage = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      chat_session_id: sessionId,
      role: 'user',
      content: `Message ${i}`,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    }));

    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: secondPage,
              error: null,
            }),
          }),
        }),
      }),
    });

    await act(async () => {
      await result.current.fetchMessages(sessionId, 50, 50);
    });

    // Verify chronological order (older messages prepended)
    const messages = result.current.messages[sessionId];
    expect(messages.length).toBe(100);
    
    // First message should be from second page (oldest)
    expect(messages[0].id).toBe('msg-0');
    // Last message should be from first page (newest)
    expect(messages[99].id).toBe('msg-99');
    
    // Verify all messages are in chronological order
    for (let i = 0; i < messages.length - 1; i++) {
      const currentTime = new Date(messages[i].createdAt).getTime();
      const nextTime = new Date(messages[i + 1].createdAt).getTime();
      expect(currentTime).toBeLessThanOrEqual(nextTime);
    }
  });
});
