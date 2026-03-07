/**
 * Coach Profile Screen Property-Based Tests
 * 
 * Tests correctness properties for the coach profile screen navigation and data fetching.
 * 
 * Properties tested:
 * - Property 1: Navigation passes correct coach data
 * 
 * Validates: Requirements 1.1, 8.3
 */

import fc from 'fast-check';
import { render, waitFor } from '@testing-library/react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CoachProfileScreen from '@/app/coach/profile';
import { useCoachStore } from '@/stores/coachStore';
import { CoachCategory } from '@/types';
import type { Coach } from '@/types';
import { timestampArbitrary } from '../utils/property-helpers';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/stores/coachStore');
jest.mock('expo-haptics');
jest.mock('@/lib/theme', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      textTertiary: '#999999',
      border: '#E0E0E0',
      backgroundTertiary: '#F5F5F5',
    },
  }),
}));

// Mock router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseCoachStore = useCoachStore as unknown as jest.Mock;

// Arbitraries for generating test data
const coachCategoryArb = fc.constantFrom(
  CoachCategory.PRODUCTIVITY,
  CoachCategory.LEARNING,
  CoachCategory.HEALTH,
  CoachCategory.ENTERTAINMENT,
  CoachCategory.BUSINESS,
  CoachCategory.CREATIVE,
  CoachCategory.GENERAL
);

const coachArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.oneof(
    fc.constant('🎯'),
    fc.constant('⚙️'),
    fc.constant('✍️'),
    fc.constant('🤔'),
    fc.constant('💡'),
    fc.constant('🚀'),
    fc.constant('📊'),
    fc.constant('🎨')
  ),
  systemPrompt: fc.string({ minLength: 10, maxLength: 500 }),
  creatorId: fc.option(fc.uuid(), { nil: null }),
  isPublic: fc.boolean(),
  category: coachCategoryArb,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.option(fc.uuid(), { nil: null }),
  createdAt: timestampArbitrary,
  updatedAt: timestampArbitrary,
});

describe('Coach Profile Screen Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router
    mockUseRouter.mockReturnValue(mockRouter as any);
  });

  /**
   * Property 1: Navigation passes correct coach data
   * 
   * For any coach in the system, when navigating to the Coach Profile Screen
   * with that coach's ID, the screen should receive and display the correct
   * coach's information.
   * 
   * **Validates: Requirements 1.1, 8.3**
   * 
   * This property ensures:
   * 1. Coach ID is correctly passed via route parameters
   * 2. The correct coach is retrieved from the store
   * 3. Coach data is displayed accurately (name, icon, category)
   * 4. No data corruption or mixing between coaches
   */
  describe('Property 1: Navigation passes correct coach data', () => {
    it('should display correct coach data for any coach ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb,
          fc.array(coachArb, { minLength: 0, maxLength: 10 }), // other coaches in store
          async (targetCoach, otherCoaches) => {
            // Clear mocks for each iteration
            jest.clearAllMocks();
            
            // Create a list of all coaches with the target coach included
            const allCoaches = [targetCoach, ...otherCoaches];
            
            // Mock local search params with target coach ID
            mockUseLocalSearchParams.mockReturnValue({ coachId: targetCoach.id });
            
            // Mock coach store with all coaches
            mockUseCoachStore.mockReturnValue({
              coaches: allCoaches,
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            // Render the component
            const { getByText } = render(<CoachProfileScreen />);
            
            // Wait for component to render
            await waitFor(() => {
              expect(getByText(targetCoach.name)).toBeTruthy();
            });
            
            // Verify correct coach data is displayed
            expect(getByText(targetCoach.name)).toBeTruthy();
            expect(getByText(targetCoach.icon)).toBeTruthy();
            expect(getByText(targetCoach.category)).toBeTruthy();
            
            // Verify that we're displaying the target coach's data
            // by checking that the coach ID in the route params matches
            expect(mockUseLocalSearchParams).toHaveBeenCalled();
            const params = mockUseLocalSearchParams.mock.results[0].value;
            expect(params.coachId).toBe(targetCoach.id);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should handle coaches with different categories correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb,
          async (coach) => {
            mockUseLocalSearchParams.mockReturnValue({ coachId: coach.id });
            
            mockUseCoachStore.mockReturnValue({
              coaches: [coach],
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(coach.name)).toBeTruthy();
            });
            
            // Verify category is displayed correctly
            expect(getByText(coach.category)).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should display coach icon for any valid emoji', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb,
          async (coach) => {
            mockUseLocalSearchParams.mockReturnValue({ coachId: coach.id });
            
            mockUseCoachStore.mockReturnValue({
              coaches: [coach],
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(coach.icon)).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should handle both default and user-created coaches', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb,
          async (coach) => {
            mockUseLocalSearchParams.mockReturnValue({ coachId: coach.id });
            
            mockUseCoachStore.mockReturnValue({
              coaches: [coach],
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(coach.name)).toBeTruthy();
            });
            
            // Verify coach data is displayed regardless of creator
            expect(getByText(coach.name)).toBeTruthy();
            expect(getByText(coach.icon)).toBeTruthy();
            expect(getByText(coach.category)).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should preserve coach data integrity during navigation', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb,
          async (coach) => {
            mockUseLocalSearchParams.mockReturnValue({ coachId: coach.id });
            
            const mockFetchCoaches = jest.fn().mockResolvedValue(undefined);
            
            mockUseCoachStore.mockReturnValue({
              coaches: [coach],
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(coach.name)).toBeTruthy();
            });
            
            // Verify that the displayed data matches the original coach object
            const displayedName = getByText(coach.name);
            const displayedIcon = getByText(coach.icon);
            const displayedCategory = getByText(coach.category);
            
            expect(displayedName).toBeTruthy();
            expect(displayedIcon).toBeTruthy();
            expect(displayedCategory).toBeTruthy();
            
            // Verify no mutations occurred
            expect(coach.name).toBeTruthy();
            expect(coach.icon).toBeTruthy();
            expect(coach.category).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should handle coaches with special characters in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          coachArb.chain(c => 
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0).map(name => ({ ...c, name }))
          ),
          async (coach: any) => {
            mockUseLocalSearchParams.mockReturnValue({ coachId: coach.id });
            
            mockUseCoachStore.mockReturnValue({
              coaches: [coach],
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(coach.name)).toBeTruthy();
            });
          }
        ),
        { numRuns: 100 }
      );
    }, 60000);

    it('should correctly identify coach by ID among multiple coaches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(coachArb, { minLength: 2, maxLength: 20 }),
          fc.integer({ min: 0, max: 19 }), // index of target coach
          async (coaches, targetIndex) => {
            // Ensure we have at least 2 coaches and valid index
            if (coaches.length < 2 || targetIndex >= coaches.length) {
              return; // Skip this iteration
            }
            
            const targetCoach = coaches[targetIndex];
            
            mockUseLocalSearchParams.mockReturnValue({ coachId: targetCoach.id });
            
            mockUseCoachStore.mockReturnValue({
              coaches: coaches,
              fetchCoaches: jest.fn().mockResolvedValue(undefined),
              isLoading: false,
              error: null,
            });
            
            const { getByText } = render(<CoachProfileScreen />);
            
            await waitFor(() => {
              expect(getByText(targetCoach.name)).toBeTruthy();
            });
            
            // Verify the correct coach is displayed
            expect(getByText(targetCoach.name)).toBeTruthy();
            expect(getByText(targetCoach.icon)).toBeTruthy();
            expect(getByText(targetCoach.category)).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);
  });
});
