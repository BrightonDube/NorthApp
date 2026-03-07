/**
 * Coach Deep Link Generator Unit Tests
 * 
 * Tests the CoachDeepLinkGenerator class for generating deep links
 * and opening share dialogs.
 * 
 * Validates: Requirements 2.1, 2.3, 2.4
 */

import { Share } from 'react-native';
import { CoachDeepLinkGenerator } from '../coachDeepLinkGenerator';

// Mock React Native Share
jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
    dismissedAction: 'dismissedAction',
  },
}));

describe('CoachDeepLinkGenerator', () => {
  let generator: CoachDeepLinkGenerator;

  beforeEach(() => {
    generator = new CoachDeepLinkGenerator();
    jest.clearAllMocks();
  });

  describe('generateCoachLink', () => {
    it('should generate deep link with correct format', () => {
      const coachId = 'test-coach-123';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toBe('northapp://coach/install/test-coach-123');
    });

    it('should generate deep link with UUID coach ID', () => {
      const coachId = '550e8400-e29b-41d4-a716-446655440000';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toBe('northapp://coach/install/550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle coach IDs with special characters', () => {
      const coachId = 'coach-with-dashes-123';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toBe('northapp://coach/install/coach-with-dashes-123');
    });

    it('should preserve exact coach ID in link', () => {
      const coachId = 'AbC123-XyZ';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toContain(coachId);
      expect(link).toBe(`northapp://coach/install/${coachId}`);
    });

    it('should always start with northapp:// scheme', () => {
      const coachId = 'any-coach-id';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toMatch(/^northapp:\/\//);
    });

    it('should always include /coach/install/ path', () => {
      const coachId = 'any-coach-id';
      const link = generator.generateCoachLink(coachId);
      
      expect(link).toContain('/coach/install/');
    });
  });

  describe('openShareDialog', () => {
    it('should call Share.share with correct options', async () => {
      const link = 'northapp://coach/install/test-coach';
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await generator.openShareDialog(link);

      expect(Share.share).toHaveBeenCalledWith({
        message: `Check out this AI coach: ${link}`,
        url: link,
      });
    });

    it('should handle successful share', async () => {
      const link = 'northapp://coach/install/test-coach';
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      await expect(generator.openShareDialog(link)).resolves.not.toThrow();
    });

    it('should handle share with activity type (iOS)', async () => {
      const link = 'northapp://coach/install/test-coach';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
        activityType: 'com.apple.UIKit.activity.Message',
      });

      await generator.openShareDialog(link);

      expect(consoleSpy).toHaveBeenCalledWith('Shared via:', 'com.apple.UIKit.activity.Message');
      consoleSpy.mockRestore();
    });

    it('should handle dismissed share dialog', async () => {
      const link = 'northapp://coach/install/test-coach';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.dismissedAction,
      });

      await generator.openShareDialog(link);

      expect(consoleSpy).toHaveBeenCalledWith('Share dialog dismissed');
      consoleSpy.mockRestore();
    });

    it('should throw error when share fails', async () => {
      const link = 'northapp://coach/install/test-coach';
      const error = new Error('Share failed');
      (Share.share as jest.Mock).mockRejectedValue(error);

      await expect(generator.openShareDialog(link)).rejects.toThrow('Failed to open share dialog');
    });

    it('should log error when share fails', async () => {
      const link = 'northapp://coach/install/test-coach';
      const error = new Error('Share failed');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (Share.share as jest.Mock).mockRejectedValue(error);

      try {
        await generator.openShareDialog(link);
      } catch (e) {
        // Expected to throw
      }

      expect(consoleSpy).toHaveBeenCalledWith('Error sharing coach link:', error);
      consoleSpy.mockRestore();
    });

    it('should handle share with different link formats', async () => {
      const links = [
        'northapp://coach/install/coach-1',
        'northapp://coach/install/550e8400-e29b-41d4-a716-446655440000',
        'northapp://coach/install/my-awesome-coach',
      ];

      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      for (const link of links) {
        await generator.openShareDialog(link);
        
        expect(Share.share).toHaveBeenCalledWith({
          message: `Check out this AI coach: ${link}`,
          url: link,
        });
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should generate link and share it', async () => {
      const coachId = 'test-coach-456';
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      const link = generator.generateCoachLink(coachId);
      await generator.openShareDialog(link);

      expect(link).toBe('northapp://coach/install/test-coach-456');
      expect(Share.share).toHaveBeenCalledWith({
        message: `Check out this AI coach: ${link}`,
        url: link,
      });
    });

    it('should handle multiple share operations', async () => {
      const coachIds = ['coach-1', 'coach-2', 'coach-3'];
      (Share.share as jest.Mock).mockResolvedValue({
        action: Share.sharedAction,
      });

      for (const coachId of coachIds) {
        const link = generator.generateCoachLink(coachId);
        await generator.openShareDialog(link);
      }

      expect(Share.share).toHaveBeenCalledTimes(3);
    });
  });
});
