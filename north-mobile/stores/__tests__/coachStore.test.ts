/**
 * Coach Store Tests
 * 
 * Unit tests for the coachStore to verify basic functionality.
 * 
 * Validates: Requirements 6.2-6.7, 7.1-7.7
 */

import { useCoachStore } from '../coachStore';
import { supabase } from '@/lib/supabase';
import { CoachCategory } from '@/types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('coachStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCoachStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty coaches array initially', () => {
      const { coaches } = useCoachStore.getState();
      expect(coaches).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { isLoading } = useCoachStore.getState();
      expect(isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { error } = useCoachStore.getState();
      expect(error).toBeNull();
    });

    it('should have no lastSynced timestamp initially', () => {
      const { lastSynced } = useCoachStore.getState();
      expect(lastSynced).toBeNull();
    });
  });

  describe('canCreateCoach', () => {
    it('should return true for Pro users', () => {
      const { canCreateCoach } = useCoachStore.getState();
      expect(canCreateCoach(true)).toBe(true);
    });

    it('should return false for free users', () => {
      const { canCreateCoach } = useCoachStore.getState();
      expect(canCreateCoach(false)).toBe(false);
    });
  });

  describe('getDefaultCoaches', () => {
    it('should return only coaches with null creatorId', () => {
      const store = useCoachStore.getState();
      
      // Manually set coaches for testing
      useCoachStore.setState({
        coaches: [
          {
            id: '1',
            name: 'Default Coach',
            icon: '🎯',
            systemPrompt: 'Test prompt',
            creatorId: null,
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'User Coach',
            icon: '🚀',
            systemPrompt: 'Test prompt',
            creatorId: 'user-123',
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      const defaultCoaches = store.getDefaultCoaches();
      expect(defaultCoaches).toHaveLength(1);
      expect(defaultCoaches[0].name).toBe('Default Coach');
    });
  });

  describe('getUserCoaches', () => {
    it('should return only coaches created by the specified user', () => {
      const store = useCoachStore.getState();
      
      // Manually set coaches for testing
      useCoachStore.setState({
        coaches: [
          {
            id: '1',
            name: 'Default Coach',
            icon: '🎯',
            systemPrompt: 'Test prompt',
            creatorId: null,
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'User Coach 1',
            icon: '🚀',
            systemPrompt: 'Test prompt',
            creatorId: 'user-123',
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            name: 'User Coach 2',
            icon: '💡',
            systemPrompt: 'Test prompt',
            creatorId: 'user-456',
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      const userCoaches = store.getUserCoaches('user-123');
      expect(userCoaches).toHaveLength(1);
      expect(userCoaches[0].name).toBe('User Coach 1');
    });
  });

  describe('getCoachById', () => {
    it('should return the coach with the specified ID', () => {
      const store = useCoachStore.getState();
      
      // Manually set coaches for testing
      useCoachStore.setState({
        coaches: [
          {
            id: '1',
            name: 'Test Coach',
            icon: '🎯',
            systemPrompt: 'Test prompt',
            creatorId: null,
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      const coach = store.getCoachById('1');
      expect(coach).toBeDefined();
      expect(coach?.name).toBe('Test Coach');
    });

    it('should return undefined for non-existent ID', () => {
      const store = useCoachStore.getState();
      const coach = store.getCoachById('non-existent');
      expect(coach).toBeUndefined();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      // Set an error
      useCoachStore.setState({ error: 'Test error' });
      expect(useCoachStore.getState().error).toBe('Test error');

      // Clear the error
      useCoachStore.getState().clearError();
      expect(useCoachStore.getState().error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set some state
      useCoachStore.setState({
        coaches: [
          {
            id: '1',
            name: 'Test Coach',
            icon: '🎯',
            systemPrompt: 'Test prompt',
            creatorId: null,
            isPublic: false,
            category: CoachCategory.GENERAL,
            isFeatured: false,
            sourceCoachId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        isLoading: true,
        error: 'Test error',
        lastSynced: Date.now(),
      });

      // Reset
      useCoachStore.getState().reset();

      // Verify reset
      const state = useCoachStore.getState();
      expect(state.coaches).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastSynced).toBeNull();
    });
  });

  describe('fetchCoaches', () => {
    it('should set loading state while fetching', async () => {
      const mockUser = { id: 'user-123' };
      const mockCoaches = [
        {
          id: '1',
          name: 'Test Coach',
          icon: '🎯',
          system_prompt: 'Test prompt',
          creator_id: null,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
      });

      const promise = useCoachStore.getState().fetchCoaches();
      
      // Should be loading
      expect(useCoachStore.getState().isLoading).toBe(true);

      await promise;

      // Should not be loading after completion
      expect(useCoachStore.getState().isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const mockUser = { id: 'user-123' };
      const mockError = new Error('Fetch failed');

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockUser },
      });

      const mockSelect = jest.fn().mockReturnThis();
      const mockOr = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
        or: mockOr,
        order: mockOrder,
      });

      await useCoachStore.getState().fetchCoaches();

      const state = useCoachStore.getState();
      expect(state.error).toBe('Fetch failed');
      expect(state.isLoading).toBe(false);
    });
  });
});
