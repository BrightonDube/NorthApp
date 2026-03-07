/**
 * Coach Deep Link Generator Property-Based Tests
 * 
 * Property-based tests for coach deep link generation and sharing.
 * 
 * Feature: coach-marketplace-sharing
 * Validates: Requirements 2.1, 2.4, 3.1
 */

import * as fc from 'fast-check';
import { CoachDeepLinkGenerator } from '../coachDeepLinkGenerator';
import { Share } from 'react-native';

// Mock React Native Share
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
}));

describe('Coach Deep Link Generator Properties', () => {
  let generator: CoachDeepLinkGenerator;

  beforeEach(() => {
    generator = new CoachDeepLinkGenerator();
    jest.clearAllMocks();
  });

  /**
   * Property 3: Deep link format is correct
   * 
   * **Validates: Requirements 2.1, 2.4**
   * 
   * For any coach ID, the generated deep link should match the pattern
   * `northapp://coach/install/{coach_id}` and contain the exact coach identifier.
   */
  it('Property 3: Deep link format is correct', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          // Should match the exact pattern
          const expectedPattern = `northapp://coach/install/${coachId}`;
          expect(link).toBe(expectedPattern);
          
          // Should start with correct scheme
          expect(link).toMatch(/^northapp:\/\//);
          
          // Should contain the coach/install path
          expect(link).toContain('/coach/install/');
          
          // Should end with the coach ID
          expect(link.endsWith(coachId)).toBe(true);
          
          // Should not have double slashes except after scheme
          const afterScheme = link.replace('northapp://', '');
          expect(afterScheme).not.toMatch(/\/\//);
          
          // Should not end with a slash
          expect(link).not.toMatch(/\/$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Deep link parsing round trip
   * 
   * **Validates: Requirements 3.1**
   * 
   * For any valid coach ID, generating a deep link and then parsing it
   * should return the same coach ID.
   * 
   * Note: This test validates the generation side. The parsing will be
   * tested in the CoachDeepLinkHandler tests.
   */
  it('Property 6: Deep link parsing round trip (generation side)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          // Extract coach ID from the generated link
          const match = link.match(/northapp:\/\/coach\/install\/([^/]+)$/);
          expect(match).not.toBeNull();
          
          const extractedId = match?.[1];
          expect(extractedId).toBe(coachId);
          
          // Verify the coach ID is preserved exactly
          expect(extractedId).toHaveLength(36); // UUID length
          expect(extractedId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Deep link consistency
   * 
   * For any coach ID, generating the deep link multiple times should
   * always produce the same result (deterministic).
   */
  it('Property: Deep link generation is deterministic', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link1 = generator.generateCoachLink(coachId);
          const link2 = generator.generateCoachLink(coachId);
          const link3 = generator.generateCoachLink(coachId);
          
          expect(link1).toBe(link2);
          expect(link2).toBe(link3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Coach ID preservation
   * 
   * For any valid coach ID, the generated deep link should preserve
   * the exact coach ID without any encoding or modification.
   */
  it('Property: Coach ID is preserved exactly in deep links', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          // Should contain the exact coach ID
          expect(link).toContain(coachId);
          
          // Extract and verify
          const parts = link.split('/');
          const extractedId = parts[parts.length - 1];
          
          expect(extractedId).toBe(coachId);
          expect(extractedId.length).toBe(coachId.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Share dialog is called with correct parameters
   * 
   * For any deep link, opening the share dialog should call Share.share
   * with the link in both message and url fields.
   */
  it('Property: Share dialog receives correct parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          (Share.share as jest.Mock).mockResolvedValue({
            action: Share.sharedAction,
          });
          
          await generator.openShareDialog(link);
          
          expect(Share.share).toHaveBeenCalledWith({
            message: `Check out this AI coach: ${link}`,
            url: link,
          });
          
          // Verify the link in the message matches the url
          const callArgs = (Share.share as jest.Mock).mock.calls[0][0];
          expect(callArgs.message).toContain(callArgs.url);
          
          // Clear mock for next iteration
          (Share.share as jest.Mock).mockClear();
        }
      ),
      { numRuns: 50 } // Fewer runs for async tests
    );
  });

  /**
   * Property: Deep link format components
   * 
   * For any coach ID, the generated deep link should have exactly 4 components
   * when split by '/': scheme, empty, 'coach', 'install', and coach_id.
   */
  it('Property: Deep link has correct structure', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          // Split by '://' to separate scheme
          const [scheme, rest] = link.split('://');
          expect(scheme).toBe('northapp');
          
          // Split the rest by '/'
          const parts = rest.split('/');
          expect(parts).toHaveLength(3); // ['coach', 'install', coachId]
          expect(parts[0]).toBe('coach');
          expect(parts[1]).toBe('install');
          expect(parts[2]).toBe(coachId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Different coach IDs produce different links
   * 
   * For any two different coach IDs, the generated deep links should be different.
   */
  it('Property: Different coach IDs produce different links', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (coachId1, coachId2) => {
          fc.pre(coachId1 !== coachId2); // Only test when IDs are different
          
          const link1 = generator.generateCoachLink(coachId1);
          const link2 = generator.generateCoachLink(coachId2);
          
          expect(link1).not.toBe(link2);
          
          // But they should have the same prefix
          const prefix = 'northapp://coach/install/';
          expect(link1.startsWith(prefix)).toBe(true);
          expect(link2.startsWith(prefix)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Link length is consistent
   * 
   * For any UUID coach ID (36 characters), the generated deep link
   * should have a consistent length.
   */
  it('Property: Deep link length is consistent for UUIDs', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const link = generator.generateCoachLink(coachId);
          
          // northapp://coach/install/ = 25 characters (not 27)
          // UUID = 36 characters
          // Total = 61 characters
          const expectedLength = 25 + 36;
          expect(link.length).toBe(expectedLength);
        }
      ),
      { numRuns: 100 }
    );
  });
});
