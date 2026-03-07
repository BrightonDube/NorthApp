/**
 * Isolated test for Property 18: Coach Creation Feature Gating
 * 
 * This file contains ONLY Property 18 tests to verify they pass independently
 * without interference from other tests in the suite.
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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    __esModule: true,
    default: {
      setItem: jest.fn(() => Promise.resolve()),
      getItem: jest.fn(() => Promise.resolve(null)),
      removeItem: jest.fn(() => Promise.resolve()),
      clear: jest.fn(() => Promise.resolve()),
    },
  };
});

import * as fc from 'fast-check';
import { useCoachStore } from '../coachStore';

// Arbitraries
const coachNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const coachIconArbitrary = fc.string({ minLength: 1, maxLength: 10 });
const systemPromptArbitrary = fc.string({ minLength: 1, maxLength: 500 });
const uuidArbitrary = fc.uuid();

// Helper to run property tests
function runPropertyTest<T>(property: fc.IProperty<T>, options?: fc.Parameters<T>) {
  fc.assert(property, { numRuns: 100, ...options });
}

const { property } = fc;

describe('Property 18: Coach Creation Feature Gating (Isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCoachStore.getState().reset();
  });

  /**
   * Test 1: Verify canCreateCoach returns correct value based on subscription tier
   */
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

  /**
   * Test 2: Verify consistent gating across multiple checks
   */
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

  /**
   * Test 3: Verify createCoach enforces Pro requirement
   */
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

  /**
   * Test 4: Verify Pro users can create coaches
   */
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
