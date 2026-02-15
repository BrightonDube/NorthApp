/**
 * Coach Deep Link Handler
 * 
 * Handles processing of incoming coach installation deep links.
 * Parses coach IDs from URLs and routes to appropriate screens.
 * 
 * Validates: Requirements 3.1, 3.2
 */

import { router } from 'expo-router';

/**
 * Interface for handling coach deep links
 */
export interface DeepLinkHandler {
  /**
   * Handle an incoming coach deep link
   * @param url - The deep link URL to process
   * @returns Promise that resolves when handling is complete
   * @throws Error if the URL is invalid or coach ID cannot be parsed
   */
  handleDeepLink(url: string): Promise<void>;

  /**
   * Parse a coach ID from a deep link URL
   * @param url - The deep link URL to parse
   * @returns The coach ID if valid, null otherwise
   */
  parseCoachId(url: string): string | null;
}

/**
 * Implementation of DeepLinkHandler for coach installation links
 * 
 * Handles deep links in the format: northapp://coach/install/{coachId}
 * 
 * Validates: Requirements 3.1, 3.2
 */
export class CoachDeepLinkHandler implements DeepLinkHandler {
  /**
   * Parse a coach ID from a deep link URL
   * 
   * Extracts the coach ID from URLs matching the pattern:
   * northapp://coach/install/{coachId}
   * 
   * Validates: Requirements 3.1
   * 
   * @param url - The deep link URL to parse
   * @returns The coach ID if valid, null otherwise
   */
  parseCoachId(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Match the pattern: northapp://coach/install/{coachId}
    // Coach IDs can contain alphanumeric characters, hyphens, and underscores
    // The regex ensures we match the entire coach ID segment (up to end of string or query params)
    const match = url.match(/northapp:\/\/coach\/install\/([a-zA-Z0-9-_]+)(?:[?#]|$)/);
    
    return match ? match[1] : null;
  }

  /**
   * Handle an incoming coach deep link
   * 
   * Parses the coach ID from the URL and navigates to the coach preview screen.
   * If the URL is invalid or coach ID cannot be parsed, throws an error.
   * 
   * Validates: Requirements 3.1, 3.2
   * 
   * @param url - The deep link URL to process
   * @returns Promise that resolves when navigation is complete
   * @throws Error if the URL is invalid or coach ID cannot be parsed
   */
  async handleDeepLink(url: string): Promise<void> {
    const coachId = this.parseCoachId(url);
    
    if (!coachId) {
      throw new Error('Invalid coach link: Unable to parse coach ID');
    }

    try {
      // Navigate to the coach profile screen with the coach ID
      router.push({
        pathname: '/coach/profile' as any,
        params: { coachId },
      });
    } catch (error) {
      console.error('Error navigating to coach profile:', error);
      throw new Error('Failed to navigate to coach profile');
    }
  }
}

/**
 * Default instance of CoachDeepLinkHandler
 */
export const coachDeepLinkHandler = new CoachDeepLinkHandler();
