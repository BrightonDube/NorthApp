/**
 * Search Engine Property-Based Tests
 * 
 * Property-based tests for search functionality in the coach marketplace.
 * Feature: coach-marketplace-sharing
 * 
 * Validates: Requirements 7.1, 7.2
 */

import * as fc from 'fast-check';
import { CoachSearchEngine } from '../searchEngine';
import { PublicCoach, CoachCategory } from '../../types';

/**
 * Custom arbitraries for search property testing
 */

// Coach name arbitrary (non-empty, max 100 chars)
const coachNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// Coach icon arbitrary (emoji or simple string)
const coachIconArbitrary = fc.oneof(
  fc.constant('🤖'),
  fc.constant('🎯'),
  fc.constant('💡'),
  fc.constant('🚀'),
  fc.constant('📚'),
  fc.constant('💪'),
  fc.constant('🎨'),
  fc.constant('⚡')
);

// System prompt arbitrary (non-empty, max 2000 chars)
const systemPromptArbitrary = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

// Creator name arbitrary (non-empty, max 100 chars)
const creatorNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// Coach category arbitrary
const coachCategoryArbitrary = fc.oneof(
  fc.constant(CoachCategory.PRODUCTIVITY),
  fc.constant(CoachCategory.LEARNING),
  fc.constant(CoachCategory.HEALTH),
  fc.constant(CoachCategory.ENTERTAINMENT),
  fc.constant(CoachCategory.BUSINESS),
  fc.constant(CoachCategory.CREATIVE),
  fc.constant(CoachCategory.GENERAL)
);

