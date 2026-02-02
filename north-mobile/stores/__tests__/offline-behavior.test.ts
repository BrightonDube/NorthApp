import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContextStore } from '../contextStore';
import { useCoachStore } from '../coachStore';
import { useChatStore } from '../chatStore';
import { useNetworkStore } from '../networkStore';
import { useOfflineQueue } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';

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

describe('Offline Behavior (Task 17.7)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    useContextStore.setState({ items: [], lastSynced: null, error: null, isLoading: false });
    useCoachStore.setState({ coaches: [], lastSynced: null, error: null, isLoading: false });
    useChatStore.setState({ sessions: {}, messages: {}, error: null, isLoading: false, isSending: false });
    useNetworkStore.setState({ isOnline: true });
    useOfflineQueue.setState({ queue: [], isProcessing: false });

    // Mock authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    });
  });

  describe('Optimistic Updates & Queuing', () => {
    it('should queues context creation when offline', async () => {
      useNetworkStore.setState({ isOnline: false });
      const { result } = renderHook(() => useContextStore());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.createContext('values', 'Test Value');
      });

      // Should have optimistic item
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].content).toBe('Test Value');
      
      // Should be queued
      expect(queueResult.current.queue).toHaveLength(1);
      expect(queueResult.current.queue[0].type).toBe('create_context');
      
      // Should NOT call supabase
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should queues coach creation when offline', async () => {
      useNetworkStore.setState({ isOnline: false });
      const { result } = renderHook(() => useCoachStore());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await result.current.createCoach('My Coach', '🤖', 'Prompt');
      });

      expect(result.current.coaches).toHaveLength(1);
      expect(queueResult.current.queue).toHaveLength(1);
      expect(queueResult.current.queue[0].type).toBe('create_coach');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Chat Offline Behavior', () => {
    it('should BLOCK sending messages when offline (no queue support yet)', async () => {
      useNetworkStore.setState({ isOnline: false });
      const { result } = renderHook(() => useChatStore());

      await expect(
        result.current.sendMessage('session-1', 'coach-1', 'Hello')
      ).rejects.toThrow("You're offline");

      // Should not be optimistic updated if it throws immediately
      // Wait, let's check implementation. 
      // It throws immediately before optimistic update in `sendMessage`.
      expect(result.current.messages['session-1']).toBeUndefined();
    });
  });

  describe('Queue Processing', () => {
    it('should process queue when network restores', async () => {
      // 1. Setup offline queue with one item
      useOfflineQueue.setState({
        queue: [{
          id: 'action-1',
          type: 'create_context',
          payload: { category: 'values', content: 'Queued Value', optimisticId: 'temp-1' },
          createdAt: Date.now(),
          retryCount: 0
        }]
      });

      // 2. Set online and trigger processing
      useNetworkStore.setState({ isOnline: true });
      
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'real-id', user_id: 'user-123', category: 'values', content: 'Queued Value' },
            error: null
          })
        })
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      const { result: queueResult } = renderHook(() => useOfflineQueue());
      
      await act(async () => {
        await queueResult.current.processQueue();
      });

      expect(queueResult.current.queue).toHaveLength(0);
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
