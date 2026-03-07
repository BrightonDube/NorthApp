/**
 * Property-Based Tests for CoachProfileScreen
 * 
 * Tests correctness properties for error handling in the coach profile screen.
 * 
 * Property tested:
 * - Property 14: Invalid coach ID shows error state
 * 
 * Validates: Requirements 8.4
 */

import React from 'react';
import fc from 'fast-check';
import { render } from '@testing-library/react-native';
import CoachProfileScreen from '../profile';
import { useCoachStore } from '@/stores/coachStore';
import type { Coach, CoachCategory } from '@/types';

// Mock dependencies
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

let mockParams = {
  coachId: 'test-coach-id',
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

jest.mock('@/stores/coachStore', () => ({
  useCoachStore: jest.fn(),
}));

describe('CoachProfileScreen Property-Based Tests', () => {
  const mockFetchCoaches = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.back.mockClear();
    mockRouter.push.mockClear();
  });

  /**
   * Arbitrary for generating invalid coach IDs
   * These are IDs that won't match any coach in the store
   */
  const invalidCoachIdArb = fc.oneof(
    // Random UUIDs that won't exist
    fc.uuid(),
    // Random strings
    fc.string({ minLength: 1, maxLength: 50 }),
    // Empty string
    fc.constant(''),
    // Special characters
    fc.constantFrom('!@#$%', '___', '---', '...'),
    // Very long strings
    fc.string({ minLength: 100, maxLength: 200 }),
    // Numeric strings
    fc.integer().map(n => n.toString()),
    // Mixed case variations
    fc.string({ minLength: 5, maxLength: 20 }).map(s => s.toUpperCase()),
    fc.string({ minLength: 5, maxLength: 20 }).map(s => s.toLowerCase())
  );

  /**
   * Arbitrary for generating valid coaches
   * Used to populate the store with coaches that won't match the invalid IDs
   */
  const coachArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    icon: fc.constantFrom('🎯', '💼', '🧠', '💪', '🎨', '📚', '🌟'),
    systemPrompt: fc.string({ minLength: 10, maxLength: 200 }),
    creatorId: fc.oneof(fc.constant(null), fc.uuid()),
    isPublic: fc.boolean(),
    category: fc.constantFrom(
      'Productivity',
      'Learning',
      'Health',
      'Entertainment',
      'Business',
      'Creative',
      'General'
    ) as fc.Arbitrary<CoachCategory>,
    isFeatured: fc.boolean(),
    sourceCoachId: fc.oneof(fc.constant(null), fc.uuid()),
    createdAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
    updatedAt: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  });

  /**
   * Property 14: Invalid coach ID shows error state
   * 
   * For any invalid or non-existent coach ID, the profile screen should
   * display an error state instead of crashing.
   * 
   * **Validates: Requirements 8.4**
   * 
   * This property ensures:
   * 1. The screen doesn't crash with invalid IDs
   * 2. An error message is displayed
   * 3. A "Go Back" button is available
   * 4. The error state is user-friendly
   */
  describe('Property 14: Invalid coach ID shows error state', () => {
    it('should display error state for any invalid coach ID', () => {
      fc.assert(
        fc.property(
          invalidCoachIdArb,
          fc.array(coachArb, { minLength: 0, maxLength: 10 }),
          (invalidId, coaches) => {
            // Ensure the invalid ID doesn't accidentally match a coach
            const filteredCoaches = coaches.filter(c => c.id !== invalidId);

            // Setup mock store with coaches that don't include the invalid ID
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches: filteredCoaches,
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set the invalid coach ID as the route parameter
            mockParams = { coachId: invalidId };

            // Render the component - it should not crash
            const { getByText, queryByText } = render(<CoachProfileScreen />);

            // Verify error state is displayed
            expect(getByText('Coach Not Found')).toBeTruthy();

            // Verify appropriate error message is shown
            const errorMessage = invalidId
              ? 'This coach is no longer available.'
              : 'No coach ID provided.';
            expect(getByText(errorMessage)).toBeTruthy();

            // Verify "Go Back" button is present
            expect(getByText('Go Back')).toBeTruthy();

            // Verify the "Start Coaching Session" button is NOT present
            expect(queryByText('Start Coaching Session')).toBeNull();

            // Verify coach information is NOT displayed
            filteredCoaches.forEach(coach => {
              expect(queryByText(coach.name)).toBeNull();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle undefined coach ID gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(coachArb, { minLength: 0, maxLength: 10 }),
          (coaches) => {
            // Setup mock store
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches,
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set undefined coach ID
            mockParams = { coachId: undefined as any };

            // Render the component - it should not crash
            const { getByText } = render(<CoachProfileScreen />);

            // Verify error state is displayed
            expect(getByText('Coach Not Found')).toBeTruthy();
            expect(getByText('No coach ID provided.')).toBeTruthy();
            expect(getByText('Go Back')).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle null coach ID gracefully', () => {
      fc.assert(
        fc.property(
          fc.array(coachArb, { minLength: 0, maxLength: 10 }),
          (coaches) => {
            // Setup mock store
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches,
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set null coach ID
            mockParams = { coachId: null as any };

            // Render the component - it should not crash
            const { getByText } = render(<CoachProfileScreen />);

            // Verify error state is displayed
            expect(getByText('Coach Not Found')).toBeTruthy();
            expect(getByText('No coach ID provided.')).toBeTruthy();
            expect(getByText('Go Back')).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not display coach information when ID is invalid', () => {
      fc.assert(
        fc.property(
          invalidCoachIdArb,
          fc.array(coachArb, { minLength: 1, maxLength: 5 }),
          (invalidId, coaches) => {
            // Ensure the invalid ID doesn't match any coach
            const filteredCoaches = coaches.filter(c => c.id !== invalidId);

            // Setup mock store
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches: filteredCoaches,
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set the invalid coach ID
            mockParams = { coachId: invalidId };

            // Render the component
            const { queryByText } = render(<CoachProfileScreen />);

            // Verify no coach names are displayed
            filteredCoaches.forEach(coach => {
              expect(queryByText(coach.name)).toBeNull();
            });

            // Verify no coach icons are displayed
            filteredCoaches.forEach(coach => {
              expect(queryByText(coach.icon)).toBeNull();
            });

            // Verify no coach categories are displayed
            filteredCoaches.forEach(coach => {
              expect(queryByText(coach.category)).toBeNull();
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display error state consistently for the same invalid ID', () => {
      fc.assert(
        fc.property(
          invalidCoachIdArb,
          (invalidId) => {
            // Setup mock store with empty coaches
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches: [],
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set the invalid coach ID
            mockParams = { coachId: invalidId };

            // Render the component multiple times
            const render1 = render(<CoachProfileScreen />);
            const render2 = render(<CoachProfileScreen />);

            // Both renders should show the same error state
            expect(render1.getByText('Coach Not Found')).toBeTruthy();
            expect(render2.getByText('Coach Not Found')).toBeTruthy();

            const errorMessage = invalidId
              ? 'This coach is no longer available.'
              : 'No coach ID provided.';
            expect(render1.getByText(errorMessage)).toBeTruthy();
            expect(render2.getByText(errorMessage)).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should allow navigation back from error state', () => {
      fc.assert(
        fc.property(
          invalidCoachIdArb,
          (invalidId) => {
            // Setup mock store
            (useCoachStore as unknown as jest.Mock).mockReturnValue({
              coaches: [],
              fetchCoaches: mockFetchCoaches,
              isLoading: false,
            });

            // Set the invalid coach ID
            mockParams = { coachId: invalidId };

            // Render the component
            const { getByText, getByLabelText } = render(<CoachProfileScreen />);

            // Verify "Go Back" button exists
            const goBackButton = getByText('Go Back');
            expect(goBackButton).toBeTruthy();

            // Verify the button has proper accessibility attributes
            const accessibleButton = getByLabelText('Go back');
            expect(accessibleButton).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
