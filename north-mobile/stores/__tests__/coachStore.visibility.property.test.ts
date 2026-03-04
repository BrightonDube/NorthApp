/**
 * Property-based tests for coach visibility controls
 * 
 * Feature: coach-marketplace-sharing
 * 
 * Validates: Requirements 8.2, 8.3
 */

import fc from 'fast-check';
import { useCoachStore } from '../coachStore';
import { supabase } from '@/lib/supabase';
import { CoachCategory } from '@/types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

// Mock network store
jest.mock('../networkStore', () => ({
  useNetworkStore: {
    getState: jest.fn(() => ({ isOnline: true })),
    setState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

// Mock offline queue
jest.mock('@/lib/offlineQueue', () => ({
  useOfflineQueue: {
    getState: jest.fn(() => ({ queue: [], isProcessing: false })),
    setState: jest.fn(),
  },
}));

describe('Coach Visibility Property Tests', () => {
  beforeEach(() => {
    // Reset store state
    useCoachStore.setState({
      coaches: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  /**
   * Property 20: Visibility toggle updates database and marketplace
   * 
   * **Validates: Requirements 8.2, 8.3**
   * 
   * For any coach, toggling `is_public` should update the database value
   * and immediately affect whether the coach appears in marketplace queries.
   * 
   * This property ensures:
   * 1. When isPublic is set to true, the database is updated with is_public=true
   * 2. When isPublic is set to false, the database is updated with is_public=false
   * 3. The local state is updated optimistically before the database update
   * 4. The update is reflected in the coaches array
   */
  // Feature: coach-marketplace-sharing, Property 20: Visibility toggle updates database and marketplace
  describe('Property 20: Visibility toggle updates database and marketplace', () => {
    it('Property 20.1: Toggling isPublic to true updates database with is_public=true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          fc.string({ minLength: 1, maxLength: 50 }), // coach name
          fc.string({ minLength: 1, maxLength: 2 }), // icon
          fc.string({ minLength: 20, maxLength: 500 }), // system prompt
          fc.uuid(), // creator ID
          async (coachId, name, icon, systemPrompt, creatorId) => {
            // Setup: Create a private coach
            const privateCoach = {
              id: coachId,
              name,
              icon,
              systemPrompt,
              creatorId,
              isPublic: false,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            useCoachStore.setState({
              coaches: [privateCoach],
            });

            // Mock Supabase update
            const mockUpdate = jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as jest.Mock).mockReturnValue({
              update: mockUpdate,
            });

            // Action: Toggle isPublic to true
            await useCoachStore.getState().updateCoach(coachId, { isPublic: true });

            // Assert: Database was updated with is_public=true
            expect(mockUpdate).toHaveBeenCalledWith({ is_public: true });

            // Assert: Local state was updated
            const updatedCoach = useCoachStore.getState().coaches.find(c => c.id === coachId);
            expect(updatedCoach?.isPublic).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 20.2: Toggling isPublic to false updates database with is_public=false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          fc.string({ minLength: 1, maxLength: 50 }), // coach name
          fc.string({ minLength: 1, maxLength: 2 }), // icon
          fc.string({ minLength: 20, maxLength: 500 }), // system prompt
          fc.uuid(), // creator ID
          async (coachId, name, icon, systemPrompt, creatorId) => {
            // Setup: Create a public coach
            const publicCoach = {
              id: coachId,
              name,
              icon,
              systemPrompt,
              creatorId,
              isPublic: true,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            useCoachStore.setState({
              coaches: [publicCoach],
            });

            // Mock Supabase update
            const mockUpdate = jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as jest.Mock).mockReturnValue({
              update: mockUpdate,
            });

            // Action: Toggle isPublic to false
            await useCoachStore.getState().updateCoach(coachId, { isPublic: false });

            // Assert: Database was updated with is_public=false
            expect(mockUpdate).toHaveBeenCalledWith({ is_public: false });

            // Assert: Local state was updated
            const updatedCoach = useCoachStore.getState().coaches.find(c => c.id === coachId);
            expect(updatedCoach?.isPublic).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 20.3: Visibility toggle is optimistically updated before database response', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          fc.string({ minLength: 1, maxLength: 50 }), // coach name
          fc.boolean(), // initial isPublic state
          async (coachId, name, initialIsPublic) => {
            // Setup: Create a coach with initial visibility state
            const coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'creator-123',
              isPublic: initialIsPublic,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            useCoachStore.setState({
              coaches: [coach],
            });

            // Mock Supabase update with a delay to simulate network latency
            let resolveUpdate: () => void;
            const updatePromise = new Promise<void>((resolve) => {
              resolveUpdate = resolve;
            });

            const mockUpdate = jest.fn().mockReturnValue({
              eq: jest.fn().mockImplementation(() => {
                return updatePromise.then(() => ({ error: null }));
              }),
            });
            (supabase.from as jest.Mock).mockReturnValue({
              update: mockUpdate,
            });

            // Action: Toggle isPublic
            const newIsPublic = !initialIsPublic;
            const updatePromiseResult = useCoachStore.getState().updateCoach(coachId, { isPublic: newIsPublic });

            // Assert: Local state is updated immediately (optimistic update)
            const coachBeforeDbUpdate = useCoachStore.getState().coaches.find(c => c.id === coachId);
            expect(coachBeforeDbUpdate?.isPublic).toBe(newIsPublic);

            // Complete the database update
            resolveUpdate!();
            await updatePromiseResult;

            // Assert: State remains consistent after database update
            const coachAfterDbUpdate = useCoachStore.getState().coaches.find(c => c.id === coachId);
            expect(coachAfterDbUpdate?.isPublic).toBe(newIsPublic);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 20.4: Multiple visibility toggles are handled correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // coach ID
          fc.string({ minLength: 1, maxLength: 50 }), // coach name
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // sequence of visibility states
          async (coachId, name, visibilitySequence) => {
            // Setup: Create a coach
            const coach = {
              id: coachId,
              name,
              icon: '🎯',
              systemPrompt: 'Test system prompt for property testing',
              creatorId: 'creator-123',
              isPublic: false,
              category: CoachCategory.GENERAL,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            useCoachStore.setState({
              coaches: [coach],
            });

            // Mock Supabase update
            const mockUpdate = jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            });
            (supabase.from as jest.Mock).mockReturnValue({
              update: mockUpdate,
            });

            // Action: Apply sequence of visibility toggles
            for (const isPublic of visibilitySequence) {
              await useCoachStore.getState().updateCoach(coachId, { isPublic });
              
              // Assert: State is updated after each toggle
              const updatedCoach = useCoachStore.getState().coaches.find(c => c.id === coachId);
              expect(updatedCoach?.isPublic).toBe(isPublic);
            }

            // Assert: Final state matches last toggle
            const finalCoach = useCoachStore.getState().coaches.find(c => c.id === coachId);
            expect(finalCoach?.isPublic).toBe(visibilitySequence[visibilitySequence.length - 1]);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
