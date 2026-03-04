/**
 * Coach Deep Link Generator
 * 
 * Handles generation of deep links for sharing coaches and opening native share dialogs.
 * 
 * Validates: Requirements 2.1, 2.3, 2.4
 */

import { Share } from 'react-native';

/**
 * Interface for generating coach deep links and sharing
 */
export interface DeepLinkGenerator {
  /**
   * Generate a deep link for installing a coach
   * @param coachId - The ID of the coach to share
   * @returns The deep link URL in format: northapp://coach/install/{coachId}
   */
  generateCoachLink(coachId: string): string;

  /**
   * Open the native share dialog with a coach deep link
   * @param link - The deep link to share
   * @returns Promise that resolves when share dialog is dismissed
   */
  openShareDialog(link: string): Promise<void>;
}

/**
 * Implementation of DeepLinkGenerator for coach sharing
 * 
 * Validates: Requirements 2.1, 2.3, 2.4
 */
export class CoachDeepLinkGenerator implements DeepLinkGenerator {
  /**
   * Generate a deep link for installing a coach
   * 
   * Format: northapp://coach/install/{coachId}
   * 
   * Validates: Requirements 2.1, 2.4
   * 
   * @param coachId - The ID of the coach to share
   * @returns The deep link URL
   */
  generateCoachLink(coachId: string): string {
    return `northapp://coach/install/${coachId}`;
  }

  /**
   * Open the native share dialog with a coach deep link
   * 
   * Uses React Native Share API to present native share options.
   * 
   * Validates: Requirements 2.3
   * 
   * @param link - The deep link to share
   * @returns Promise that resolves when share dialog is dismissed
   * @throws Error if share fails
   */
  async openShareDialog(link: string): Promise<void> {
    try {
      const result = await Share.share({
        message: `Check out this AI coach: ${link}`,
        url: link,
      });

      // Handle share result
      if (result.action === Share.sharedAction) {
        // Successfully shared
        if (result.activityType) {
          // Shared via specific activity (iOS)
          console.log('Shared via:', result.activityType);
        } else {
          // Shared (Android)
          console.log('Coach link shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Share dialog was dismissed
        console.log('Share dialog dismissed');
      }
    } catch (error) {
      console.error('Error sharing coach link:', error);
      throw new Error('Failed to open share dialog');
    }
  }
}

/**
 * Default instance of CoachDeepLinkGenerator
 */
export const coachDeepLinkGenerator = new CoachDeepLinkGenerator();
