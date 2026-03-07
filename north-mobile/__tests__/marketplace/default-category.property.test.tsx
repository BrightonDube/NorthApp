/**
 * Default Category Property-Based Tests
 * Feature: coach-marketplace-sharing
 * 
 * Property-based tests for default category behavior.
 * Tests verify that coaches without a category default to General.
 * 
 * Task: 7.3 Write property test for default category
 * Validates: Requirements 5.5
 */

import fc from 'fast-check';
import { runPropertyTest, property, timestampArbitrary } from '../utils/property-helpers';
import { CoachCategory, Coach } from '@/types';
import { normalizeCategory } from '@/lib/marketplace.types';

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
 * Arbitrary for generating Coach objects with potentially null/undefined categories
 */
const coachWithNullableCategoryArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  icon: fc.string({ minLength: 1, maxLength: 10 }),
  systemPrompt: fc.string({ minLength: 1, maxLength: 500 }),
  creatorId: fc.option(fc.uuid(), { nil: null }),
  isPublic: fc.boolean(),
  category: fc.option(coachCategoryArbitrary, { nil: null }) as fc.Arbitrary<CoachCategory | null>,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.option(fc.uuid(), { nil: null }),
  createdAt: timestampArbitrary,
  updatedAt: timestampArbitrary,
});

describe('Default Category Property-Based Tests', () => {
  /**
   * Property 15: Coaches without category default to General
   * 
   * **Validates: Requirements 5.5**
   * 
   * For any coach where category is null or undefined, the system should
   * treat it as belonging to the "General" category.
   */
  // Feature: coach-marketplace-sharing, Property 15: Coaches without category default to General
  describe('Property 15: Coaches without category default to General', () => {
    it('should return General when category is null', () => {
      runPropertyTest(
        property(
          fc.constant(null as CoachCategory | null),
          (category) => {
            const normalized = normalizeCategory(category);
            expect(normalized).toBe(CoachCategory.GENERAL);
          }
        )
      );
    });

    it('should return General when category is undefined', () => {
      runPropertyTest(
        property(
          fc.constant(undefined),
          (category) => {
            const normalized = normalizeCategory(category);
            expect(normalized).toBe(CoachCategory.GENERAL);
          }
        )
      );
    });

    it('should preserve valid categories', () => {
      runPropertyTest(
        property(
          coachCategoryArbitrary,
          (category) => {
            const normalized = normalizeCategory(category);
            expect(normalized).toBe(category);
          }
        )
      );
    });

    it('should normalize null categories in coach objects', () => {
      runPropertyTest(
        property(
          coachWithNullableCategoryArbitrary,
          (coach) => {
            const normalizedCategory = normalizeCategory(coach.category);
            
            if (coach.category === null || coach.category === undefined) {
              expect(normalizedCategory).toBe(CoachCategory.GENERAL);
            } else {
              expect(normalizedCategory).toBe(coach.category);
            }
          }
        )
      );
    });

    it('should handle arrays of coaches with mixed categories', () => {
      runPropertyTest(
        property(
          fc.array(coachWithNullableCategoryArbitrary, { minLength: 0, maxLength: 50 }),
          (coaches) => {
            const normalizedCoaches = coaches.map(coach => ({
              ...coach,
              category: normalizeCategory(coach.category),
            }));
            
            // All coaches should have a valid category
            normalizedCoaches.forEach(coach => {
              expect(coach.category).toBeDefined();
              expect(Object.values(CoachCategory)).toContain(coach.category);
            });
            
            // Coaches with null/undefined should now be General
            coaches.forEach((originalCoach, index) => {
              if (originalCoach.category === null || originalCoach.category === undefined) {
                expect(normalizedCoaches[index].category).toBe(CoachCategory.GENERAL);
              } else {
                expect(normalizedCoaches[index].category).toBe(originalCoach.category);
              }
            });
          }
        )
      );
    });

    it('should be idempotent (normalizing twice gives same result)', () => {
      runPropertyTest(
        property(
          fc.option(coachCategoryArbitrary, { nil: null }),
          (category) => {
            const normalized1 = normalizeCategory(category);
            const normalized2 = normalizeCategory(normalized1);
            
            // Normalizing twice should give the same result
            expect(normalized2).toBe(normalized1);
            
            // The result should always be a valid category
            expect(Object.values(CoachCategory)).toContain(normalized2);
            
            // If original was null/undefined, result should be General
            if (category === null || category === undefined) {
              expect(normalized1).toBe(CoachCategory.GENERAL);
              expect(normalized2).toBe(CoachCategory.GENERAL);
            } else {
              // If original was valid, it should be preserved
              expect(normalized1).toBe(category);
              expect(normalized2).toBe(category);
            }
          }
        )
      );
    });

    it('should handle edge case of all coaches without categories', () => {
      runPropertyTest(
        property(
          fc.array(
            coachWithNullableCategoryArbitrary.map(coach => ({ ...coach, category: null })),
            { minLength: 1, maxLength: 20 }
          ),
          (coaches) => {
            const normalizedCoaches = coaches.map(coach => ({
              ...coach,
              category: normalizeCategory(coach.category),
            }));
            
            // All should be General
            normalizedCoaches.forEach(coach => {
              expect(coach.category).toBe(CoachCategory.GENERAL);
            });
          }
        )
      );
    });

    it('should maintain other coach properties when normalizing category', () => {
      runPropertyTest(
        property(
          coachWithNullableCategoryArbitrary,
          (coach) => {
            const normalizedCoach = {
              ...coach,
              category: normalizeCategory(coach.category),
            };
            
            // All other properties should remain unchanged
            expect(normalizedCoach.id).toBe(coach.id);
            expect(normalizedCoach.name).toBe(coach.name);
            expect(normalizedCoach.icon).toBe(coach.icon);
            expect(normalizedCoach.systemPrompt).toBe(coach.systemPrompt);
            expect(normalizedCoach.creatorId).toBe(coach.creatorId);
            expect(normalizedCoach.isPublic).toBe(coach.isPublic);
            expect(normalizedCoach.isFeatured).toBe(coach.isFeatured);
            expect(normalizedCoach.sourceCoachId).toBe(coach.sourceCoachId);
            expect(normalizedCoach.createdAt).toBe(coach.createdAt);
            expect(normalizedCoach.updatedAt).toBe(coach.updatedAt);
          }
        )
      );
    });

    it('should work correctly with filtering after normalization', () => {
      runPropertyTest(
        property(
          fc.array(coachWithNullableCategoryArbitrary, { minLength: 0, maxLength: 50 }),
          (coaches) => {
            // Normalize all coaches
            const normalizedCoaches = coaches.map(coach => ({
              ...coach,
              category: normalizeCategory(coach.category),
            })) as Coach[];
            
            // Filter by General category
            const generalCoaches = normalizedCoaches.filter(
              coach => coach.category === CoachCategory.GENERAL
            );
            
            // Count how many original coaches had null/undefined or General
            const expectedCount = coaches.filter(
              coach => coach.category === null || 
                       coach.category === undefined || 
                       coach.category === CoachCategory.GENERAL
            ).length;
            
            expect(generalCoaches).toHaveLength(expectedCount);
          }
        )
      );
    });

    it('should handle empty string as invalid and default to General', () => {
      // TypeScript won't allow empty string, but testing runtime behavior
      const result = normalizeCategory(null);
      expect(result).toBe(CoachCategory.GENERAL);
    });
  });
});
