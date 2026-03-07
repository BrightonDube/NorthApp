import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContextStore } from '../contextStore';
import { useCoachStore } from '../coachStore';
import { useNetworkStore } from '../networkStore';
import { useOfflineQueue } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('Offline Resilience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    
    useContextStore.setState({ items: [], lastSynced: null, error: null, isLoading: false });
    useCoachStore.setState({ coaches: [], lastSynced: null, error: null, isLoading: false });
    useNetworkStore.setState({ isOnline: true });
    useOfflineQueue.setState({ queue: [], isProcessing: false });

    // Mock authenticated user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
  });

  describe('Offline Queue Integration (Task 17.3)', () => {
    it('should queue createContext action when offline', async () => {
      // Set offline
      useNetworkStore.setState({ isOnline: false });

      const { result: contextResult } = renderHook(() => useContextStore());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      // Perform action
      await act(async () => {
        await contextResult.current.createContext('goals', 'Test Goal');
      });

      // Verify queue
      expect(queueResult.current.queue).toHaveLength(1);
      expect(queueResult.current.queue[0].type).toBe('create_context');
      expect(queueResult.current.queue[0].payload).toEqual(expect.objectContaining({
        category: 'goals',
        content: 'Test Goal',
      }));

      // Verify optimistic update
      expect(contextResult.current.items).toHaveLength(1);
      expect(contextResult.current.items[0].content).toBe('Test Goal');
      expect(contextResult.current.items[0].id).toContain('temp-');

      // Verify NO network call
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should queue createCoach action when offline', async () => {
      useNetworkStore.setState({ isOnline: false });

      const { result: coachResult } = renderHook(() => useCoachStore());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await coachResult.current.createCoach('Test Coach', '🚀', 'System Prompt');
      });

      expect(queueResult.current.queue).toHaveLength(1);
      expect(queueResult.current.queue[0].type).toBe('create_coach');
      
      expect(coachResult.current.coaches).toHaveLength(1);
      expect(coachResult.current.coaches[0].name).toBe('Test Coach');

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should process queue when back online', async () => {
      // 1. Queue an item
      useNetworkStore.setState({ isOnline: false });
      const { result: contextResult } = renderHook(() => useContextStore());
      const { result: queueResult } = renderHook(() => useOfflineQueue());

      await act(async () => {
        await contextResult.current.createContext('goals', 'Offline Goal');
      });

      expect(queueResult.current.queue).toHaveLength(1);
      const optimisticId = contextResult.current.items[0].id;

      // 2. Go online
      useNetworkStore.setState({ isOnline: true });

      // Mock network success for processing
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
                data: {
                    id: 'server-id-123',
                    user_id: 'user-123',
                    category: 'goals',
                    content: 'Offline Goal',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                error: null,
            })
        })
      });
      (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });

      // 3. Process Queue
      await act(async () => {
        await queueResult.current.processQueue();
      });

      // Verify queue is empty
      expect(queueResult.current.queue).toHaveLength(0);

      // Verify network call was made
      expect(supabase.from).toHaveBeenCalledWith('user_context');
      expect(mockInsert).toHaveBeenCalled();

      // Verify items updated (optimistic ID replaced with server ID)
      // Note: The store replaces by mapping. 
      // Since we mocked the return value, the store should update the item with 'server-id-123'
      // BUT `createContext` was called again. `createContext` does optimistic update internally.
      // We passed `optimisticId` to it in queue processing.
      // So it should have found the existing temp item and replaced it.
      
      expect(contextResult.current.items).toHaveLength(1);
      // Wait for state update if async
      await waitFor(() => {
          expect(contextResult.current.items[0].id).toBe('server-id-123');
      });
    });
  });

  describe('Cache Invalidation (Task 17.2)', () => {
    it('should fetch if cache is stale (>24h)', async () => {
      useNetworkStore.setState({ isOnline: true });
      const { result } = renderHook(() => useContextStore());

      // Set stale state
      useContextStore.setState({ 
        lastSynced: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      });

      // Mock fetch
      const mockSelect = jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null })
          })
      });
      (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

      await act(async () => {
        await result.current.fetchContexts();
      });

      expect(supabase.from).toHaveBeenCalledWith('user_context');
    });

    it('should NOT fetch if cache is fresh (<24h)', async () => {
      useNetworkStore.setState({ isOnline: true });
      const { result } = renderHook(() => useContextStore());

      // Set fresh state
      useContextStore.setState({ 
        lastSynced: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
      });

      await act(async () => {
        await result.current.fetchContexts();
      });

      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch if forced even if fresh', async () => {
        useNetworkStore.setState({ isOnline: true });
        const { result } = renderHook(() => useContextStore());
  
        // Set fresh state
        useContextStore.setState({ 
          lastSynced: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago
        });

        // Mock fetch
        const mockSelect = jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: [], error: null })
            })
        });
        (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });
  
        await act(async () => {
          await result.current.fetchContexts(true); // force = true
        });
  
        expect(supabase.from).toHaveBeenCalledWith('user_context');
      });
  });
});
