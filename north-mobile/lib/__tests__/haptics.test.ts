/**
 * Unit tests for HapticService
 * 
 * Tests haptic feedback functionality including:
 * - Haptic triggering for all types
 * - Availability checking
 * - User preference checking
 * - Error handling
 * - Platform-specific behavior
 * 
 * Requirements tested:
 * - 10.1: Define haptic feedback patterns for different interaction types
 * - 10.2: Trigger medium-impact haptic for significant actions
 * - 10.3: Trigger light-impact haptic for selections
 * - 10.4: Trigger notification-style haptic for errors
 * - 10.5: Limit haptic feedback to meaningful interactions only
 * - 10.6: Trigger selection-style haptic for toggles
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { HapticService, HapticType, HapticGuidelines } from '../haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

describe('HapticService', () => {
  // Store original Platform.OS
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset enabled state
    HapticService.setEnabled(true);
    
    // Reset Platform.OS to iOS (default for tests)
    Object.defineProperty(Platform, 'OS', {
      get: () => 'ios',
      configurable: true,
    });
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
    
    // Restore original Platform.OS
    Object.defineProperty(Platform, 'OS', {
      get: () => originalPlatform,
      configurable: true,
    });
  });

  describe('trigger', () => {
    describe('light impact haptic', () => {
      it('should trigger light impact haptic for selections', async () => {
        await HapticService.trigger(HapticType.Light);

        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Light
        );
        expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
      });

      it('should use light haptic for button press guideline', async () => {
        await HapticService.trigger(HapticGuidelines.buttonPress);

        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Light
        );
      });
    });

    describe('medium impact haptic', () => {
      it('should trigger medium impact haptic for significant actions', async () => {
        await HapticService.trigger(HapticType.Medium);

        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Medium
        );
        expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
      });

      it('should use medium haptic for action complete guideline', async () => {
        await HapticService.trigger(HapticGuidelines.actionComplete);

        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Medium
        );
      });
    });

    describe('heavy impact haptic', () => {
      it('should trigger heavy impact haptic', async () => {
        await HapticService.trigger(HapticType.Heavy);

        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Heavy
        );
        expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
      });
    });

    describe('success notification haptic', () => {
      it('should trigger success notification haptic', async () => {
        await HapticService.trigger(HapticType.Success);

        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
        expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      });

      it('should use success haptic for success feedback guideline', async () => {
        await HapticService.trigger(HapticGuidelines.successFeedback);

        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Success
        );
      });
    });

    describe('warning notification haptic', () => {
      it('should trigger warning notification haptic', async () => {
        await HapticService.trigger(HapticType.Warning);

        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Warning
        );
        expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      });
    });

    describe('error notification haptic', () => {
      it('should trigger error notification haptic', async () => {
        await HapticService.trigger(HapticType.Error);

        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Error
        );
        expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
      });

      it('should use error haptic for error feedback guideline', async () => {
        await HapticService.trigger(HapticGuidelines.errorFeedback);

        expect(Haptics.notificationAsync).toHaveBeenCalledWith(
          Haptics.NotificationFeedbackType.Error
        );
      });
    });

    describe('selection haptic', () => {
      it('should trigger selection haptic for toggles', async () => {
        await HapticService.trigger(HapticType.Selection);

        expect(Haptics.selectionAsync).toHaveBeenCalled();
        expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      });

      it('should use selection haptic for toggle switch guideline', async () => {
        await HapticService.trigger(HapticGuidelines.toggleSwitch);

        expect(Haptics.selectionAsync).toHaveBeenCalled();
      });

      it('should use selection haptic for slider change guideline', async () => {
        await HapticService.trigger(HapticGuidelines.sliderChange);

        expect(Haptics.selectionAsync).toHaveBeenCalled();
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true on iOS', () => {
      // Mock Platform.OS
      Object.defineProperty(Platform, 'OS', {
        get: () => 'ios',
        configurable: true,
      });

      expect(HapticService.isAvailable()).toBe(true);
    });

    it('should return true on Android', () => {
      // Mock Platform.OS
      Object.defineProperty(Platform, 'OS', {
        get: () => 'android',
        configurable: true,
      });

      expect(HapticService.isAvailable()).toBe(true);
    });

    it('should return false on web', () => {
      // Mock Platform.OS
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      expect(HapticService.isAvailable()).toBe(false);
    });

    it('should not trigger haptic when unavailable', async () => {
      // Mock Platform.OS to web
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      await HapticService.trigger(HapticType.Light);

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });

  describe('isEnabled and setEnabled', () => {
    it('should return true by default', () => {
      expect(HapticService.isEnabled()).toBe(true);
    });

    it('should allow enabling haptics', () => {
      HapticService.setEnabled(true);
      expect(HapticService.isEnabled()).toBe(true);
    });

    it('should allow disabling haptics', () => {
      HapticService.setEnabled(false);
      expect(HapticService.isEnabled()).toBe(false);
    });

    it('should not trigger haptic when disabled', async () => {
      HapticService.setEnabled(false);

      await HapticService.trigger(HapticType.Light);

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should trigger haptic when re-enabled', async () => {
      HapticService.setEnabled(false);
      HapticService.setEnabled(true);

      await HapticService.trigger(HapticType.Light);

      expect(Haptics.impactAsync).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle haptic errors gracefully', async () => {
      // Mock haptic to throw error
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Haptic failed')
      );

      // Should not throw
      await expect(
        HapticService.trigger(HapticType.Light)
      ).resolves.toBeUndefined();
    });

    it('should log error in development mode', async () => {
      // Mock haptic to throw error
      (Haptics.impactAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Haptic failed')
      );

      await HapticService.trigger(HapticType.Light);

      expect(console.error).toHaveBeenCalledWith(
        'Haptic feedback failed:',
        expect.any(Error)
      );
    });

    it('should handle unknown haptic type gracefully', async () => {
      // Cast to any to test invalid type
      await HapticService.trigger('invalid' as any);

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });

  describe('HapticGuidelines', () => {
    it('should define guideline for button press', () => {
      expect(HapticGuidelines.buttonPress).toBe(HapticType.Light);
    });

    it('should define guideline for toggle switch', () => {
      expect(HapticGuidelines.toggleSwitch).toBe(HapticType.Selection);
    });

    it('should define guideline for slider change', () => {
      expect(HapticGuidelines.sliderChange).toBe(HapticType.Selection);
    });

    it('should define guideline for action complete', () => {
      expect(HapticGuidelines.actionComplete).toBe(HapticType.Medium);
    });

    it('should define guideline for success feedback', () => {
      expect(HapticGuidelines.successFeedback).toBe(HapticType.Success);
    });

    it('should define guideline for error feedback', () => {
      expect(HapticGuidelines.errorFeedback).toBe(HapticType.Error);
    });
  });

  describe('integration scenarios', () => {
    it('should handle button press flow', async () => {
      // Simulate button press
      await HapticService.trigger(HapticType.Light);

      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it('should handle success/error flow', async () => {
      // Simulate success
      await HapticService.trigger(HapticType.Success);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );

      jest.clearAllMocks();

      // Simulate error
      await HapticService.trigger(HapticType.Error);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });

    it('should handle toggle switch flow', async () => {
      // Simulate toggle on
      await HapticService.trigger(HapticType.Selection);
      expect(Haptics.selectionAsync).toHaveBeenCalled();

      jest.clearAllMocks();

      // Simulate toggle off
      await HapticService.trigger(HapticType.Selection);
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });

    it('should handle action completion flow', async () => {
      // Simulate action start (light)
      await HapticService.trigger(HapticType.Light);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );

      jest.clearAllMocks();

      // Simulate action complete (medium)
      await HapticService.trigger(HapticType.Medium);
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );

      jest.clearAllMocks();

      // Simulate success
      await HapticService.trigger(HapticType.Success);
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });
  });

  describe('calm design principles', () => {
    it('should limit haptic usage to meaningful interactions', async () => {
      // Only trigger haptics for meaningful actions
      await HapticService.trigger(HapticType.Light); // Button press
      await HapticService.trigger(HapticType.Medium); // Action complete
      await HapticService.trigger(HapticType.Success); // Success

      // Should have triggered exactly 3 times
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });

    it('should respect user preference to disable haptics', async () => {
      HapticService.setEnabled(false);

      // Try to trigger multiple haptics
      await HapticService.trigger(HapticType.Light);
      await HapticService.trigger(HapticType.Medium);
      await HapticService.trigger(HapticType.Success);

      // None should have triggered
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('should check availability before triggering', async () => {
      // Mock unavailable platform
      Object.defineProperty(Platform, 'OS', {
        get: () => 'web',
        configurable: true,
      });

      await HapticService.trigger(HapticType.Light);

      // Should not have triggered
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });
  });
});
