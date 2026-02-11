/**
 * Coach Deep Link Handler Property-Based Tests
 * 
 * Property-based tests for coach deep link parsing and handling.
 * 
 * Feature: coach-marketplace-sharing
 * Validates: Requirements 3.1, 3.5
 */

import * as fc from 'fast-check';
import { CoachDeepLinkHandler } from '../coachDeepLinkHandler';
import { CoachDeepLinkGenerator } from '../coachDeepLinkGenerator';
import { router } from 'expo-router';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('Coach Deep Link Handler Properties', () => {
  let handler: CoachDeepLinkHandler;
  let generator: CoachDeepLinkGenerator;

  beforeEach(() => {
    handler = new CoachDeepLinkHandler();
    generator = new CoachDeepLinkGenerator();
    jest.clearAllMocks();
  });

  /**
   * Property 6: Deep link parsing round trip
   * 
   * **Validates: Requirements 3.1**
   * 
   * For any valid coach ID, generating a deep link and then parsing it
   * should return the same coach ID.
   */
  it('Property 6: Deep link parsing round trip', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          // Generate a deep link
          const link = generator.generateCoachLink(coachId);
          
          // Parse the coach ID back out
          const parsedId = handler.parseCoachId(link);
          
          // Should get the exact same coach ID back
          expect(parsedId).toBe(coachId);
          expect(parsedId).not.toBeNull();
          expect(parsedId?.length).toBe(coachId.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Invalid coach IDs are rejected
   * 
   * **Validates: Requirements 3.5**
   * 
   * For any malformed or non-existent coach ID in a deep link,
   * the system should display an error message and prevent installation.
   */
  it('Property 9: Invalid coach IDs are rejected', async () => {
    // Test various invalid URL formats
    const invalidUrls = fc.oneof(
      // Wrong scheme
      fc.constant('http://coach/install/abc123'),
      fc.constant('https://coach/install/abc123'),
      fc.constant('north://coach/install/abc123'),
      
      // Wrong path
      fc.constant('northapp://coach/share/abc123'),
      fc.constant('northapp://install/abc123'),
      fc.constant('northapp://coach/abc123'),
      
      // Missing coach ID
      fc.constant('northapp://coach/install/'),
      fc.constant('northapp://coach/install'),
      
      // Empty or malformed
      fc.constant(''),
      fc.constant('northapp://'),
      fc.constant('invalid-url'),
      
      // Special characters that should be rejected (in the coach ID itself, not after)
      // These have special chars as part of the ID, not as query params or fragments
      fc.constant('northapp://coach/install/!abc'),
      fc.constant('northapp://coach/install/@abc'),
      fc.constant('northapp://coach/install/$abc'),
      fc.constant('northapp://coach/install/%abc'),
      fc.constant('northapp://coach/install/^abc'),
      fc.constant('northapp://coach/install/&abc'),
      fc.constant('northapp://coach/install/*abc'),
      fc.constant('northapp://coach/install/(abc'),
      fc.constant('northapp://coach/install/)abc'),
      fc.constant('northapp://coach/install/+abc'),
      fc.constant('northapp://coach/install/=abc'),
      fc.constant('northapp://coach/install/[abc'),
      fc.constant('northapp://coach/install/]abc'),
      fc.constant('northapp://coach/install/{abc'),
      fc.constant('northapp://coach/install/}abc'),
      fc.constant('northapp://coach/install/|abc'),
      fc.constant('northapp://coach/install/\\abc'),
      fc.constant('northapp://coach/install/:abc'),
      fc.constant('northapp://coach/install/;abc'),
      fc.constant('northapp://coach/install/"abc'),
      fc.constant('northapp://coach/install/\'abc'),
      fc.constant('northapp://coach/install/<abc'),
      fc.constant('northapp://coach/install/>abc'),
      fc.constant('northapp://coach/install/,abc'),
      fc.constant('northapp://coach/install/.abc'),
      fc.constant('northapp://coach/install/ abc'), // space
      fc.constant('northapp://coach/install/abc def'), // space in middle
      fc.constant('northapp://coach/install/abc/def') // slash in middle
    );

    await fc.assert(
      fc.asyncProperty(
        invalidUrls,
        async (invalidUrl) => {
          // Parsing should return null
          const parsedId = handler.parseCoachId(invalidUrl);
          expect(parsedId).toBeNull();
          
          // Handling should throw an error
          await expect(handler.handleDeepLink(invalidUrl)).rejects.toThrow(
            'Invalid coach link: Unable to parse coach ID'
          );
          
          // Should not attempt navigation
          expect(router.push).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 } // Fewer runs for async tests
    );
  });

  /**
   * Property: Valid coach IDs are accepted
   * 
   * For any valid coach ID format (alphanumeric, hyphens, underscores),
   * the parser should successfully extract the coach ID.
   */
  it('Property: Valid coach IDs are accepted', () => {
    // Generate valid coach IDs with allowed characters
    const validCoachIdArbitrary = fc.stringMatching(/^[a-zA-Z0-9-_]{1,50}$/);

    fc.assert(
      fc.property(
        validCoachIdArbitrary,
        (coachId) => {
          const url = `northapp://coach/install/${coachId}`;
          const parsedId = handler.parseCoachId(url);
          
          expect(parsedId).toBe(coachId);
          expect(parsedId).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Round trip preserves coach ID exactly
   * 
   * For any valid coach ID, the round trip (generate → parse) should
   * preserve the coach ID without any modification, encoding, or truncation.
   */
  it('Property: Round trip preserves coach ID exactly', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (originalId) => {
          const link = generator.generateCoachLink(originalId);
          const parsedId = handler.parseCoachId(link);
          
          // Exact match
          expect(parsedId).toBe(originalId);
          
          // Same length
          expect(parsedId?.length).toBe(originalId.length);
          
          // Character-by-character match
          if (parsedId) {
            for (let i = 0; i < originalId.length; i++) {
              expect(parsedId[i]).toBe(originalId[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Parsing is deterministic
   * 
   * For any URL, parsing it multiple times should always return the same result.
   */
  it('Property: Parsing is deterministic', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const url = `northapp://coach/install/${coachId}`;
          
          const result1 = handler.parseCoachId(url);
          const result2 = handler.parseCoachId(url);
          const result3 = handler.parseCoachId(url);
          
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Case sensitivity is preserved
   * 
   * For any coach ID with mixed case, the parser should preserve
   * the exact case of the coach ID.
   */
  it('Property: Case sensitivity is preserved', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9-_]{10,20}$/),
        (coachId) => {
          const url = `northapp://coach/install/${coachId}`;
          const parsedId = handler.parseCoachId(url);
          
          expect(parsedId).toBe(coachId);
          
          // Verify case is preserved
          if (parsedId) {
            expect(parsedId).toEqual(coachId);
            expect(parsedId.toLowerCase()).toBe(coachId.toLowerCase());
            expect(parsedId.toUpperCase()).toBe(coachId.toUpperCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Query parameters don't affect parsing
   * 
   * For any valid deep link with query parameters, the parser should
   * still extract the correct coach ID.
   */
  it('Property: Query parameters are handled correctly', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string(),
        (coachId, queryParam) => {
          const url = `northapp://coach/install/${coachId}?param=${queryParam}`;
          const parsedId = handler.parseCoachId(url);
          
          // Should still parse the coach ID correctly
          expect(parsedId).toBe(coachId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Fragment identifiers don't affect parsing
   * 
   * For any valid deep link with fragment identifiers, the parser should
   * still extract the correct coach ID.
   */
  it('Property: Fragment identifiers are handled correctly', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string(),
        (coachId, fragment) => {
          const url = `northapp://coach/install/${coachId}#${fragment}`;
          const parsedId = handler.parseCoachId(url);
          
          // Should still parse the coach ID correctly
          expect(parsedId).toBe(coachId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different coach IDs parse to different results
   * 
   * For any two different coach IDs, parsing their deep links should
   * return different results.
   */
  it('Property: Different coach IDs parse to different results', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (coachId1, coachId2) => {
          fc.pre(coachId1 !== coachId2); // Only test when IDs are different
          
          const url1 = `northapp://coach/install/${coachId1}`;
          const url2 = `northapp://coach/install/${coachId2}`;
          
          const parsedId1 = handler.parseCoachId(url1);
          const parsedId2 = handler.parseCoachId(url2);
          
          expect(parsedId1).not.toBe(parsedId2);
          expect(parsedId1).toBe(coachId1);
          expect(parsedId2).toBe(coachId2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Null and undefined inputs are handled safely
   * 
   * For any null or undefined input, the parser should return null
   * without throwing an error.
   */
  it('Property: Null and undefined inputs are handled safely', () => {
    expect(handler.parseCoachId(null as any)).toBeNull();
    expect(handler.parseCoachId(undefined as any)).toBeNull();
    expect(() => handler.parseCoachId(null as any)).not.toThrow();
    expect(() => handler.parseCoachId(undefined as any)).not.toThrow();
  });

  /**
   * Property: Non-string inputs are handled safely
   * 
   * For any non-string input, the parser should return null
   * without throwing an error.
   */
  it('Property: Non-string inputs are handled safely', () => {
    const nonStringInputs = [
      123,
      true,
      false,
      {},
      [],
      () => {},
    ];

    nonStringInputs.forEach(input => {
      expect(handler.parseCoachId(input as any)).toBeNull();
      expect(() => handler.parseCoachId(input as any)).not.toThrow();
    });
  });
});
