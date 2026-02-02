/**
 * Tier Check Tests for coachStore
 * 
 * Tests the Pro tier requirement enforcement in coach creation.
 * This is a focused test file to verify the tier check implementation.
 * 
 * Validates: Requirements 6.4, 7.4
 */

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock networkStore to always return online
jest.mock('../networkStore', () => ({
  useNetworkStore: {
    getState: jest.fn().mockReturnValue({ isOnline: true }),
  },
}));

// Mock AsyncStorage to prevent persistence during tests
jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(() => Promise.resolve(null)),
      setItem: jest.fn(() => Promise.resolve()),
      removeItem: jest.fn(() => Promise.resolve(undefined)),
      clear: jest.fn(() => Promise.resolve()),
    },
  };
});

import { useCoachStore } from '../coachStore';

describe('coachStore - Tier Check Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.getState().reset();
    
    const { useNetworkStore } = require('../networkStore');
    useNetworkStore.getState.mockReturnValue({ isOnline: true });
  });

  afterEach(() => {
    jest.clearAllMocks();
    useCoachStore.getState().reset();
  });

  describe('canCreateCoach function', () => {
    it('should return true for Pro users', () => {
      const canCreate = useCoachStore.getState().canCreateCoach(true);
      expect(canCreate).toBe(true);
    });

    it('should return false for Free users', () => {
      const canCreate = useCoachStore.getState().canCreateCoach(false);
      expect(canCreate).toBe(false);
    });
  });

  describe('createCoach function - Pro enforcement', () => {
    it('should reject coach creation for Free users when isProUser=false', async () => {
      await expect(
        useCoachStore.getState().createCoach(
          'Test Coach',
          '🚀',
          'Test system prompt',
          undefined,
          false // Free user
        )
      ).rejects.toThrow('Coach creation requires Pro subscription');

      // Verify error was set in store
      const state = useCoachStore.getState();
      expect(state.error).toBe('Coach creation requires Pro subscription');

      // Verify no coach was added to store
      expect(state.coaches.length).toBe(0);
    });

    it('should allow coach creation for Pro users when isProUser=true', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockCoachId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCreatedAt = new Date().toISOString();
      const mockUpdatedAt = new Date().toISOString();
      
      // Mock successful creation
      supabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockCoachId,
                name: 'Pro Coach',
                icon: '🚀',
                system_prompt: 'Test prompt for Pro user',
                creator_id: null,
                is_public: false,
                created_at: mockCreatedAt,
                updated_at: mockUpdatedAt,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await useCoachStore.getState().createCoach(
        'Pro Coach',
        '🚀',
        'Test prompt for Pro user',
        undefined,
        true // Pro user
      );

      // Verify coach was created successfully
      expect(result).toBeDefined();
      expect(result.name).toBe('Pro Coach');
      expect(result.icon).toBe('🚀');
      expect(result.systemPrompt).toBe('Test prompt for Pro user');

      // Verify no error was set
      const state = useCoachStore.getState();
      expect(state.error).toBeNull();
    });

    it('should allow coach creation when isProUser is undefined (backward compatibility)', async () => {
      const { supabase } = require('@/lib/supabase');
      
      const mockCoachId = '123e4567-e89b-12d3-a456-426614174001';
      const mockCreatedAt = new Date().toISOString();
      const mockUpdatedAt = new Date().toISOString();
      
      // Mock successful creation
      supabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockCoachId,
                name: 'Legacy Coach',
                icon: '🎯',
                system_prompt: 'Test prompt without tier check',
                creator_id: null,
                is_public: false,
                created_at: mockCreatedAt,
                updated_at: mockUpdatedAt,
              },
              error: null,
            }),
          }),
        }),
      });

      // Call without isProUser parameter (undefined)
      const result = await useCoachStore.getState().createCoach(
        'Legacy Coach',
        '🎯',
        'Test prompt without tier check'
        // No isProUser parameter
      );

      // Verify coach was created successfully (backward compatibility)
      expect(result).toBeDefined();
      expect(result.name).toBe('Legacy Coach');
      expect(result.icon).toBe('🎯');

      // Verify no error was set
      const state = useCoachStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('createCoach function - validation still works', () => {
    it('should still reject empty names even for Pro users', async () => {
      await expect(
        useCoachStore.getState().createCoach(
          '',
          '🚀',
          'Valid prompt',
          undefined,
          true // Pro user
        )
      ).rejects.toThrow('Coach name cannot be empty');

      const state = useCoachStore.getState();
      expect(state.error).toBe('Coach name cannot be empty');
      expect(state.coaches.length).toBe(0);
    });

    it('should still reject empty system prompts even for Pro users', async () => {
      await expect(
        useCoachStore.getState().createCoach(
          'Valid Name',
          '🚀',
          '',
          undefined,
          true // Pro user
        )
      ).rejects.toThrow('System prompt cannot be empty');

      const state = useCoachStore.getState();
      expect(state.error).toBe('System prompt cannot be empty');
      expect(state.coaches.length).toBe(0);
    });
  });
});