// ISO timestamp arbitrary - use integer timestamps to avoid invalid dates
const timestampArbitrary = fc
  .integer({ min: new Date('2024-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((timestamp) => new Date(timestamp).toISOString());

// Public coach arbitrary
const publicCoachArbitrary = fc.record({
  id: fc.uuid(),
  name: coachNameArbitrary,
  icon: coachIconArbitrary,
  systemPrompt: systemPromptArbitrary,
  creatorId: fc.uuid(),
  creatorName: creatorNameArbitrary,
  isPublic: fc.constant(true),
  category: coachCategoryArbitrary,
  isFeatured: fc.boolean(),
  sourceCoachId: fc.constant(null),
  createdAt: timestampArbitrary,
  updatedAt: timestampArbitrary,
});

describe('Search Engine Properties', () => {
  let searchEngine: CoachSearchEngine;

  beforeEach(() => {
    searchEngine = new CoachSearchEngine();
  });

  /**
   * Property 18: Search matches across multiple fields
   * 
   * **Validates: Requirements 7.1, 7.2**
   * 
   * For any search query, the results should include all coaches where the query
   * appears in the coach name, description (system prompt), or creator name
   * (case-insensitive).
   */
  // Feature: coach-marketplace-sharing, Property 18: Search matches across multiple fields
  describe('Property 18: Search matches across multiple fields', () => {
    it('Property 18.1: Search finds coaches with query in name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          async (coaches, searchTerm) => {
            // Create a coach that definitely contains the search term in its name
            const matchingCoach: PublicCoach = {
              ...coaches[0],
              id: 'matching-coach-id',
              name: `Test ${searchTerm} Coach`,
              systemPrompt: 'Different content without the term',
              creatorName: 'Different creator',
            };

            // Add the matching coach to the array
            const allCoaches = [...coaches, matchingCoach];

            // Perform search
            const results = searchEngine.search(allCoaches, searchTerm);

            // Verify the matching coach is in the results
            const foundMatch = results.some((coach) => coach.id === matchingCoach.id);
            expect(foundMatch).toBe(true);

            // Verify all results contain the search term in at least one field
            // Note: We need to trim the search term because the search engine trims it
            const trimmedSearchTerm = searchTerm.trim();
            results.forEach((coach) => {
              const nameMatch = coach.name.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const promptMatch = coach.systemPrompt.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const creatorMatch = coach.creatorName.toLowerCase().includes(trimmedSearchTerm.toLowerCase());

              expect(nameMatch || promptMatch || creatorMatch).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.2: Search finds coaches with query in system prompt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          async (searchTerm) => {
            // Create a coach that definitely contains the search term ONLY in its system prompt
            // Use UUID-like strings that are very unlikely to match the search term
            const uniqueId = 'aaaabbbbccccddddeeeeffffgggg';
            const matchingCoach: PublicCoach = {
              id: 'matching-coach-id',
              name: uniqueId,
              icon: '📚',
              systemPrompt: `I help with ${searchTerm} and other tasks`,
              creatorName: uniqueId,
              isPublic: true,
              category: CoachCategory.LEARNING,
              isFeatured: false,
              sourceCoachId: null,
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
            };

            // Perform search with just this coach
            const results = searchEngine.search([matchingCoach], searchTerm);

            // Verify the matching coach is in the results
            expect(results.length).toBeGreaterThan(0);
            const foundMatch = results.some((coach) => coach.id === matchingCoach.id);
            expect(foundMatch).toBe(true);

            // Verify the result contains the search term in the system prompt
            const result = results.find((coach) => coach.id === matchingCoach.id);
            expect(result).toBeDefined();
            if (result) {
              const promptMatch = result.systemPrompt.toLowerCase().includes(searchTerm.toLowerCase());
              expect(promptMatch).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.3: Search finds coaches with query in creator name', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          async (coaches, searchTerm) => {
            // Create a coach that definitely contains the search term in creator name
            const matchingCoach: PublicCoach = {
              ...coaches[0],
              id: 'matching-coach-id',
              name: 'Different Name',
              systemPrompt: 'Different content',
              creatorName: `${searchTerm} Creator`,
            };

            // Add the matching coach to the array
            const allCoaches = [...coaches, matchingCoach];

            // Perform search
            const results = searchEngine.search(allCoaches, searchTerm);

            // Verify the matching coach is in the results
            const foundMatch = results.some((coach) => coach.id === matchingCoach.id);
            expect(foundMatch).toBe(true);

            // Verify all results contain the search term in at least one field
            // Note: We need to trim the search term because the search engine trims it
            const trimmedSearchTerm = searchTerm.trim();
            results.forEach((coach) => {
              const nameMatch = coach.name.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const promptMatch = coach.systemPrompt.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const creatorMatch = coach.creatorName.toLowerCase().includes(trimmedSearchTerm.toLowerCase());

              expect(nameMatch || promptMatch || creatorMatch).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.4: Search is case-insensitive across all fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          fc.constantFrom('lower', 'upper', 'mixed'),
          async (coaches, searchTerm, caseVariant) => {
            // Transform the search term based on case variant
            let transformedTerm: string;
            switch (caseVariant) {
              case 'lower':
                transformedTerm = searchTerm.toLowerCase();
                break;
              case 'upper':
                transformedTerm = searchTerm.toUpperCase();
                break;
              case 'mixed':
                transformedTerm = searchTerm
                  .split('')
                  .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
                  .join('');
                break;
              default:
                transformedTerm = searchTerm;
            }

            // Create coaches with the search term in different cases
            const coachWithNameMatch: PublicCoach = {
              ...coaches[0],
              id: 'name-match-id',
              name: `Test ${searchTerm.toUpperCase()} Coach`,
              systemPrompt: 'Different content',
              creatorName: 'Different creator',
            };

            const coachWithPromptMatch: PublicCoach = {
              ...coaches[0],
              id: 'prompt-match-id',
              name: 'Different Name',
              systemPrompt: `I help with ${searchTerm.toLowerCase()} tasks`,
              creatorName: 'Different creator',
            };

            const coachWithCreatorMatch: PublicCoach = {
              ...coaches[0],
              id: 'creator-match-id',
              name: 'Different Name',
              systemPrompt: 'Different content',
              creatorName: `${searchTerm} Creator`,
            };

            const allCoaches = [...coaches, coachWithNameMatch, coachWithPromptMatch, coachWithCreatorMatch];

            // Perform search with transformed term
            const results = searchEngine.search(allCoaches, transformedTerm);

            // Verify all three matching coaches are found regardless of case
            const foundNameMatch = results.some((coach) => coach.id === coachWithNameMatch.id);
            const foundPromptMatch = results.some((coach) => coach.id === coachWithPromptMatch.id);
            const foundCreatorMatch = results.some((coach) => coach.id === coachWithCreatorMatch.id);

            expect(foundNameMatch).toBe(true);
            expect(foundPromptMatch).toBe(true);
            expect(foundCreatorMatch).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.5: Search returns all coaches matching in any field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }).filter((s) => {
            const trimmed = s.trim();
            // Ensure the search term is unique enough and doesn't contain common substrings
            return trimmed.length >= 3 && !/^[a-zA-Z]$/.test(trimmed);
          }),
          async (searchTerm) => {
            // Use a unique prefix that won't accidentally match the search term
            // Avoid common letter combinations by using underscores as separators
            const uniquePrefix = 'xyz_qwerty_prefix';
            
            // Create coaches with the search term in different fields
            const coaches: PublicCoach[] = [
              {
                id: 'coach-1',
                name: `${searchTerm} in title field`,
                icon: '🤖',
                systemPrompt: `${uniquePrefix} prompt without term`,
                creatorId: 'user-1',
                creatorName: `${uniquePrefix}_creator1`,
                isPublic: true,
                category: CoachCategory.PRODUCTIVITY,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
              {
                id: 'coach-2',
                name: `${uniquePrefix}_title2`,
                icon: '📚',
                systemPrompt: `Contains ${searchTerm} in prompt`,
                creatorId: 'user-2',
                creatorName: `${uniquePrefix}_creator2`,
                isPublic: true,
                category: CoachCategory.LEARNING,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
              },
              {
                id: 'coach-3',
                name: `${uniquePrefix}_title3`,
                icon: '💪',
                systemPrompt: `${uniquePrefix} prompt without term`,
                creatorId: 'user-3',
                creatorName: `${searchTerm} Creator`,
                isPublic: true,
                category: CoachCategory.HEALTH,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-03T00:00:00Z',
                updatedAt: '2024-01-03T00:00:00Z',
              },
              {
                id: 'coach-4',
                name: `${uniquePrefix}_title4`,
                icon: '🎨',
                systemPrompt: `${uniquePrefix} prompt without term`,
                creatorId: 'user-4',
                creatorName: `${uniquePrefix}_creator4`,
                isPublic: true,
                category: CoachCategory.CREATIVE,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-04T00:00:00Z',
                updatedAt: '2024-01-04T00:00:00Z',
              },
            ];

            // Perform search
            const results = searchEngine.search(coaches, searchTerm);

            // Verify exactly 3 coaches are returned (those with matches)
            expect(results.length).toBe(3);

            // Verify the correct coaches are returned
            const resultIds = results.map((coach) => coach.id);
            expect(resultIds).toContain('coach-1');
            expect(resultIds).toContain('coach-2');
            expect(resultIds).toContain('coach-3');
            expect(resultIds).not.toContain('coach-4');

            // Verify each result has the search term in at least one field
            // Note: We need to trim the search term because the search engine trims it
            const trimmedSearchTerm = searchTerm.trim();
            results.forEach((coach) => {
              const nameMatch = coach.name.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const promptMatch = coach.systemPrompt.toLowerCase().includes(trimmedSearchTerm.toLowerCase());
              const creatorMatch = coach.creatorName.toLowerCase().includes(trimmedSearchTerm.toLowerCase());

              expect(nameMatch || promptMatch || creatorMatch).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.6: Empty query returns all coaches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          async (coaches) => {
            // Test with empty string
            const resultsEmpty = searchEngine.search(coaches, '');
            expect(resultsEmpty).toEqual(coaches);
            expect(resultsEmpty.length).toBe(coaches.length);

            // Test with whitespace only
            const resultsWhitespace = searchEngine.search(coaches, '   ');
            expect(resultsWhitespace).toEqual(coaches);
            expect(resultsWhitespace.length).toBe(coaches.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.7: Search with no matches returns empty array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          async (coaches) => {
            // Use a search term that is extremely unlikely to match
            const impossibleTerm = 'xyzabc123impossible987654321term';

            const results = searchEngine.search(coaches, impossibleTerm);

            // Verify no results are returned
            expect(results).toEqual([]);
            expect(results.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.8: Partial matches are found across all fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }).filter((s) => s.trim().length >= 3),
          async (fullTerm) => {
            // Take a substring as the search term
            const searchTerm = fullTerm.substring(0, Math.max(2, Math.floor(fullTerm.length / 2)));

            // Create coaches with the full term in different fields
            const coaches: PublicCoach[] = [
              {
                id: 'coach-1',
                name: `Coach ${fullTerm}`,
                icon: '🤖',
                systemPrompt: 'No match',
                creatorId: 'user-1',
                creatorName: 'No match',
                isPublic: true,
                category: CoachCategory.PRODUCTIVITY,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
              },
              {
                id: 'coach-2',
                name: 'No match',
                icon: '📚',
                systemPrompt: `I help with ${fullTerm}`,
                creatorId: 'user-2',
                creatorName: 'No match',
                isPublic: true,
                category: CoachCategory.LEARNING,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-02T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
              },
              {
                id: 'coach-3',
                name: 'No match',
                icon: '💪',
                systemPrompt: 'No match',
                creatorId: 'user-3',
                creatorName: fullTerm,
                isPublic: true,
                category: CoachCategory.HEALTH,
                isFeatured: false,
                sourceCoachId: null,
                createdAt: '2024-01-03T00:00:00Z',
                updatedAt: '2024-01-03T00:00:00Z',
              },
            ];

            // Perform search with partial term
            const results = searchEngine.search(coaches, searchTerm);

            // Verify all three coaches are found (partial match should work)
            expect(results.length).toBe(3);

            const resultIds = results.map((coach) => coach.id);
            expect(resultIds).toContain('coach-1');
            expect(resultIds).toContain('coach-2');
            expect(resultIds).toContain('coach-3');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.9: Search trims whitespace from query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
          async (coaches, searchTerm) => {
            // Create a coach with the search term
            const matchingCoach: PublicCoach = {
              ...coaches[0],
              id: 'matching-coach-id',
              name: `Test ${searchTerm} Coach`,
              systemPrompt: 'Different content',
              creatorName: 'Different creator',
            };

            const allCoaches = [...coaches, matchingCoach];

            // Search with whitespace around the term
            const resultsWithWhitespace = searchEngine.search(allCoaches, `  ${searchTerm}  `);
            const resultsWithoutWhitespace = searchEngine.search(allCoaches, searchTerm);

            // Verify both searches return the same results
            expect(resultsWithWhitespace.length).toBe(resultsWithoutWhitespace.length);

            // Verify the matching coach is found in both cases
            const foundWithWhitespace = resultsWithWhitespace.some((coach) => coach.id === matchingCoach.id);
            const foundWithoutWhitespace = resultsWithoutWhitespace.some((coach) => coach.id === matchingCoach.id);

            expect(foundWithWhitespace).toBe(true);
            expect(foundWithoutWhitespace).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 18.10: Search results are a subset of input coaches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(publicCoachArbitrary, { minLength: 1, maxLength: 20 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          async (coaches, searchTerm) => {
            const results = searchEngine.search(coaches, searchTerm);

            // Verify results length is <= input length
            expect(results.length).toBeLessThanOrEqual(coaches.length);

            // Verify every result is in the original input
            results.forEach((result) => {
              const foundInInput = coaches.some((coach) => coach.id === result.id);
              expect(foundInInput).toBe(true);
            });

            // Verify no duplicates in results
            const resultIds = results.map((coach) => coach.id);
            const uniqueIds = new Set(resultIds);
            expect(resultIds.length).toBe(uniqueIds.size);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
