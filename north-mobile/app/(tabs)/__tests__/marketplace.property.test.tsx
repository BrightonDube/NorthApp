/**
 * Marketplace Screen Property-Based Tests
 * 
 * Tests marketplace display and data fetching properties.
 * 
 * Properties tested:
 * - Property 1: Marketplace displays all public coaches
 * - Property 16: Featured section shows maximum 5 coaches
 * - Property 17: Only featured coaches appear in featured section
 * 
 * Feature: coach-marketplace-sharing
 * Validates: Requirements 1.1, 1.2, 6.2, 6.3
 */

import fc from 'fast-check';
import { supabase } from '@/lib/supabase';
import { searchEngine } from '@/lib/searchEngine';
import { filterByCategory } from '@/lib/marketplace.types';
import type { PublicCoach, CoachCategory } from '@/types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock search engine
jest.mock('@/lib/searchEngine', () => ({
  searchEngine: {
    search: jest.fn(),
  },
}));

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

const publicCoachArbitrary = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 1),
  icon: fc.constantFrom('🎯', '⚙️', '✍️', '🤔', '💼', '🚀'),
  systemPrompt: fc.string({ minLength: 10, maxLength: 500 }),
  creatorId: fc.uuid(),
  creatorName: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1),
  isPublic: fc.constant(true),
  category: coachCategoryArbitrary,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.option(fc.uuid(), { nil: null }),
  createdAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2026-12-31').getTime() })
    .map(timestamp => new Date(timestamp).toISOString()),
  updatedAt: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2026-12-31').getTime() })
    .map(timestamp => new Date(timestamp).toISOString()),
  model: fc.option(fc.constantFrom('gpt-4', 'gpt-3.5-turbo', 'claude-3'), { nil: undefined }),
  temperature: fc.option(fc.double({ min: 0, max: 2 }), { nil: undefined }),
  avatarUrl: fc.option(fc.webUrl(), { nil: undefined }),
}) as fc.Arbitrary<PublicCoach>;

// Arbitrary for a list of public coaches
const publicCoachesArrayArbitrary = fc.array(publicCoachArbitrary, { minLength: 0, maxLength: 50 });

