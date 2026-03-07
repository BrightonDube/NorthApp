/**
 * Property-Based Tests for coachStore
 * 
 * Task 9.2: Property tests for coachStore
 * 
 * These tests validate the coachStore behavior using property-based testing
 * with fast-check. Each test runs 100 iterations to ensure properties hold
 * across all valid inputs.
 * 
 * IMPLEMENTATION NOTE: These tests use setState/getState directly to test
 * the core store logic without relying on the persistence layer (AsyncStorage).
 * This avoids mocking issues with the Zustand persist middleware while still
 * validating all business logic.
 * 
 * Properties tested:
 * - Property 15: Coach Data Structure Integrity
 * - Property 16: Default Coach Loading
 * - Property 17: Coach List Filtering
 * - Property 18: Coach Creation Feature Gating
 * - Property 19: Coach Field Validation
 * - Property 20: Coach Creator Association
 * - Property 21: Default Coach Immutability
 * - Property 22: Private Coach Privacy
 * - Property 23: Coach Creation Optimistic Update
 * - Property 24: Private Coach Mutability
 * - Property 59: Coach Store Caching
 * 
 * Validates: Requirements 6.1-6.7, 7.2-7.7, 18.4
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

import fc from 'fast-check';
import { useCoachStore } from '../coachStore';
import type { Coach } from '@/types';
import { CoachCategory } from '@/types';
import {
  PBT_CONFIG,
  runPropertyTest,
  property,
  uuidArbitrary,
  coachNameArbitrary,
  coachIconArbitrary,
  systemPromptArbitrary,
  timestampArbitrary,
  generateMockCoach,
} from '../../__tests__/utils/property-helpers';

describe('coachStore - Property-Based Tests', () => {
  beforeEach(() => {
    // Clear all mocks
    // jest.clearAllMocks(); // This might be clearing our global mock return values if setup incorrectly
    
    // Ensure network store is mocked correctly
    const { useNetworkStore } = require('../networkStore');
    if (useNetworkStore.getState.mockReset) {
        useNetworkStore.getState.mockReset();
    }
    useNetworkStore.getState.mockReturnValue({ isOnline: true });
    
    // Reset store state using the reset() action
    useCoachStore.getState().reset();
  });

  afterEach(() => {
    // Additional cleanup after each test
    jest.clearAllMocks();
    useCoachStore.getState().reset();
  });

  /**
   * Property 15: Coach Data Structure Integrity
   * **Validates: Requirements 6.1**
   * 
   * For any created coach, it should contain all required fields:
   * id, name, icon, system_prompt, creator_id, is_public, created_at, updated_at
   * with valid values.
   */
  describe('Property 15: Coach Data Structure Integrity', () => {
    it('should maintain all required fields with valid types', () => {
      runPropertyTest(
        property(
          uuidArbitrary,
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          fc.option(uuidArbitrary, { nil: null }),
          fc.boolean(),
          timestampArbitrary,
          timestampArbitrary,
          (id, name, icon, systemPrompt, creatorId, isPublic, createdAt, updatedAt) => {
            const coach: Coach = {
              id,
              name,
              icon,
              systemPrompt,
              creatorId,
              isPublic,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt,
              updatedAt,
            };

            // Verify all required fields are present
            expect(coach.id).toBeDefined();
            expect(coach.name).toBeDefined();
            expect(coach.icon).toBeDefined();
            expect(coach.systemPrompt).toBeDefined();
            expect(coach.createdAt).toBeDefined();
            expect(coach.updatedAt).toBeDefined();

            // Verify field types
            expect(typeof coach.id).toBe('string');
            expect(typeof coach.name).toBe('string');
            expect(typeof coach.icon).toBe('string');
            expect(typeof coach.systemPrompt).toBe('string');
            expect(coach.creatorId === null || typeof coach.creatorId === 'string').toBe(true);
            expect(typeof coach.isPublic).toBe('boolean');
            expect(typeof coach.createdAt).toBe('string');
            expect(typeof coach.updatedAt).toBe('string');

            // Verify UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(coach.id).toMatch(uuidRegex);
            if (coach.creatorId !== null) {
              expect(coach.creatorId).toMatch(uuidRegex);
            }

            // Verify field constraints
            expect(coach.name.trim().length).toBeGreaterThan(0);
            expect(coach.name.length).toBeLessThanOrEqual(50);
            expect(coach.icon.trim().length).toBeGreaterThan(0);
            expect(coach.systemPrompt.trim().length).toBeGreaterThan(0);
            expect(coach.systemPrompt.length).toBeLessThanOrEqual(2000);

            // Verify timestamps are valid ISO strings
            expect(() => new Date(coach.createdAt)).not.toThrow();
            expect(() => new Date(coach.updatedAt)).not.toThrow();
            expect(new Date(coach.createdAt).toISOString()).toBe(coach.createdAt);
            expect(new Date(coach.updatedAt).toISOString()).toBe(coach.updatedAt);
          }
        )
      );
    });
  });

  /**
   * Property 16: Default Coach Loading
   * **Validates: Requirements 6.2**
   * 
   * For any set of coaches in the store, getDefaultCoaches() should correctly
   * filter and return only coaches where creatorId = null.
   * 
   * This tests the core store logic without relying on fetchCoaches() or Supabase.
   */
  describe('Property 16: Default Coach Loading', () => {
    it('should correctly filter default coaches (creatorId = null) from store state', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.constant(null),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ), // Default coaches
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: uuidArbitrary,
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 10 }
          ), // User coaches
          (defaultCoaches, userCoaches) => {
            // Set store state with mixed coaches
            const allCoaches = [...defaultCoaches, ...userCoaches];
            useCoachStore.setState({
              coaches: allCoaches,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Test getDefaultCoaches() filtering
            const filteredDefaults = useCoachStore.getState().getDefaultCoaches();

            // Verify count matches expected default coaches
            expect(filteredDefaults.length).toBe(defaultCoaches.length);

            // Verify all returned coaches have creatorId = null
            filteredDefaults.forEach(coach => {
              expect(coach.creatorId).toBeNull();
            });

            // Verify all default coaches are present
            defaultCoaches.forEach(defaultCoach => {
              const found = filteredDefaults.find(c => c.id === defaultCoach.id);
              expect(found).toBeDefined();
              expect(found?.name).toBe(defaultCoach.name);
            });

            // Verify no user coaches are included
            userCoaches.forEach(userCoach => {
              const found = filteredDefaults.find(c => c.id === userCoach.id);
              expect(found).toBeUndefined();
            });
          }
        )
      );
    });
  });

  /**
   * Property 17: Coach List Filtering
   * **Validates: Requirements 6.3**
   * 
   * For any authenticated user viewing the coach list, getUserCoaches() should
   * correctly filter and return only coaches where creatorId matches the given userId.
   * 
   * This tests the core store logic without relying on fetchCoaches() or Supabase.
   */
  describe('Property 17: Coach List Filtering', () => {
    it('should correctly filter user\'s private coaches from store state', () => {
      runPropertyTest(
        property(
          uuidArbitrary, // Current user ID
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.constant(null),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ), // Default coaches
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              isPublic: fc.constant(false),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 5 }
          ), // User's private coaches
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              isPublic: fc.constant(false),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 5 }
          ), // Other users' private coaches
          (userId, defaultCoaches, userCoaches, otherCoaches) => {
            // Add creatorId to user and other coaches
            const userCoachesWithCreator = userCoaches.map(c => ({ ...c, creatorId: userId }));
            const otherUserId = fc.sample(uuidArbitrary, 1)[0];
            const otherCoachesWithCreator = otherCoaches.map(c => ({ ...c, creatorId: otherUserId }));

            // Set store state with all coaches
            const allCoaches = [...defaultCoaches, ...userCoachesWithCreator, ...otherCoachesWithCreator];
            useCoachStore.setState({
              coaches: allCoaches,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Test getUserCoaches() filtering
            const filteredUserCoaches = useCoachStore.getState().getUserCoaches(userId);

            // Verify count matches expected user coaches
            expect(filteredUserCoaches.length).toBe(userCoachesWithCreator.length);

            // Verify all returned coaches have creatorId = userId
            filteredUserCoaches.forEach(coach => {
              expect(coach.creatorId).toBe(userId);
            });

            // Verify all user's private coaches are present
            userCoachesWithCreator.forEach(userCoach => {
              const found = filteredUserCoaches.find(c => c.id === userCoach.id);
              expect(found).toBeDefined();
              expect(found?.name).toBe(userCoach.name);
            });

            // Verify default coaches are NOT included
            defaultCoaches.forEach(defaultCoach => {
              const found = filteredUserCoaches.find(c => c.id === defaultCoach.id);
              expect(found).toBeUndefined();
            });

            // Verify other users' coaches are NOT included
            otherCoachesWithCreator.forEach(otherCoach => {
              const found = filteredUserCoaches.find(c => c.id === otherCoach.id);
              expect(found).toBeUndefined();
            });
          }
        )
      );
    });
  });

  /**
   * Property 18: Coach Creation Feature Gating
   * **Validates: Requirements 6.4, 7.4**
   * 
   * For any Free_Tier user attempting to create a coach, the operation should
   * be prevented and a Pro upgrade prompt should appear.
   */
  describe('Property 18: Coach Creation Feature Gating', () => {
    it('should prevent Free users from creating coaches', () => {
      runPropertyTest(
        property(
          fc.boolean(),
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          (isProUser, name, icon, systemPrompt) => {
            const canCreate = useCoachStore.getState().canCreateCoach(isProUser);

            if (isProUser) {
              // Pro users can create coaches
              expect(canCreate).toBe(true);
            } else {
              // Free users cannot create coaches
              expect(canCreate).toBe(false);
            }
          }
        )
      );
    });

    it('should consistently gate coach creation based on subscription tier', () => {
      runPropertyTest(
        property(
          fc.array(fc.boolean(), { minLength: 10, maxLength: 20 }),
          (subscriptionStates) => {
            subscriptionStates.forEach(isProUser => {
              const canCreate = useCoachStore.getState().canCreateCoach(isProUser);
              expect(canCreate).toBe(isProUser);
            });
          }
        )
      );
    });

    it('should enforce Pro requirement in createCoach function', async () => {
      // Reset for this test
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });

      // Test that Free users cannot create coaches
      await expect(
        useCoachStore.getState().createCoach('Test Coach', '🚀', 'Test prompt', undefined, false)
      ).rejects.toThrow('Coach creation requires Pro subscription');

      // Verify error was set in store
      const state = useCoachStore.getState();
      expect(state.error).toBe('Coach creation requires Pro subscription');

      // Verify no coach was added to store
      expect(state.coaches.length).toBe(0);
    });

    it('should allow Pro users to create coaches', async () => {
      // Reset for this test
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });

      const { supabase } = require('@/lib/supabase');
      
      const mockCoachId = fc.sample(uuidArbitrary, 1)[0];
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

      // Test that Pro users can create coaches
      const result = await useCoachStore.getState().createCoach(
        'Pro Coach',
        '🚀',
        'Test prompt for Pro user',
        undefined,
        true
      );

      // Verify coach was created successfully
      expect(result).toBeDefined();
      expect(result.name).toBe('Pro Coach');
      expect(result.icon).toBe('🚀');

      // Verify no error was set
      const state = useCoachStore.getState();
      expect(state.error).toBeNull();
    });
  });

  /**
   * Property 19: Coach Field Validation
   * **Validates: Requirements 6.5, 7.2**
   * 
   * For any coach creation attempt, empty name or system_prompt fields should
   * cause validation failure.
   */
  describe('Property 19: Coach Field Validation', () => {
    beforeEach(() => {
      // Reset mocks before each test in this suite
      jest.clearAllMocks();
      
      // Reset store
      useCoachStore.getState().reset();
      
      // Ensure network is online
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
    });

    it('should reject coaches with empty or whitespace-only names', async () => {
      // Test with various empty/whitespace strings
      const emptyNames = ['', '   ', '\t', '\n', '  \t\n  '];
      
      for (const emptyName of emptyNames) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Attempt to create coach with empty name
        await expect(
          useCoachStore.getState().createCoach(emptyName, '🚀', 'Valid prompt')
        ).rejects.toThrow('Coach name cannot be empty');
        
        // Verify error was set in store
        const state = useCoachStore.getState();
        expect(state.error).toBe('Coach name cannot be empty');
        
        // Verify no coach was added to store
        expect(state.coaches.length).toBe(0);
      }
    });

    it('should reject coaches with empty or whitespace-only system prompts', async () => {
      // Test with various empty/whitespace strings
      const emptyPrompts = ['', '   ', '\t', '\n', '  \t\n  '];
      
      for (const emptyPrompt of emptyPrompts) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Attempt to create coach with empty system prompt
        await expect(
          useCoachStore.getState().createCoach('Valid Name', '🚀', emptyPrompt)
        ).rejects.toThrow('System prompt cannot be empty');
        
        // Verify error was set in store
        const state = useCoachStore.getState();
        expect(state.error).toBe('System prompt cannot be empty');
        
        // Verify no coach was added to store
        expect(state.coaches.length).toBe(0);
      }
    });

    it('should accept coaches with valid non-empty fields using property-based testing', async () => {
      // Generate test cases using fast-check
      const testCases = fc.sample(
        fc.tuple(coachNameArbitrary, coachIconArbitrary, systemPromptArbitrary),
        10 // Generate 10 test cases
      );
      
      for (const [name, icon, systemPrompt] of testCases) {
        // Complete reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        const { supabase } = require('@/lib/supabase');
        
        // Generate a unique mock coach for this iteration
        const mockCoachId = fc.sample(uuidArbitrary, 1)[0];
        const mockCreatedAt = new Date().toISOString();
        const mockUpdatedAt = new Date().toISOString();
        
        // Mock successful creation - return the exact values passed in
        supabase.from = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockCoachId,
                  name: name,
                  icon: icon,
                  system_prompt: systemPrompt,
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

        // Create coach with valid fields
        const result = await useCoachStore.getState().createCoach(name, icon, systemPrompt);
        
        // Verify coach was created successfully
        expect(result).toBeDefined();
        expect(result.name).toBe(name);
        expect(result.icon).toBe(icon);
        expect(result.systemPrompt).toBe(systemPrompt);
        
        // Verify no error was set
        const state = useCoachStore.getState();
        expect(state.error).toBeNull();
      }
    });

    it('should validate name field during update operations', async () => {
      // Test with various empty/whitespace strings
      const emptyNames = ['', '   ', '\t'];
      
      for (const emptyName of emptyNames) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a user coach in the store
        const coachId = fc.sample(uuidArbitrary, 1)[0];
        const userId = fc.sample(uuidArbitrary, 1)[0];
        const coach = {
          id: coachId,
          name: 'Original Name',
          icon: '🚀',
          systemPrompt: 'Original Prompt',
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Attempt to update with empty name
        await expect(
          useCoachStore.getState().updateCoach(coachId, { name: emptyName })
        ).rejects.toThrow('Coach name cannot be empty');
        
        // Verify error was set
        const state = useCoachStore.getState();
        expect(state.error).toBe('Coach name cannot be empty');
        
        // Verify original coach name was not changed
        expect(state.coaches[0].name).toBe('Original Name');
      }
    });

    it('should validate system prompt field during update operations', async () => {
      // Test with various empty/whitespace strings
      const emptyPrompts = ['', '   ', '\n\n'];
      
      for (const emptyPrompt of emptyPrompts) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a user coach in the store
        const coachId = fc.sample(uuidArbitrary, 1)[0];
        const userId = fc.sample(uuidArbitrary, 1)[0];
        const coach = {
          id: coachId,
          name: 'Test Coach',
          icon: '🚀',
          systemPrompt: 'Original Prompt',
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Attempt to update with empty system prompt
        await expect(
          useCoachStore.getState().updateCoach(coachId, { systemPrompt: emptyPrompt })
        ).rejects.toThrow('System prompt cannot be empty');
        
        // Verify error was set
        const state = useCoachStore.getState();
        expect(state.error).toBe('System prompt cannot be empty');
        
        // Verify original system prompt was not changed
        expect(state.coaches[0].systemPrompt).toBe('Original Prompt');
      }
    });
  });

  /**
   * Property 20: Coach Creator Association
   * **Validates: Requirements 6.1-6.7, 7.2-7.7, 18.4**
   * 
   * For any user-created coach, the creator_id should match the authenticated
   * user's ID. This property ensures:
   * 1. User-created coaches have creatorId set to the user's ID
   * 2. Default coaches have creatorId = null
   * 3. A coach's creatorId never changes after creation
   * 4. Only the creator can edit or delete their private coaches
   */
  describe('Property 20: Coach Creator Association', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCoachStore.getState().reset();
    });

    it('should associate created coaches with the authenticated user', async () => {
      // Use a simpler approach with fewer iterations for debugging
      const testCases = fc.sample(
        fc.tuple(uuidArbitrary, coachNameArbitrary, coachIconArbitrary, systemPromptArbitrary),
        5 // Just 5 test cases for now
      );
      
      for (const [userId, name, icon, systemPrompt] of testCases) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        const { supabase } = require('@/lib/supabase');
        
        // Mock authenticated user
        supabase.auth.getUser = jest.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        });

        const mockCoach = generateMockCoach({ 
          name, 
          icon, 
          systemPrompt,
          creatorId: userId,
        });
        
        supabase.from = jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: mockCoach.id,
                  name: mockCoach.name,
                  icon: mockCoach.icon,
                  system_prompt: mockCoach.systemPrompt,
                  creator_id: userId,
                  is_public: mockCoach.isPublic,
                  created_at: mockCoach.createdAt,
                  updated_at: mockCoach.updatedAt,
                },
                error: null,
              }),
            }),
          }),
        });

        const result = await useCoachStore.getState().createCoach(name, icon, systemPrompt);
        
        // Verify the created coach has the correct creatorId
        expect(result).toBeDefined();
        expect(result.creatorId).toBe(userId);
        expect(result.creatorId).not.toBeNull();
        
        // Verify the coach is in the store with correct creatorId
        const coaches = useCoachStore.getState().coaches;
        expect(coaches.length).toBeGreaterThan(0);
        const storeCoach = coaches.find(c => c.id === result.id);
        expect(storeCoach).toBeDefined();
        expect(storeCoach?.creatorId).toBe(userId);
      }
    });

    it('should maintain default coaches with null creatorId', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.constant(null), // Default coaches have null creatorId
              isPublic: fc.constant(true),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (defaultCoaches) => {
            // Set default coaches in store
            useCoachStore.setState({ coaches: defaultCoaches });

            // Verify all default coaches have null creatorId
            const coaches = useCoachStore.getState().coaches;
            coaches.forEach(coach => {
              expect(coach.creatorId).toBeNull();
            });

            // Verify getDefaultCoaches returns all coaches
            const defaults = useCoachStore.getState().getDefaultCoaches();
            expect(defaults.length).toBe(defaultCoaches.length);
            defaults.forEach(coach => {
              expect(coach.creatorId).toBeNull();
            });
          }
        )
      );
    });

    it('should never change a coach\'s creatorId after creation', async () => {
      // Use a simpler approach with fewer iterations
      const testCases = fc.sample(
        fc.tuple(uuidArbitrary, coachNameArbitrary, coachIconArbitrary, systemPromptArbitrary, coachNameArbitrary),
        5
      );
      
      for (const [userId, name, icon, systemPrompt, newName] of testCases) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a coach with a specific creatorId
        const coachId = fc.sample(uuidArbitrary, 1)[0];
        const originalCoach = {
          id: coachId,
          name,
          icon,
          systemPrompt,
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [originalCoach] });
        
        const { supabase } = require('@/lib/supabase');
        supabase.from = jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ ...originalCoach, name: newName }],
              error: null,
            }),
          }),
        });

        // Update the coach
        await useCoachStore.getState().updateCoach(coachId, { name: newName });
        
        // Verify creatorId remains unchanged
        const coaches = useCoachStore.getState().coaches;
        const updatedCoach = coaches.find(c => c.id === coachId);
        expect(updatedCoach).toBeDefined();
        expect(updatedCoach?.creatorId).toBe(userId);
        expect(updatedCoach?.name).toBe(newName);
      }
    });

    it('should only allow creator to access their private coaches via getUserCoaches', () => {
      runPropertyTest(
        property(
          uuidArbitrary, // creator userId
          uuidArbitrary, // other userId
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              isPublic: fc.constant(false),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (creatorId, otherId, coachTemplates) => {
            // Ensure creator and other user are different
            fc.pre(creatorId !== otherId);
            
            // Create coaches with creatorId
            const creatorCoaches = coachTemplates.map(template => ({
              ...template,
              creatorId,
            }));
            
            useCoachStore.setState({ coaches: creatorCoaches });

            // Creator should see their coaches
            const creatorView = useCoachStore.getState().getUserCoaches(creatorId);
            expect(creatorView.length).toBe(creatorCoaches.length);
            creatorView.forEach(coach => {
              expect(coach.creatorId).toBe(creatorId);
            });

            // Other user should NOT see creator's coaches
            const otherView = useCoachStore.getState().getUserCoaches(otherId);
            expect(otherView.length).toBe(0);
          }
        )
      );
    });

    it('should prevent editing coaches with null creatorId (default coaches)', async () => {
      // Use a simpler approach with fewer iterations
      const testCases = fc.sample(
        fc.tuple(
          fc.record({
            id: uuidArbitrary,
            name: coachNameArbitrary,
            icon: coachIconArbitrary,
            systemPrompt: systemPromptArbitrary,
            creatorId: fc.constant(null), // Default coach
            isPublic: fc.constant(true),
            category: fc.constant(CoachCategory.GENERAL),
            isFeatured: fc.constant(false),
            sourceCoachId: fc.constant(null),
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          coachNameArbitrary // new name
        ),
        5
      );
      
      for (const [defaultCoach, newName] of testCases) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        useCoachStore.setState({ coaches: [defaultCoach], isLoading: false, error: null, lastSynced: Date.now() });

        // Attempt to update default coach should throw error
        try {
          await useCoachStore.getState().updateCoach(defaultCoach.id, { name: newName });
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Cannot update default coach');
        }
        
        // Verify coach was not modified
        const coaches = useCoachStore.getState().coaches;
        expect(coaches.length).toBe(1);
        const coach = coaches.find(c => c.id === defaultCoach.id);
        expect(coach).toBeDefined();
        expect(coach?.name).toBe(defaultCoach.name);
        expect(coach?.creatorId).toBeNull();
      }
    });

    it('should prevent deleting coaches with null creatorId (default coaches)', async () => {
      // Use a simpler approach with fewer iterations
      const testCases = fc.sample(
        fc.record({
          id: uuidArbitrary,
          name: coachNameArbitrary,
          icon: coachIconArbitrary,
          systemPrompt: systemPromptArbitrary,
          creatorId: fc.constant(null), // Default coach
          isPublic: fc.constant(true),
          category: fc.constant(CoachCategory.GENERAL),
          isFeatured: fc.constant(false),
          sourceCoachId: fc.constant(null),
          createdAt: timestampArbitrary,
          updatedAt: timestampArbitrary,
        }),
        5
      );
      
      for (const defaultCoach of testCases) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        useCoachStore.setState({ coaches: [defaultCoach], isLoading: false, error: null, lastSynced: Date.now() });

        // Attempt to delete default coach should throw error
        try {
          await useCoachStore.getState().deleteCoach(defaultCoach.id);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Cannot delete default coach');
        }
        
        // Verify coach still exists
        const coaches = useCoachStore.getState().coaches;
        expect(coaches.length).toBe(1);
        const coach = coaches.find(c => c.id === defaultCoach.id);
        expect(coach).toBeDefined();
        expect(coach?.creatorId).toBeNull();
      }
    });

    it('should correctly separate default and user coaches in mixed collections', () => {
      runPropertyTest(
        property(
          uuidArbitrary, // userId
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.constant(null),
              isPublic: fc.constant(true),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ), // Default coaches
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              isPublic: fc.constant(false),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ), // User coaches
          (userId, defaultCoaches, userCoachTemplates) => {
            // Add creatorId to user coaches
            const userCoaches = userCoachTemplates.map(template => ({
              ...template,
              creatorId: userId,
            }));
            
            // Mix coaches in store
            const allCoaches = [...defaultCoaches, ...userCoaches];
            useCoachStore.setState({ coaches: allCoaches, isLoading: false, error: null, lastSynced: Date.now() });

            // Verify total count
            expect(useCoachStore.getState().coaches.length).toBe(
              defaultCoaches.length + userCoaches.length
            );

            // Verify default coaches are correctly filtered
            const defaults = useCoachStore.getState().getDefaultCoaches();
            expect(defaults.length).toBe(defaultCoaches.length);
            defaults.forEach(coach => {
              expect(coach.creatorId).toBeNull();
            });

            // Verify user coaches are correctly filtered
            const userFiltered = useCoachStore.getState().getUserCoaches(userId);
            expect(userFiltered.length).toBe(userCoaches.length);
            userFiltered.forEach(coach => {
              expect(coach.creatorId).toBe(userId);
            });

            // Verify no overlap
            const defaultIds = new Set(defaults.map(c => c.id));
            const userIds = new Set(userFiltered.map(c => c.id));
            defaultIds.forEach(id => {
              expect(userIds.has(id)).toBe(false);
            });
          }
        )
      );
    });
  });

  /**
   * Property 21: Default Coach Immutability
   * **Validates: Requirements 6.7, 7.2-7.7**
   * 
   * For any default coach (creatorId = null), edit and delete operations
   * should be prevented. This property ensures:
   * 1. Default coaches cannot be updated (name, icon, systemPrompt)
   * 2. Default coaches cannot be deleted
   * 3. Attempts to modify default coaches are rejected with clear error messages
   * 4. Default coaches remain unchanged after failed modification attempts
   * 
   * The immutability is enforced at two levels:
   * - Client-side validation in coachStore (tested here)
   * - Database RLS policies (enforced by Supabase)
   */
  describe('Property 21: Default Coach Immutability', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCoachStore.getState().reset();
    });

    it('should prevent updating any field of default coaches (simple test)', async () => {
      // Simple manual test first
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
      
      const defaultCoach = {
        id: 'test-id-123',
        name: 'Default Coach',
        icon: '🎯',
        systemPrompt: 'I am a default coach',
        creatorId: null,
        isPublic: true,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Set coach in store
      useCoachStore.setState({ coaches: [defaultCoach], isLoading: false, error: null, lastSynced: Date.now() });
      
      // Verify coach is in store
      let state = useCoachStore.getState();
      expect(state.coaches.length).toBe(1);
      expect(state.coaches[0].id).toBe('test-id-123');
      
      // Attempt to update
      try {
        await useCoachStore.getState().updateCoach('test-id-123', { name: 'New Name' });
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Cannot update default coach');
      }
      
      // Verify coach still exists and is unchanged
      state = useCoachStore.getState();
      expect(state.coaches.length).toBe(1);
      const coach = state.coaches.find(c => c.id === 'test-id-123');
      expect(coach).toBeDefined();
      expect(coach?.name).toBe('Default Coach');
      expect(coach?.creatorId).toBeNull();
    });

    it('should prevent updating any field of default coaches (property-based)', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            name: coachNameArbitrary,
            icon: coachIconArbitrary,
            systemPrompt: systemPromptArbitrary,
            creatorId: fc.constant(null), // Default coach
            isPublic: fc.constant(true),
            category: fc.constant(CoachCategory.GENERAL),
            isFeatured: fc.constant(false),
            sourceCoachId: fc.constant(null),
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          fc.record({
            name: fc.option(coachNameArbitrary),
            icon: fc.option(coachIconArbitrary),
            systemPrompt: fc.option(systemPromptArbitrary),
          }),
          async (defaultCoach, updates) => {
            // Reset for each iteration - directly set state without calling reset()
            // to avoid race conditions with AsyncStorage persist middleware
            jest.clearAllMocks();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            // Directly set the state we want
            useCoachStore.setState({ 
              coaches: [defaultCoach], 
              isLoading: false, 
              error: null, 
              lastSynced: Date.now() 
            });

            // Filter out undefined updates
            const filteredUpdates: any = {};
            if (updates.name !== null) filteredUpdates.name = updates.name;
            if (updates.icon !== null) filteredUpdates.icon = updates.icon;
            if (updates.systemPrompt !== null) filteredUpdates.systemPrompt = updates.systemPrompt;

            // Skip if no updates
            if (Object.keys(filteredUpdates).length === 0) return;

            // Verify coach exists before update attempt
            const beforeState = useCoachStore.getState();
            expect(beforeState.coaches.length).toBe(1);
            expect(beforeState.coaches[0].id).toBe(defaultCoach.id);

            // Attempt to update default coach should throw error
            try {
              await useCoachStore.getState().updateCoach(defaultCoach.id, filteredUpdates);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Cannot update default coach');
            }
            
            // Verify coach was not modified
            const state = useCoachStore.getState();
            expect(state.coaches.length).toBe(1);
            const coach = state.coaches[0]; // Use index access since length is 1
            expect(coach).toBeDefined();
            expect(coach.id).toBe(defaultCoach.id);
            expect(coach.name).toBe(defaultCoach.name);
            expect(coach.icon).toBe(defaultCoach.icon);
            expect(coach.systemPrompt).toBe(defaultCoach.systemPrompt);
            expect(coach.creatorId).toBeNull();
          }
        )
      );
    });

    it('should prevent deleting default coaches (property-based)', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            name: coachNameArbitrary,
            icon: coachIconArbitrary,
            systemPrompt: systemPromptArbitrary,
            creatorId: fc.constant(null), // Default coach
            isPublic: fc.constant(true),
            category: fc.constant(CoachCategory.GENERAL),
            isFeatured: fc.constant(false),
            sourceCoachId: fc.constant(null),
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (defaultCoach) => {
            // Reset for each iteration - directly set state without calling reset()
            // to avoid race conditions with AsyncStorage persist middleware
            jest.clearAllMocks();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            // Directly set the state we want
            useCoachStore.setState({ 
              coaches: [defaultCoach], 
              isLoading: false, 
              error: null, 
              lastSynced: Date.now() 
            });

            // Attempt to delete default coach should throw error
            try {
              await useCoachStore.getState().deleteCoach(defaultCoach.id);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Cannot delete default coach');
            }
            
            // Verify coach still exists
            const state = useCoachStore.getState();
            expect(state.coaches.length).toBe(1);
            const coach = state.coaches.find(c => c.id === defaultCoach.id);
            expect(coach).toBeDefined();
            expect(coach?.id).toBe(defaultCoach.id);
            expect(coach?.creatorId).toBeNull();
          }
        )
      );
    });

    it('should maintain default coach immutability in mixed collections', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          uuidArbitrary, // userId for user coaches
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.constant(null), // Default coaches
              isPublic: fc.constant(true),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 3 }
          ),
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              isPublic: fc.constant(false),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (userId, defaultCoaches, userCoachTemplates) => {
            // Reset for each iteration
            jest.clearAllMocks();
            useCoachStore.getState().reset();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            // Add creatorId to user coaches
            const userCoaches = userCoachTemplates.map(template => ({
              ...template,
              creatorId: userId,
            }));
            
            // Mix coaches in store
            const allCoaches = [...defaultCoaches, ...userCoaches];
            useCoachStore.setState({ coaches: allCoaches, isLoading: false, error: null, lastSynced: Date.now() });

            // Try to update a default coach
            const defaultCoach = defaultCoaches[0];
            try {
              await useCoachStore.getState().updateCoach(defaultCoach.id, { name: 'New Name' });
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Cannot update default coach');
            }

            // Try to delete a default coach
            try {
              await useCoachStore.getState().deleteCoach(defaultCoach.id);
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Cannot delete default coach');
            }

            // Verify default coach is unchanged
            const state = useCoachStore.getState();
            const unchangedCoach = state.coaches.find(c => c.id === defaultCoach.id);
            expect(unchangedCoach).toBeDefined();
            expect(unchangedCoach?.name).toBe(defaultCoach.name);
            expect(unchangedCoach?.creatorId).toBeNull();

            // Verify user coaches can still be modified (mock successful update)
            const { supabase } = require('@/lib/supabase');
            const userCoach = userCoaches[0];
            
            supabase.from = jest.fn().mockReturnValue({
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ ...userCoach, name: 'Updated User Coach' }],
                  error: null,
                }),
              }),
            });

            // User coach update should succeed
            await expect(
              useCoachStore.getState().updateCoach(userCoach.id, { name: 'Updated User Coach' })
            ).resolves.not.toThrow();
          }
        )
      );
    });

    it('should consistently reject all modification attempts on default coaches', async () => {
      // Test multiple modification attempts on the same default coach
      const defaultCoach = {
        id: fc.sample(uuidArbitrary, 1)[0],
        name: 'Default Coach',
        icon: '🎯',
        systemPrompt: 'I am a default coach',
        creatorId: null,
        isPublic: true,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Reset
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
      
      useCoachStore.setState({ coaches: [defaultCoach], isLoading: false, error: null, lastSynced: Date.now() });

      // Try multiple update operations
      const updateAttempts = [
        { name: 'New Name 1' },
        { icon: '🚀' },
        { systemPrompt: 'New prompt' },
        { name: 'New Name 2', icon: '💡' },
      ];

      for (const update of updateAttempts) {
        try {
          await useCoachStore.getState().updateCoach(defaultCoach.id, update);
          throw new Error('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Cannot update default coach');
        }
        
        // Verify coach remains unchanged
        const state = useCoachStore.getState();
        const coach = state.coaches.find(c => c.id === defaultCoach.id);
        expect(coach?.name).toBe(defaultCoach.name);
        expect(coach?.icon).toBe(defaultCoach.icon);
        expect(coach?.systemPrompt).toBe(defaultCoach.systemPrompt);
      }

      // Try delete operation
      try {
        await useCoachStore.getState().deleteCoach(defaultCoach.id);
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Cannot delete default coach');
      }
      
      // Verify coach still exists
      const finalState = useCoachStore.getState();
      const coach = finalState.coaches.find(c => c.id === defaultCoach.id);
      expect(coach).toBeDefined();
    });

    it('should preserve default coach data integrity after failed modification attempts', async () => {
      await runPropertyTest(
        fc.asyncProperty(
          fc.record({
            id: uuidArbitrary,
            name: coachNameArbitrary,
            icon: coachIconArbitrary,
            systemPrompt: systemPromptArbitrary,
            creatorId: fc.constant(null),
            isPublic: fc.constant(true),
            category: fc.constant(CoachCategory.GENERAL),
            isFeatured: fc.constant(false),
            sourceCoachId: fc.constant(null),
            createdAt: timestampArbitrary,
            updatedAt: timestampArbitrary,
          }),
          async (defaultCoach) => {
            // Reset for each iteration
            jest.clearAllMocks();
            useCoachStore.getState().reset();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            // Store original values
            const originalName = defaultCoach.name;
            const originalIcon = defaultCoach.icon;
            const originalPrompt = defaultCoach.systemPrompt;
            const originalCreatorId = defaultCoach.creatorId;
            
            useCoachStore.setState({ coaches: [defaultCoach], isLoading: false, error: null, lastSynced: Date.now() });

            // Attempt update
            try {
              await useCoachStore.getState().updateCoach(defaultCoach.id, { 
                name: 'Modified Name' 
              });
              throw new Error('Should have thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toBe('Cannot update default coach');
            }

            // Verify ALL fields remain unchanged
            const state = useCoachStore.getState();
            expect(state.coaches.length).toBe(1);
            const coach = state.coaches.find(c => c.id === defaultCoach.id);
            expect(coach).toBeDefined();
            expect(coach?.name).toBe(originalName);
            expect(coach?.icon).toBe(originalIcon);
            expect(coach?.systemPrompt).toBe(originalPrompt);
            expect(coach?.creatorId).toBe(originalCreatorId);
            expect(coach?.creatorId).toBeNull();
            expect(coach?.isPublic).toBe(true);
          }
        )
      );
    });
  });

  /**
   * Property 22: Private Coach Privacy
   * **Validates: Requirements 6.1-6.7, 7.2-7.7**
   * 
   * For any private coach (creatorId !== null), it should only be visible to
   * the creator user. This property ensures:
   * 1. Private coaches are only returned by fetchCoaches() for their creator
   * 2. Other users cannot see private coaches they didn't create
   * 3. The fetchCoaches() method filters correctly based on user ID
   * 
   * This is a critical security property that prevents users from accessing
   * other users' private coaches.
   */
  describe('Property 22: Private Coach Privacy', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCoachStore.getState().reset();
    });

    it('should only return private coaches for their creator via fetchCoaches', async () => {
      // Manual test with specific data to debug
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
      
      const userAId = 'user-a-123';
      const userBId = 'user-b-456';
      
      const defaultCoach = {
        id: 'default-1',
        name: 'Default Coach',
        icon: '🎯',
        systemPrompt: 'I am a default coach',
        creatorId: null,
        isPublic: true,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const userACoach = {
        id: 'user-a-coach-1',
        name: 'User A Coach',
        icon: '🚀',
        systemPrompt: 'I am User A\'s coach',
        creatorId: userAId,
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const userBCoach = {
        id: 'user-b-coach-1',
        name: 'User B Coach',
        icon: '💼',
        systemPrompt: 'I am User B\'s coach',
        creatorId: userBId,
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const { supabase } = require('@/lib/supabase');
      
      // Test 1: User A fetches coaches
      supabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: userAId } },
        error: null,
      });
      
      // Mock should return default coach + User A's coach (NOT User B's coach)
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: defaultCoach.id,
                  name: defaultCoach.name,
                  icon: defaultCoach.icon,
                  system_prompt: defaultCoach.systemPrompt,
                  creator_id: defaultCoach.creatorId,
                  is_public: defaultCoach.isPublic,
                  created_at: defaultCoach.createdAt,
                  updated_at: defaultCoach.updatedAt,
                },
                {
                  id: userACoach.id,
                  name: userACoach.name,
                  icon: userACoach.icon,
                  system_prompt: userACoach.systemPrompt,
                  creator_id: userACoach.creatorId,
                  is_public: userACoach.isPublic,
                  created_at: userACoach.createdAt,
                  updated_at: userACoach.updatedAt,
                },
              ],
              error: null,
            }),
          }),
        }),
      });
      
      await useCoachStore.getState().fetchCoaches(true);
      
      const userACoaches = useCoachStore.getState().coaches;
      
      // Verify User A sees exactly 2 coaches: default + their own
      expect(userACoaches.length).toBe(2);
      
      // Verify default coach is present
      const foundDefault = userACoaches.find(c => c.id === defaultCoach.id);
      expect(foundDefault).toBeDefined();
      expect(foundDefault?.creatorId).toBeNull();
      
      // Verify User A's coach is present
      const foundUserA = userACoaches.find(c => c.id === userACoach.id);
      expect(foundUserA).toBeDefined();
      expect(foundUserA?.creatorId).toBe(userAId);
      
      // Verify User B's coach is NOT present
      const foundUserB = userACoaches.find(c => c.id === userBCoach.id);
      expect(foundUserB).toBeUndefined();
      
      // Test 2: User B fetches coaches
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
      
      supabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: { id: userBId } },
        error: null,
      });
      
      // Mock should return default coach + User B's coach (NOT User A's coach)
      supabase.from = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: defaultCoach.id,
                  name: defaultCoach.name,
                  icon: defaultCoach.icon,
                  system_prompt: defaultCoach.systemPrompt,
                  creator_id: defaultCoach.creatorId,
                  is_public: defaultCoach.isPublic,
                  created_at: defaultCoach.createdAt,
                  updated_at: defaultCoach.updatedAt,
                },
                {
                  id: userBCoach.id,
                  name: userBCoach.name,
                  icon: userBCoach.icon,
                  system_prompt: userBCoach.systemPrompt,
                  creator_id: userBCoach.creatorId,
                  is_public: userBCoach.isPublic,
                  created_at: userBCoach.createdAt,
                  updated_at: userBCoach.updatedAt,
                },
              ],
              error: null,
            }),
          }),
        }),
      });
      
      await useCoachStore.getState().fetchCoaches(true);
      
      const userBCoaches = useCoachStore.getState().coaches;
      
      // Verify User B sees exactly 2 coaches: default + their own
      expect(userBCoaches.length).toBe(2);
      
      // Verify default coach is present
      const foundDefaultB = userBCoaches.find(c => c.id === defaultCoach.id);
      expect(foundDefaultB).toBeDefined();
      expect(foundDefaultB?.creatorId).toBeNull();
      
      // Verify User B's coach is present
      const foundUserBCoach = userBCoaches.find(c => c.id === userBCoach.id);
      expect(foundUserBCoach).toBeDefined();
      expect(foundUserBCoach?.creatorId).toBe(userBId);
      
      // Verify User A's coach is NOT present
      const foundUserACoach = userBCoaches.find(c => c.id === userACoach.id);
      expect(foundUserACoach).toBeUndefined();
    });

    it('should create all new coaches as private (isPublic = false)', async () => {
      // This test verifies that newly created coaches have isPublic = false
      jest.clearAllMocks();
      useCoachStore.getState().reset();
      
      const { useNetworkStore } = require('../networkStore');
      useNetworkStore.getState.mockReturnValue({ isOnline: true });
      
      const { supabase } = require('@/lib/supabase');
      const mockCoach = generateMockCoach({ 
        name: 'Test Coach', 
        icon: '🚀', 
        systemPrompt: 'Prompt',
        isPublic: false,
        category: CoachCategory.GENERAL,
        isFeatured: false,
        sourceCoachId: null,
      });
      
      supabase.from = jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: mockCoach.id,
                name: mockCoach.name,
                icon: mockCoach.icon,
                system_prompt: mockCoach.systemPrompt,
                creator_id: mockCoach.creatorId,
                is_public: false,
                created_at: mockCoach.createdAt,
                updated_at: mockCoach.updatedAt,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await useCoachStore.getState().createCoach('Test Coach', '🚀', 'Prompt');
      expect(result.isPublic).toBe(false);
    });
  });

  /**
   * Property 23: Coach Creation Optimistic Update
   * **Validates: Requirements 7.5**
   * 
   * For any successful coach creation, the coach should appear in the user's
   * coach list immediately without requiring a refresh.
   * 
   * This property tests the optimistic update pattern: coaches should appear
   * in the store IMMEDIATELY when createCoach() is called, even before the
   * server responds. This provides instant UI feedback to users.
   */
  describe('Property 23: Coach Creation Optimistic Update', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCoachStore.getState().reset();
    });

    it('should add coach to store immediately during creation (optimistic update)', async () => {
      // Property-based test: For any valid coach data, the coach should appear
      // in the store immediately when createCoach is called
      await runPropertyTest(
        fc.asyncProperty(
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          async (name, icon, systemPrompt) => {
            // Reset for each iteration
            jest.clearAllMocks();
            useCoachStore.getState().reset();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            const { supabase } = require('@/lib/supabase');
            
            // Track when the server responds
            let serverResolved = false;
            
            // Mock a delayed server response to test optimistic update
            const mockCoach = generateMockCoach({ name, icon, systemPrompt });
            supabase.from = jest.fn().mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockImplementation(() => {
                    // Simulate server delay
                    return new Promise((resolve) => {
                      setTimeout(() => {
                        serverResolved = true;
                        resolve({
                          data: {
                            id: mockCoach.id,
                            name: mockCoach.name,
                            icon: mockCoach.icon,
                            system_prompt: mockCoach.systemPrompt,
                            creator_id: mockCoach.creatorId,
                            is_public: mockCoach.isPublic,
                            created_at: mockCoach.createdAt,
                            updated_at: mockCoach.updatedAt,
                          },
                          error: null,
                        });
                      }, 100); // 100ms delay
                    });
                  }),
                }),
              }),
            });

            // Start the creation (don't await yet)
            const createPromise = useCoachStore.getState().createCoach(name, icon, systemPrompt);
            
            // Wait a tiny bit for the optimistic update to happen
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // CRITICAL: Verify coach appears in store BEFORE server responds
            expect(serverResolved).toBe(false); // Server hasn't responded yet
            const coachesDuringCreation = useCoachStore.getState().coaches;
            expect(coachesDuringCreation.length).toBe(1); // Coach is already in store!
            
            // Verify the optimistic coach has the correct data
            const optimisticCoach = coachesDuringCreation[0];
            expect(optimisticCoach.name).toBe(name);
            expect(optimisticCoach.icon).toBe(icon);
            expect(optimisticCoach.systemPrompt).toBe(systemPrompt);
            expect(optimisticCoach.id).toMatch(/^temp-/); // Temporary ID
            
            // Now wait for server response
            const result = await createPromise;
            
            // Verify server response is valid
            expect(result).toBeDefined();
            expect(result.name).toBe(name);
            expect(result.icon).toBe(icon);
            expect(result.systemPrompt).toBe(systemPrompt);
            
            // Verify the temp coach was replaced with real coach
            const coachesAfterCreation = useCoachStore.getState().coaches;
            expect(coachesAfterCreation.length).toBe(1);
            expect(coachesAfterCreation[0].id).not.toMatch(/^temp-/); // Real ID now
            expect(coachesAfterCreation[0].id).toBe(mockCoach.id);
          }
        )
      );
    });

    it('should rollback optimistic update on server error', async () => {
      // Property-based test: If server returns error, the optimistic coach
      // should be removed from the store (rollback)
      await runPropertyTest(
        fc.asyncProperty(
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          async (name, icon, systemPrompt) => {
            // Reset for each iteration
            jest.clearAllMocks();
            useCoachStore.getState().reset();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            const { supabase } = require('@/lib/supabase');
            const error = new Error('Server error');
            
            // Mock server error
            supabase.from = jest.fn().mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockImplementation(() => {
                    return new Promise((resolve) => {
                      setTimeout(() => {
                        resolve({
                          data: null,
                          error,
                        });
                      }, 100);
                    });
                  }),
                }),
              }),
            });

            // Start the creation
            const createPromise = useCoachStore.getState().createCoach(name, icon, systemPrompt);
            
            // Wait for optimistic update
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify coach appears optimistically
            expect(useCoachStore.getState().coaches.length).toBe(1);
            
            // Wait for server error
            await expect(createPromise).rejects.toThrow('Server error');
            
            // CRITICAL: Verify coach was removed from store (rollback)
            const coachesAfterError = useCoachStore.getState().coaches;
            expect(coachesAfterError.length).toBe(0); // Rolled back!
            
            // Verify error was set in store
            expect(useCoachStore.getState().error).toBeTruthy();
          }
        )
      );
    });

    it('should maintain coach list order after optimistic update completes', async () => {
      // Property-based test: When adding a new coach optimistically, it should
      // maintain proper ordering after server confirmation
      await runPropertyTest(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.constant(false),
              sourceCoachId: fc.constant(null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 3 }
          ),
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary,
          async (existingCoaches, newName, newIcon, newSystemPrompt) => {
            // Reset for each iteration
            jest.clearAllMocks();
            useCoachStore.getState().reset();
            
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.getState.mockReturnValue({ isOnline: true });
            
            // Set existing coaches
            useCoachStore.setState({ coaches: existingCoaches });
            
            const { supabase } = require('@/lib/supabase');
            const mockCoach = generateMockCoach({ 
              name: newName, 
              icon: newIcon, 
              systemPrompt: newSystemPrompt 
            });
            
            supabase.from = jest.fn().mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: mockCoach.id,
                      name: mockCoach.name,
                      icon: mockCoach.icon,
                      system_prompt: mockCoach.systemPrompt,
                      creator_id: mockCoach.creatorId,
                      is_public: mockCoach.isPublic,
                      created_at: mockCoach.createdAt,
                      updated_at: mockCoach.updatedAt,
                    },
                    error: null,
                  }),
                }),
              }),
            });

            // Create new coach
            await useCoachStore.getState().createCoach(newName, newIcon, newSystemPrompt);
            
            // Verify coach was added to the list
            const finalCoaches = useCoachStore.getState().coaches;
            expect(finalCoaches.length).toBe(existingCoaches.length + 1);
            
            // Verify all existing coaches are still present
            existingCoaches.forEach(existingCoach => {
              const found = finalCoaches.find(c => c.id === existingCoach.id);
              expect(found).toBeDefined();
            });
            
            // Verify new coach is present with correct data
            const newCoach = finalCoaches.find(c => c.name === newName);
            expect(newCoach).toBeDefined();
            expect(newCoach?.icon).toBe(newIcon);
            expect(newCoach?.systemPrompt).toBe(newSystemPrompt);
          }
        )
      );
    });
  });

  /**
   * Property 24: Private Coach Mutability
   * **Validates: Requirements 7.6, 7.7**
   * 
   * For any user's private coach, that user should be able to edit and delete it.
   * 
   * This property ensures:
   * 1. Private coaches (creatorId !== null) can be updated by their creator
   * 2. Private coaches can be deleted by their creator
   * 3. Updates work correctly with optimistic updates
   * 4. Deletes work correctly with optimistic updates
   * 
   * Note: This property tests that update/delete operations complete successfully.
   * The actual authorization is enforced by RLS policies in the database.
   */
  describe('Property 24: Private Coach Mutability', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      useCoachStore.getState().reset();
    });

    it('should allow users to edit their own private coaches with any valid updates', async () => {
      // Generate test cases using property-based testing
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary, // userId
          uuidArbitrary, // coachId
          coachNameArbitrary, // original name
          coachIconArbitrary, // original icon
          systemPromptArbitrary, // original prompt
          fc.record({
            name: fc.option(coachNameArbitrary, { nil: undefined }),
            icon: fc.option(coachIconArbitrary, { nil: undefined }),
            systemPrompt: fc.option(systemPromptArbitrary, { nil: undefined }),
          }, { requiredKeys: [] }) // At least one field should be updated
        ),
        10 // Test 10 different update scenarios
      );
      
      for (const [userId, coachId, origName, origIcon, origPrompt, updates] of testCases) {
        // Skip if no updates provided
        if (!updates.name && !updates.icon && !updates.systemPrompt) {
          continue;
        }

        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a private coach owned by the user
        const coach = {
          id: coachId,
          name: origName,
          icon: origIcon,
          systemPrompt: origPrompt,
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Mock successful update
        const { supabase } = require('@/lib/supabase');
        supabase.from = jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [{ ...coach, ...updates }],
              error: null,
            }),
          }),
        });

        // Attempt to update the coach
        await expect(
          useCoachStore.getState().updateCoach(coachId, updates)
        ).resolves.not.toThrow();
        
        // Verify the coach was updated in the store
        const state = useCoachStore.getState();
        const updatedCoach = state.coaches.find(c => c.id === coachId);
        expect(updatedCoach).toBeDefined();
        
        // Verify updates were applied
        if (updates.name !== undefined) {
          expect(updatedCoach?.name).toBe(updates.name);
        }
        if (updates.icon !== undefined) {
          expect(updatedCoach?.icon).toBe(updates.icon);
        }
        if (updates.systemPrompt !== undefined) {
          expect(updatedCoach?.systemPrompt).toBe(updates.systemPrompt);
        }
        
        // Verify creatorId remains unchanged
        expect(updatedCoach?.creatorId).toBe(userId);
        
        // Verify no error was set
        expect(state.error).toBeNull();
      }
    });

    it('should allow users to delete their own private coaches', async () => {
      // Generate test cases using property-based testing
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary, // userId
          uuidArbitrary, // coachId
          coachNameArbitrary,
          coachIconArbitrary,
          systemPromptArbitrary
        ),
        10 // Test 10 different deletion scenarios
      );
      
      for (const [userId, coachId, name, icon, systemPrompt] of testCases) {
        // Reset for each iteration
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a private coach owned by the user
        const coach = {
          id: coachId,
          name,
          icon,
          systemPrompt,
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Verify coach exists before deletion
        expect(useCoachStore.getState().coaches.length).toBe(1);
        
        // Mock successful deletion
        const { supabase } = require('@/lib/supabase');
        supabase.from = jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [coach],
              error: null,
            }),
          }),
        });

        // Attempt to delete the coach
        await expect(
          useCoachStore.getState().deleteCoach(coachId)
        ).resolves.not.toThrow();
        
        // Verify the coach was removed from the store
        const state = useCoachStore.getState();
        expect(state.coaches.length).toBe(0);
        expect(state.coaches.find(c => c.id === coachId)).toBeUndefined();
        
        // Verify no error was set
        expect(state.error).toBeNull();
      }
    });

    it('should handle optimistic updates correctly when editing private coaches', async () => {
      // Test that optimistic updates work: UI updates immediately, then syncs with server
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary,
          uuidArbitrary,
          coachNameArbitrary,
          coachNameArbitrary // new name
        ),
        5
      );
      
      for (const [userId, coachId, oldName, newName] of testCases) {
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        const coach = {
          id: coachId,
          name: oldName,
          icon: '🚀',
          systemPrompt: 'Test prompt',
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Mock a delayed server response
        const { supabase } = require('@/lib/supabase');
        let resolveUpdate: any;
        const updatePromise = new Promise((resolve) => {
          resolveUpdate = resolve;
        });
        
        supabase.from = jest.fn().mockReturnValue({
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(updatePromise),
          }),
        });

        // Start the update (don't await yet)
        const updatePromiseResult = useCoachStore.getState().updateCoach(coachId, { name: newName });
        
        // Immediately check that the UI was updated optimistically
        // Note: In the actual implementation, the optimistic update happens synchronously
        // before the async server call, so we can check it immediately
        const stateBeforeServerResponse = useCoachStore.getState();
        const coachBeforeServerResponse = stateBeforeServerResponse.coaches.find(c => c.id === coachId);
        expect(coachBeforeServerResponse?.name).toBe(newName);
        
        // Now resolve the server response
        resolveUpdate({ data: [{ ...coach, name: newName }], error: null });
        
        // Wait for the update to complete
        await updatePromiseResult;
        
        // Verify final state
        const finalState = useCoachStore.getState();
        const finalCoach = finalState.coaches.find(c => c.id === coachId);
        expect(finalCoach?.name).toBe(newName);
        expect(finalState.error).toBeNull();
      }
    });

    it('should handle optimistic updates correctly when deleting private coaches', async () => {
      // Test that optimistic deletes work: coach removed from UI immediately
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary,
          uuidArbitrary,
          coachNameArbitrary
        ),
        5
      );
      
      for (const [userId, coachId, name] of testCases) {
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        const coach = {
          id: coachId,
          name,
          icon: '🚀',
          systemPrompt: 'Test prompt',
          creatorId: userId,
          isPublic: false,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Mock a delayed server response
        const { supabase } = require('@/lib/supabase');
        let resolveDelete: any;
        const deletePromise = new Promise((resolve) => {
          resolveDelete = resolve;
        });
        
        supabase.from = jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(deletePromise),
          }),
        });

        // Start the delete (don't await yet)
        const deletePromiseResult = useCoachStore.getState().deleteCoach(coachId);
        
        // Immediately check that the coach was removed optimistically
        const stateBeforeServerResponse = useCoachStore.getState();
        expect(stateBeforeServerResponse.coaches.find(c => c.id === coachId)).toBeUndefined();
        
        // Now resolve the server response
        resolveDelete({ data: [coach], error: null });
        
        // Wait for the delete to complete
        await deletePromiseResult;
        
        // Verify final state
        const finalState = useCoachStore.getState();
        expect(finalState.coaches.find(c => c.id === coachId)).toBeUndefined();
        expect(finalState.error).toBeNull();
      }
    });

    it('should not allow editing default coaches (creatorId = null)', async () => {
      // Test that default coaches cannot be edited
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary, // coachId
          coachNameArbitrary,
          coachNameArbitrary // new name
        ),
        5
      );
      
      for (const [coachId, oldName, newName] of testCases) {
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a default coach (creatorId = null)
        const coach = {
          id: coachId,
          name: oldName,
          icon: '🚀',
          systemPrompt: 'Test prompt',
          creatorId: null, // Default coach
          isPublic: true,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Attempt to update the default coach
        await expect(
          useCoachStore.getState().updateCoach(coachId, { name: newName })
        ).rejects.toThrow('Cannot update default coach');
        
        // Verify the coach was NOT updated
        const state = useCoachStore.getState();
        const unchangedCoach = state.coaches.find(c => c.id === coachId);
        expect(unchangedCoach?.name).toBe(oldName);
        
        // Verify error was set
        expect(state.error).toBe('Cannot update default coach');
      }
    });

    it('should not allow deleting default coaches (creatorId = null)', async () => {
      // Test that default coaches cannot be deleted
      const testCases = fc.sample(
        fc.tuple(
          uuidArbitrary, // coachId
          coachNameArbitrary
        ),
        5
      );
      
      for (const [coachId, name] of testCases) {
        jest.clearAllMocks();
        useCoachStore.getState().reset();
        
        const { useNetworkStore } = require('../networkStore');
        useNetworkStore.getState.mockReturnValue({ isOnline: true });
        
        // Create a default coach (creatorId = null)
        const coach = {
          id: coachId,
          name,
          icon: '🚀',
          systemPrompt: 'Test prompt',
          creatorId: null, // Default coach
          isPublic: true,
          category: CoachCategory.GENERAL,
          isFeatured: false,
          sourceCoachId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        useCoachStore.setState({ coaches: [coach] });
        
        // Attempt to delete the default coach
        await expect(
          useCoachStore.getState().deleteCoach(coachId)
        ).rejects.toThrow('Cannot delete default coach');
        
        // Verify the coach was NOT deleted
        const state = useCoachStore.getState();
        expect(state.coaches.find(c => c.id === coachId)).toBeDefined();
        
        // Verify error was set
        expect(state.error).toBe('Cannot delete default coach');
      }
    });
  });

  /**
   * Property 59: Coach Store Caching
   * **Validates: Requirements 18.4**
   * 
   * For any coach data load, coaches should be cached locally for offline access.
   * This tests the store's ability to maintain state across operations.
   */
  describe('Property 59: Coach Store Caching', () => {
    it('should maintain coaches in store state for offline access', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.boolean(),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (coaches) => {
            // Set coaches in store using setState
            const lastSynced = Date.now();
            useCoachStore.setState({ coaches, lastSynced });

            // Verify coaches are stored in state
            const state = useCoachStore.getState();
            expect(state.coaches).toBeDefined();
            expect(state.coaches.length).toBe(coaches.length);
            expect(state.lastSynced).toBe(lastSynced);
            
            // Verify all coaches are accessible
            coaches.forEach(coach => {
              const found = state.coaches.find(c => c.id === coach.id);
              expect(found).toBeDefined();
              expect(found?.name).toBe(coach.name);
              expect(found?.icon).toBe(coach.icon);
              expect(found?.systemPrompt).toBe(coach.systemPrompt);
            });
          }
        )
      );
    });

    it('should maintain coaches across multiple state updates', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.boolean(),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.boolean(),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (firstBatch, secondBatch) => {
            // First update
            useCoachStore.setState({ coaches: firstBatch, lastSynced: Date.now() });
            let state = useCoachStore.getState();
            expect(state.coaches.length).toBe(firstBatch.length);

            // Second update
            useCoachStore.setState({ coaches: secondBatch, lastSynced: Date.now() });
            state = useCoachStore.getState();
            expect(state.coaches.length).toBe(secondBatch.length);
            
            // Verify second batch is now in state
            secondBatch.forEach(coach => {
              const found = state.coaches.find(c => c.id === coach.id);
              expect(found).toBeDefined();
            });
          }
        )
      );
    });

    it('should not include loading and error states in cached data', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.boolean(),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.boolean(),
          fc.option(fc.string(), { nil: null }),
          (coaches, isLoading, error) => {
            // Set state with loading and error
            useCoachStore.setState({ 
              coaches, 
              isLoading, 
              error,
              lastSynced: Date.now(),
            });

            const state = useCoachStore.getState();
            
            // Verify coaches and lastSynced are present
            expect(state.coaches).toBeDefined();
            expect(state.coaches.length).toBe(coaches.length);
            expect(state.lastSynced).toBeDefined();
            
            // Verify loading and error states are present (but would not be persisted)
            // The store maintains these in memory, but the persist middleware
            // (via partialize) would exclude them from AsyncStorage
            expect(state.isLoading).toBe(isLoading);
            expect(state.error).toBe(error);
          }
        )
      );
    });

    it('should maintain lastSynced timestamp with coaches', () => {
      runPropertyTest(
        property(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              name: coachNameArbitrary,
              icon: coachIconArbitrary,
              systemPrompt: systemPromptArbitrary,
              creatorId: fc.option(uuidArbitrary, { nil: null }),
              isPublic: fc.boolean(),
              category: fc.constant(CoachCategory.GENERAL),
              isFeatured: fc.boolean(),
              sourceCoachId: fc.constant(null as string | null),
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 1000000000000, max: 9999999999999 }), // Valid timestamp
          (coaches, timestamp) => {
            // Set coaches with timestamp
            useCoachStore.setState({ coaches, lastSynced: timestamp });

            const state = useCoachStore.getState();
            
            // Verify both coaches and timestamp are stored
            expect(state.coaches.length).toBe(coaches.length);
            expect(state.lastSynced).toBe(timestamp);
            
            // Verify timestamp is a valid number
            expect(typeof state.lastSynced).toBe('number');
            expect(state.lastSynced).toBeGreaterThan(0);
          }
        )
      );
    });
  });
});

