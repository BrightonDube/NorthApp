/**
 * Category Filter Property-Based Tests
 * Feature: coach-marketplace-sharing
 * 
 * Property-based tests for category filtering functionality.
 * Tests verify that category filtering works correctly across all possible inputs.
 * 
 * Task: 7.2 Write property test for category filtering
 * Validates: Requirements 5.3
 */

import fc from 'fast-check';
import { runPropertyTest, property, timestampArbitrary } from '../utils/property-helpers';
import { CoachCategory, Coach } from '@/types';
import { filterByCategory } from '@/lib/marketplace.types';

/**
 * Arbitrary for generating valid CoachCategory values
 */
const coachCategoryArbitrary = fc.constantFrom(
  CoachCategory.PRODUCTIVITY,
  CoachCategory.LEARNING,
  CoachCategory.HEALTH,
  CoachCategory.ENTERTAINMENT,
  CoachCategory.BUSINESS,
  CoachCategory.CREATIVE,
  CoachCategory.GENERAL
);

/**
 * Arbitrary for generating Coach objects with random categories
 */
const coachArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.string({ minLength: 1, maxLength: 10 }),
  systemPrompt: fc.string({ minLength: 1, maxLength: 500 }),
  creatorId: fc.option(fc.uuid(), { nil: null }),
  isPublic: fc.boolean(),
  category: coachCategoryArbitrary,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.option(fc.uuid(), { nil: null }),
  createdAt: timestampArbitrary,
  updatedAt: timestampArbitrary,
}) as fc.Arbitrary<Coach>;

describe('Category Filter Property-Based Tests', () => {
  /**
   * Property 14: Category filter works correctly
   * 
   * **Validates: Requirements 5.3**
   * 
   * For any category selection, the marketplace should display only coaches
   * where the coach's category matches the selected category.
   */
  describe('Property 14: Category filter works correctly', () => {
    it('should return only coaches matching the selected category', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 0, maxLength: 50 }),
          coachCategoryArbitrary,
          (coaches, selectedCategory) => {
            const filtered = filterByCategory(coaches, selectedCategory);
            
            // All returned coaches must have the selected category
            filtered.forEach(coach => {
              expect(coach.category).toBe(selectedCategory);
            });
          }
        )
      );
    });

    it('should not return coaches with different categories', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 0, maxLength: 50 }),
          coachCategoryArbitrary,
          (coaches, selectedCategory) => {
            const filtered = filterByCategory(coaches, selectedCategory);
            
            // No coach with a different category should be in the results
            const otherCategories = Object.values(CoachCategory).filter(
              cat => cat !== selectedCategory
            );
            
            filtered.forEach(coach => {
              expect(otherCategories).not.toContain(coach.category);
            });
          }
        )
      );
    });

    it('should return all coaches when category is null (All filter)', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 0, maxLength: 50 }),
          (coaches) => {
            const filtered = filterByCategory(coaches, null);
            
            // When no category is selected, all coaches should be returned
            expect(filtered).toHaveLength(coaches.length);
            expect(filtered).toEqual(coaches);
          }
        )
      );
    });

    it('should return empty array when no coaches match the category', () => {
      runPropertyTest(
        property(
          coachCategoryArbitrary,
          coachCategoryArbitrary,
          (category1, category2) => {
            // Create coaches with only category1
            const coaches: Coach[] = fc.sample(
              coachArbitrary.map(coach => ({ ...coach, category: category1 })),
              5
            );
            
            // Filter by category2 (different from category1)
            if (category1 !== category2) {
              const filtered = filterByCategory(coaches, category2);
              expect(filtered).toHaveLength(0);
            }
          }
        )
      );
    });

    it('should preserve coach properties after filtering', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 1, maxLength: 50 }),
          coachCategoryArbitrary,
          (coaches, selectedCategory) => {
            const filtered = filterByCategory(coaches, selectedCategory);
            
            // Each filtered coach should be identical to its source
            filtered.forEach(filteredCoach => {
              const originalCoach = coaches.find(c => c.id === filteredCoach.id);
              expect(originalCoach).toBeDefined();
              expect(filteredCoach).toEqual(originalCoach);
            });
          }
        )
      );
    });

    it('should handle all valid categories correctly', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 10, maxLength: 50 }),
          (coaches) => {
            // Test filtering by each category
            Object.values(CoachCategory).forEach(category => {
              const filtered = filterByCategory(coaches, category);
              const expectedCount = coaches.filter(c => c.category === category).length;
              
              expect(filtered).toHaveLength(expectedCount);
              filtered.forEach(coach => {
                expect(coach.category).toBe(category);
              });
            });
          }
        )
      );
    });

    it('should be idempotent (filtering twice gives same result)', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 0, maxLength: 50 }),
          coachCategoryArbitrary,
          (coaches, selectedCategory) => {
            const filtered1 = filterByCategory(coaches, selectedCategory);
            const filtered2 = filterByCategory(filtered1, selectedCategory);
            
            // Filtering already-filtered results should give the same result
            expect(filtered2).toEqual(filtered1);
          }
        )
      );
    });

    it('should maintain order of coaches after filtering', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 0, maxLength: 50 }),
          coachCategoryArbitrary,
          (coaches, selectedCategory) => {
            const filtered = filterByCategory(coaches, selectedCategory);
            
            // Get indices of filtered coaches in original array
            const originalIndices = filtered.map(filteredCoach =>
              coaches.findIndex(c => c.id === filteredCoach.id)
            );
            
            // Indices should be in ascending order (preserving original order)
            for (let i = 1; i < originalIndices.length; i++) {
              expect(originalIndices[i]).toBeGreaterThan(originalIndices[i - 1]);
            }
          }
        )
      );
    });

    it('should handle edge case of empty coach array', () => {
      runPropertyTest(
        property(
          coachCategoryArbitrary,
          (selectedCategory) => {
            const filtered = filterByCategory([], selectedCategory);
            expect(filtered).toHaveLength(0);
            expect(filtered).toEqual([]);
          }
        )
      );
    });

    it('should handle edge case of all coaches in same category', () => {
      runPropertyTest(
        property(
          fc.array(coachArbitrary, { minLength: 1, maxLength: 20 }),
          coachCategoryArbitrary,
          (coaches, category) => {
            // Set all coaches to the same category
            const sameCategory = coaches.map(coach => ({ ...coach, category }));
            
            const filtered = filterByCategory(sameCategory, category);
            
            // All coaches should be returned
            expect(filtered).toHaveLength(sameCategory.length);
            expect(filtered).toEqual(sameCategory);
          }
        )
      );
    });
  });
});
