/**
 * Coach Marketplace Sharing Property-Based Tests
 * 
 * Tests sharing behavior and visibility properties for coach marketplace.
 * 
 * Properties tested:
 * - Property 5: Private coaches cannot be shared
 * 
 * Feature: coach-marketplace-sharing
 * Validates: Requirements 2.5
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import fc from 'fast-check';
import { CoachCard } from '../CoachCard';
import type { Coach, PublicCoach, CoachCategory } from '@/types';

// Helper to run property tests with consistent configuration
function runPropertyTest(property: fc.IProperty<any>) {
  fc.assert(property, {
    numRuns: 100,
    verbose: false,
  });
}

// Arbitraries for generating test data
const coachCategoryArbitrary = fc.constantFrom(
  'Productivity' as CoachCategory,
  'Learning' as CoachCategory,
  'Health' as CoachCategory,
  'Entertainment' as CoachCategory,
  'Business' as CoachCategory,
  'Creative' as CoachCategory,
  'General' as CoachCategory
);

const baseCoachArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1),
  icon: fc.constantFrom('🎯', '⚙️', '✍️', '🤔', '💼', '🚀'),
  systemPrompt: fc.string({ minLength: 10, maxLength: 500 }),
  creatorId: fc.option(fc.uuid(), { nil: null }),
  category: coachCategoryArbitrary,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.option(fc.uuid(), { nil: null }),
  createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2026-12-31').getTime() })
    .map(timestamp => new Date(timestamp).toISOString()),
  updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2026-12-31').getTime() })
    .map(timestamp => new Date(timestamp).toISOString()),
});

// Arbitrary for private coaches (isPublic = false)
const privateCoachArbitrary = baseCoachArbitrary.map(coach => ({
  ...coach,
  isPublic: false,
})) as fc.Arbitrary<Coach>;

// Arbitrary for public coaches (isPublic = true)
const publicCoachArbitrary = fc.tuple(
  baseCoachArbitrary,
  fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1),
  fc.option(fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-3'), { nil: undefined }),
  fc.option(fc.double({ min: 0, max: 2 }), { nil: undefined }),
  fc.option(fc.webUrl(), { nil: undefined })
).map(([coach, creatorName, model, temperature, avatarUrl]) => ({
  ...coach,
  isPublic: true,
  creatorName,
  model,
  temperature,
  avatarUrl,
})) as fc.Arbitrary<PublicCoach>;

// Arbitrary for any coach (public or private)
const anyCoachArbitrary = fc.oneof(
  privateCoachArbitrary,
  publicCoachArbitrary
);

describe('Coach Marketplace Sharing Property-Based Tests', () => {
  /**
   * Property 5: Private coaches cannot be shared
   * 
   * For any coach where isPublic=false, the share button should either be 
   * hidden or disabled, preventing users from sharing private coaches.
   * 
   * **Validates: Requirements 2.5**
   * 
   * This property ensures:
   * 1. Private coaches (isPublic=false) never show a share button
   * 2. The share button is only visible when coach.isPublic=true
   * 3. Even if showShareButton prop is true, private coaches don't show the button
   * 4. The onShare callback is never triggered for private coaches
   */
  describe('Property 5: Private coaches cannot be shared', () => {
    it('should not render share button for any private coach', () => {
      runPropertyTest(
        fc.property(
          privateCoachArbitrary,
          (coach) => {
            const mockOnPress = jest.fn();
            const mockOnShare = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                onShare={mockOnShare}
                showShareButton={true}
                variant="marketplace"
                testID="coach-card"
              />
            );

            // Share button should not be present for private coaches
            const shareButton = queryByTestId('coach-card-share-button');
            expect(shareButton).toBeNull();
          }
        )
      );
    });

    it('should only show share button for public coaches', () => {
      runPropertyTest(
        fc.property(
          anyCoachArbitrary,
          (coach) => {
            const mockOnPress = jest.fn();
            const mockOnShare = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                onShare={mockOnShare}
                showShareButton={true}
                variant="marketplace"
                testID="coach-card"
              />
            );

            const shareButton = queryByTestId('coach-card-share-button');
            
            // Share button visibility should match isPublic status
            if (coach.isPublic) {
              expect(shareButton).toBeTruthy();
            } else {
              expect(shareButton).toBeNull();
            }
          }
        )
      );
    });

    it('should never show share button for private coaches regardless of props', () => {
      runPropertyTest(
        fc.property(
          privateCoachArbitrary,
          fc.boolean(), // showShareButton prop
          fc.constantFrom('default', 'marketplace'), // variant prop
          (coach, showShareButton, variant) => {
            const mockOnPress = jest.fn();
            const mockOnShare = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                onShare={mockOnShare}
                showShareButton={showShareButton}
                variant={variant as 'default' | 'marketplace'}
                testID="coach-card"
              />
            );

            // Share button should never appear for private coaches,
            // regardless of showShareButton or variant props
            const shareButton = queryByTestId('coach-card-share-button');
            expect(shareButton).toBeNull();
          }
        )
      );
    });

    it('should show share button for public coaches when all conditions are met', () => {
      runPropertyTest(
        fc.property(
          publicCoachArbitrary,
          (coach) => {
            const mockOnPress = jest.fn();
            const mockOnShare = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                onShare={mockOnShare}
                showShareButton={true}
                variant="marketplace"
                testID="coach-card"
              />
            );

            // Share button should be present for public coaches
            // when showShareButton=true and onShare is provided
            const shareButton = queryByTestId('coach-card-share-button');
            expect(shareButton).toBeTruthy();
          }
        )
      );
    });

    it('should hide share button when showShareButton is false, even for public coaches', () => {
      runPropertyTest(
        fc.property(
          publicCoachArbitrary,
          (coach) => {
            const mockOnPress = jest.fn();
            const mockOnShare = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                onShare={mockOnShare}
                showShareButton={false}
                variant="marketplace"
                testID="coach-card"
              />
            );

            // Share button should not be present when showShareButton=false
            const shareButton = queryByTestId('coach-card-share-button');
            expect(shareButton).toBeNull();
          }
        )
      );
    });

    it('should hide share button when onShare callback is not provided', () => {
      runPropertyTest(
        fc.property(
          publicCoachArbitrary,
          (coach) => {
            const mockOnPress = jest.fn();
            
            const { queryByTestId } = render(
              <CoachCard 
                coach={coach}
                onPress={mockOnPress}
                showShareButton={true}
                variant="marketplace"
                testID="coach-card"
              />
            );

            // Share button should not be present when onShare is not provided
            const shareButton = queryByTestId('coach-card-share-button');
            expect(shareButton).toBeNull();
          }
        )
      );
    });
  });
});
