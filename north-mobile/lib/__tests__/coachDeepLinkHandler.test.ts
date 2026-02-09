/**
 * Unit Tests for CoachDeepLinkHandler
 * 
 * These tests verify the functionality of the CoachDeepLinkHandler service,
 * including deep link parsing and navigation handling.
 * 
 * Validates: Requirements 3.1, 3.2
 */

import { CoachDeepLinkHandler } from '../coachDeepLinkHandler';
import { router } from 'expo-router';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

describe('CoachDeepLinkHandler', () => {
  let handler: CoachDeepLinkHandler;

  beforeEach(() => {
    handler = new CoachDeepLinkHandler();
    jest.clearAllMocks();
  });

  describe('parseCoachId', () => {
    it('should parse valid coach ID from deep link', () => {
      const url = 'northapp://coach/install/abc123';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBe('abc123');
    });

    it('should parse coach ID with hyphens', () => {
      const url = 'northapp://coach/install/coach-123-abc';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBe('coach-123-abc');
    });

    it('should parse coach ID with underscores', () => {
      const url = 'northapp://coach/install/coach_123_abc';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBe('coach_123_abc');
    });

    it('should parse UUID format coach ID', () => {
      const url = 'northapp://coach/install/550e8400-e29b-41d4-a716-446655440000';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return null for invalid URL format', () => {
      const url = 'invalid://url';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBeNull();
    });

    it('should return null for URL without coach ID', () => {
      const url = 'northapp://coach/install/';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBeNull();
    });

    it('should return null for empty string', () => {
      const coachId = handler.parseCoachId('');
      expect(coachId).toBeNull();
    });

    it('should return null for null input', () => {
      const coachId = handler.parseCoachId(null as any);
      expect(coachId).toBeNull();
    });

    it('should return null for undefined input', () => {
      const coachId = handler.parseCoachId(undefined as any);
      expect(coachId).toBeNull();
    });

    it('should return null for wrong scheme', () => {
      const url = 'north://coach/install/abc123';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBeNull();
    });

    it('should return null for wrong path', () => {
      const url = 'northapp://coach/share/abc123';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBeNull();
    });

    it('should not parse coach IDs with special characters', () => {
      const url = 'northapp://coach/install/abc@123';
      const coachId = handler.parseCoachId(url);
      expect(coachId).toBeNull();
    });
  });

  describe('handleDeepLink', () => {
    it('should navigate to coach preview with valid coach ID', async () => {
      const url = 'northapp://coach/install/abc123';
      
      await handler.handleDeepLink(url);
      
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/coach/preview/[coachId]',
        params: { coachId: 'abc123' },
      });
    });

    it('should navigate with UUID coach ID', async () => {
      const coachId = '550e8400-e29b-41d4-a716-446655440000';
      const url = `northapp://coach/install/${coachId}`;
      
      await handler.handleDeepLink(url);
      
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/coach/preview/[coachId]',
        params: { coachId },
      });
    });

    it('should throw error for invalid URL', async () => {
      const url = 'invalid://url';
      
      await expect(handler.handleDeepLink(url)).rejects.toThrow(
        'Invalid coach link: Unable to parse coach ID'
      );
      
      expect(router.push).not.toHaveBeenCalled();
    });

    it('should throw error for URL without coach ID', async () => {
      const url = 'northapp://coach/install/';
      
      await expect(handler.handleDeepLink(url)).rejects.toThrow(
        'Invalid coach link: Unable to parse coach ID'
      );
      
      expect(router.push).not.toHaveBeenCalled();
    });

    it('should throw error for empty string', async () => {
      await expect(handler.handleDeepLink('')).rejects.toThrow(
        'Invalid coach link: Unable to parse coach ID'
      );
      
      expect(router.push).not.toHaveBeenCalled();
    });

    it('should handle navigation errors gracefully', async () => {
      const url = 'northapp://coach/install/abc123';
      const mockError = new Error('Navigation failed');
      
      (router.push as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      
      await expect(handler.handleDeepLink(url)).rejects.toThrow(
        'Failed to navigate to coach preview'
      );
    });

    it('should log navigation errors', async () => {
      const url = 'northapp://coach/install/abc123';
      const mockError = new Error('Navigation failed');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (router.push as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      
      await expect(handler.handleDeepLink(url)).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error navigating to coach preview:',
        mockError
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('integration with parseCoachId', () => {
    it('should use parseCoachId internally', async () => {
      const url = 'northapp://coach/install/test-coach-id';
      const parseCoachIdSpy = jest.spyOn(handler, 'parseCoachId');
      
      await handler.handleDeepLink(url);
      
      expect(parseCoachIdSpy).toHaveBeenCalledWith(url);
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/coach/preview/[coachId]',
        params: { coachId: 'test-coach-id' },
      });
    });
  });
});
