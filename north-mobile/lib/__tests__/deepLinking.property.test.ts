/**
 * Deep Linking Property-Based Tests
 * 
 * Property-based tests for deep link parsing and creation.
 */

import * as fc from 'fast-check';
import { parseDeepLink, createDeepLink } from '../deepLinking';

describe('Deep Linking Properties', () => {
  /**
   * Property 67: Valid Deep Link Parsing
   * 
   * **Validates: Requirements 26.1**
   * 
   * For any valid deep link URL (chat, context, settings),
   * parsing should return a valid route object with correct screen and params.
   */
  it('Property 67: Valid deep links should parse to valid routes', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Chat links with coach IDs
          fc.record({
            type: fc.constant('chat'),
            coachId: fc.uuid(),
          }),
          // Context links
          fc.record({
            type: fc.constant('context'),
          }),
          // Settings links
          fc.record({
            type: fc.constant('settings'),
          })
        ),
        (linkData) => {
          let url: string;
          
          if (linkData.type === 'chat' && 'coachId' in linkData) {
            url = `north://chat/${linkData.coachId}`;
          } else {
            url = `north://${linkData.type}`;
          }
          
          const result = parseDeepLink(url);
          
          // Should return a valid route
          expect(result).not.toBeNull();
          expect(result).toHaveProperty('screen');
          expect(result).toHaveProperty('params');
          
          // Verify correct screen mapping
          if (linkData.type === 'chat') {
            expect(result?.screen).toBe('chat/[coachId]');
            expect(result?.params?.coachId).toBe(linkData.coachId);
          } else if (linkData.type === 'context') {
            expect(result?.screen).toBe('(tabs)/context');
          } else if (linkData.type === 'settings') {
            expect(result?.screen).toBe('(tabs)/settings');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 68: Invalid Deep Link Handling
   * 
   * **Validates: Requirements 26.3**
   * 
   * For any invalid deep link URL (unknown scheme, malformed, etc.),
   * parsing should return null gracefully without throwing errors.
   */
  it('Property 68: Invalid deep links should return null gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Invalid schemes
          fc.string().map(s => `invalid://${s}`),
          // Malformed URLs
          fc.string().filter(s => !s.includes('://')),
          // Unknown paths
          fc.string().map(s => `north://${s}`).filter(s => 
            !s.includes('chat/') && 
            !s.includes('context') && 
            !s.includes('settings')
          ),
          // Empty strings
          fc.constant(''),
          // Just scheme
          fc.constant('north://'),
        ),
        (invalidUrl) => {
          // Should not throw
          expect(() => parseDeepLink(invalidUrl)).not.toThrow();
          
          // Should return null for invalid URLs
          const result = parseDeepLink(invalidUrl);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 69: Deep Link Round-Trip Consistency
   * 
   * **Validates: Requirements 26.1**
   * 
   * For any valid screen and params, creating a deep link and then parsing it
   * should return the original screen and params.
   */
  it('Property 69: Creating and parsing deep links should be consistent', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Chat with coach ID
          fc.record({
            screen: fc.constant('chat'),
            params: fc.record({ coachId: fc.uuid() }),
          }),
          // Context
          fc.record({
            screen: fc.constant('context'),
            params: fc.constant(undefined),
          }),
          // Settings
          fc.record({
            screen: fc.constant('settings'),
            params: fc.constant(undefined),
          })
        ),
        (linkData) => {
          const url = createDeepLink(linkData.screen, linkData.params);
          const parsed = parseDeepLink(url);
          
          expect(parsed).not.toBeNull();
          
          if (linkData.screen === 'chat' && linkData.params) {
            expect(parsed?.screen).toBe('chat/[coachId]');
            expect(parsed?.params?.coachId).toBe(linkData.params.coachId);
          } else if (linkData.screen === 'context') {
            expect(parsed?.screen).toBe('(tabs)/context');
          } else if (linkData.screen === 'settings') {
            expect(parsed?.screen).toBe('(tabs)/settings');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 70: Deep Link URL Format Consistency
   * 
   * **Validates: Requirements 26.1**
   * 
   * All created deep links should start with the correct scheme (north://)
   * and follow the expected format.
   */
  it('Property 70: Created deep links should have consistent format', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('chat'),
          fc.constant('context'),
          fc.constant('settings'),
          fc.string() // Unknown screens
        ),
        fc.option(fc.record({ coachId: fc.uuid() }), { nil: undefined }),
        (screen, params) => {
          const url = createDeepLink(screen, params as any);
          
          // Should always start with north://
          expect(url).toMatch(/^north:\/\//);
          
          // Should not have double slashes except after scheme
          const afterScheme = url.replace('north://', '');
          if (afterScheme.length > 0) {
            expect(afterScheme).not.toMatch(/\/\//);
          }
          
          // Should not end with slash (unless it's just the scheme)
          if (url !== 'north://') {
            expect(url).not.toMatch(/\/$/);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 71: Coach ID Preservation
   * 
   * **Validates: Requirements 26.1**
   * 
   * For any valid UUID coach ID, creating a chat deep link and parsing it
   * should preserve the exact coach ID without modification.
   */
  it('Property 71: Coach IDs should be preserved exactly in deep links', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          const url = createDeepLink('chat', { coachId });
          const parsed = parseDeepLink(url);
          
          expect(parsed).not.toBeNull();
          expect(parsed?.params?.coachId).toBe(coachId);
          
          // Should preserve exact format (no encoding/decoding issues)
          expect(parsed?.params?.coachId).toHaveLength(36); // UUID length
          expect(parsed?.params?.coachId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );
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
   * For any malformed or non-existent coach ID in a deep link, the system
   * should reject the link by returning null from parseDeepLink.
   * This prevents navigation to invalid coach preview screens.
   * 
   * Feature: coach-marketplace-sharing
   */
  it('Property 9: Invalid coach IDs in installation links are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Empty coach ID
          fc.constant('northapp://coach/install/'),
          // Coach ID with only special characters (no valid alphanumeric)
          fc.string()
            .filter(s => s.length > 0 && !/[a-zA-Z0-9-_]/.test(s))
            .map(s => `northapp://coach/install/${s}`),
          // Coach ID with spaces
          fc.constant('northapp://coach/install/coach 123'),
          // Coach ID with slashes (would be interpreted as additional path segments)
          fc.constant('northapp://coach/install/coach/123'),
          // Malformed URL structure
          fc.constant('northapp://coach/install'),
          fc.constant('northapp://coach/'),
          fc.constant('northapp://coach'),
          // Wrong scheme
          fc.uuid().map(id => `north://coach/install/${id}`),
          // Wrong path
          fc.uuid().map(id => `northapp://coach/share/${id}`),
          fc.uuid().map(id => `northapp://install/${id}`),
        ),
        (invalidUrl) => {
          // Should not throw
          expect(() => parseDeepLink(invalidUrl)).not.toThrow();
          
          // Should return null for invalid coach installation links
          const result = parseDeepLink(invalidUrl);
          expect(result).toBeNull();
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
   * For any valid coach ID, generating a coach installation deep link
   * and then parsing it should return the same coach ID.
   * 
   * Feature: coach-marketplace-sharing
   */
  it('Property 6: Coach installation deep link round trip preserves coach ID', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (coachId) => {
          // Create coach installation deep link
          const url = createDeepLink('coach/install', { coachId });
          
          // Parse the deep link
          const parsed = parseDeepLink(url);
          
          // Should successfully parse
          expect(parsed).not.toBeNull();
          expect(parsed?.screen).toBe('/coach/profile');
          expect(parsed?.params?.coachId).toBe(coachId);
          
          // Coach ID should be preserved exactly
          expect(parsed?.params?.coachId).toHaveLength(36); // UUID length
        }
      ),
      { numRuns: 100 }
    );
  });
});