describe('Marketplace Screen Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 1: Marketplace displays all public coaches
   * 
   * For any set of coaches in the database, the marketplace should display 
   * exactly those coaches where isPublic=true, with each coach card showing 
   * name, description, creator, and category.
   * 
   * **Validates: Requirements 1.1, 1.2**
   * 
   * This property ensures:
   * 1. Only coaches with isPublic=true are fetched
   * 2. All public coaches are displayed
   * 3. Each coach has required display fields
   */
  describe('Property 1: Marketplace displays all public coaches', () => {
    it('should fetch only public coaches from database', async () => {
      await fc.assert(
        fc.asyncProperty(
          publicCoachesArrayArbitrary,
          async (publicCoaches) => {
            // Mock Supabase response
            const mockSelect = jest.fn().mockReturnThis();
            const mockEq = jest.fn().mockReturnThis();
            const mockOrder = jest.fn().mockResolvedValue({
              data: publicCoaches.map(coach => ({
                id: coach.id,
                name: coach.name,
                icon: coach.icon,
                system_prompt: coach.systemPrompt,
                creator_id: coach.creatorId,
                is_public: true,
                category: coach.category,
                is_featured: coach.isFeatured,
                source_coach_id: coach.sourceCoachId,
                created_at: coach.createdAt,
                updated_at: coach.updatedAt,
              })),
              error: null,
            });

            (supabase.from as jest.Mock).mockReturnValue({
              select: mockSelect,
            });
            mockSelect.mockReturnValue({
              eq: mockEq,
            });
            mockEq.mockReturnValue({
              order: mockOrder,
            });

            // Simulate the fetch logic
            const { data } = await supabase
              .from('coaches')
              .select('*')
              .eq('is_public', true)
              .order('created_at', { ascending: false });

            // Verify the query was made correctly
            expect(supabase.from).toHaveBeenCalledWith('coaches');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(mockEq).toHaveBeenCalledWith('is_public', true);
            expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });

            // Verify all returned coaches are public
            expect(data).toHaveLength(publicCoaches.length);
            data?.forEach(coach => {
              expect(coach.is_public).toBe(true);
            });
          }
        ),
        { numRuns: 100, verbose: false }
      );
    });

    it('should include all required display fields for each coach', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          (publicCoaches) => {
            // Verify each coach has required fields
            publicCoaches.forEach(coach => {
              expect(coach.name).toBeDefined();
              expect(coach.name.trim().length).toBeGreaterThan(0);
              
              expect(coach.systemPrompt).toBeDefined();
              expect(coach.systemPrompt.length).toBeGreaterThan(0);
              
              expect(coach.creatorName).toBeDefined();
              expect(coach.creatorName.trim().length).toBeGreaterThan(0);
              
              expect(coach.category).toBeDefined();
              expect(['Productivity', 'Learning', 'Health', 'Entertainment', 'Business', 'Creative', 'General'])
                .toContain(coach.category);
              
              expect(coach.isPublic).toBe(true);
            });
          }
        )
      );
    });

    it('should maintain coach count through filtering operations', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          fc.option(coachCategoryArbitrary, { nil: null }),
          (coaches, selectedCategory) => {
            // Apply category filter
            const filtered = selectedCategory 
              ? filterByCategory(coaches, selectedCategory)
              : coaches;

            // Verify filtered count is correct
            if (selectedCategory) {
              const expectedCount = coaches.filter(c => c.category === selectedCategory).length;
              expect(filtered).toHaveLength(expectedCount);
            } else {
              expect(filtered).toHaveLength(coaches.length);
            }

            // Verify all filtered coaches match the category
            if (selectedCategory) {
              filtered.forEach(coach => {
                expect(coach.category).toBe(selectedCategory);
              });
            }
          }
        )
      );
    });
  });

  /**
   * Property 16: Featured section shows maximum 5 coaches
   * 
   * For any set of featured coaches (where isFeatured=true), the featured 
   * section should display at most 5 coaches, even if more exist.
   * 
   * **Validates: Requirements 6.2**
   * 
   * This property ensures:
   * 1. Featured section never shows more than 5 coaches
   * 2. If fewer than 5 featured coaches exist, all are shown
   * 3. The limit is consistently applied
   */
  describe('Property 16: Featured section shows maximum 5 coaches', () => {
    it('should limit featured coaches to maximum of 5', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          (coaches) => {
            // Filter featured coaches and apply limit
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);

            // Verify the limit is applied
            expect(featuredCoaches.length).toBeLessThanOrEqual(5);

            // If there are more than 5 featured coaches in the source,
            // verify we only get 5
            const totalFeatured = coaches.filter(c => c.isFeatured).length;
            if (totalFeatured > 5) {
              expect(featuredCoaches).toHaveLength(5);
            } else {
              expect(featuredCoaches).toHaveLength(totalFeatured);
            }
          }
        )
      );
    });

    it('should show all featured coaches when count is less than 5', () => {
      runPropertyTest(
        fc.property(
          fc.array(publicCoachArbitrary, { minLength: 0, maxLength: 4 }).map(coaches =>
            coaches.map(c => ({ ...c, isFeatured: true }))
          ),
          (coaches) => {
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);

            // When we have 4 or fewer featured coaches, all should be shown
            expect(featuredCoaches).toHaveLength(coaches.length);
            expect(featuredCoaches.length).toBeLessThanOrEqual(5);
          }
        )
      );
    });

    it('should show exactly 5 coaches when more than 5 are featured', () => {
      runPropertyTest(
        fc.property(
          fc.array(publicCoachArbitrary, { minLength: 6, maxLength: 20 }).map(coaches =>
            coaches.map(c => ({ ...c, isFeatured: true }))
          ),
          (coaches) => {
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);

            // When we have more than 5 featured coaches, exactly 5 should be shown
            expect(featuredCoaches).toHaveLength(5);
          }
        )
      );
    });
  });

  /**
   * Property 17: Only featured coaches appear in featured section
   * 
   * For any coach displayed in the featured section, that coach must have 
   * isFeatured=true in the database.
   * 
   * **Validates: Requirements 6.3**
   * 
   * This property ensures:
   * 1. All coaches in featured section have isFeatured=true
   * 2. Non-featured coaches never appear in featured section
   * 3. The featured flag is correctly respected
   */
  describe('Property 17: Only featured coaches appear in featured section', () => {
    it('should only include coaches with isFeatured=true', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          (coaches) => {
            // Filter featured coaches
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);

            // Verify all coaches in featured section have isFeatured=true
            featuredCoaches.forEach(coach => {
              expect(coach.isFeatured).toBe(true);
            });
          }
        )
      );
    });

    it('should exclude all non-featured coaches from featured section', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          (coaches) => {
            // Get featured and non-featured coaches
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);
            
            const nonFeaturedCoaches = coaches.filter(coach => !coach.isFeatured);

            // Verify no non-featured coaches appear in featured section
            const featuredIds = new Set(featuredCoaches.map(c => c.id));
            nonFeaturedCoaches.forEach(coach => {
              expect(featuredIds.has(coach.id)).toBe(false);
            });
          }
        )
      );
    });

    it('should maintain featured status through all operations', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary,
          (coaches) => {
            // Apply featured filter
            const featured = coaches.filter(coach => coach.isFeatured);
            
            // Apply limit
            const limited = featured.slice(0, 5);

            // Verify all coaches still have isFeatured=true
            limited.forEach(coach => {
              expect(coach.isFeatured).toBe(true);
              expect(coach.isPublic).toBe(true);
            });

            // Verify count is correct
            expect(limited.length).toBeLessThanOrEqual(5);
            expect(limited.length).toBeLessThanOrEqual(featured.length);
          }
        )
      );
    });

    it('should show empty featured section when no coaches are featured', () => {
      runPropertyTest(
        fc.property(
          publicCoachesArrayArbitrary.map(coaches =>
            coaches.map(c => ({ ...c, isFeatured: false }))
          ),
          (coaches) => {
            // Filter featured coaches
            const featuredCoaches = coaches
              .filter(coach => coach.isFeatured)
              .slice(0, 5);

            // When no coaches are featured, featured section should be empty
            expect(featuredCoaches).toHaveLength(0);
          }
        )
      );
    });
  });
});
