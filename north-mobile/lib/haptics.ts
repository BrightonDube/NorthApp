/**
 * HapticService - Refined haptic feedback system for calm design
 * 
 * Provides intentional haptic feedback for meaningful interactions only.
 * Follows the calm design principle of using haptics sparingly and purposefully.
 * 
 * @module lib/haptics
 * 
 * Requirements:
 * - 10.1: Define haptic feedback patterns for different interaction types
 * - 10.2: Trigger medium-impact haptic for significant actions
 * - 10.3: Trigger light-impact haptic for selections
 * - 10.4: Trigger notification-style haptic for errors
 * - 10.5: Limit haptic feedback to meaningful interactions only
 * - 10.6: Trigger selection-style haptic for toggles
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback types aligned with calm design principles
 * 
 * Each type corresponds to a specific interaction pattern:
 * - Light: Selection, toggle, picker changes
 * - Medium: Button press, action completion
 * - Heavy: Significant actions (rarely used)
 * - Success: Task completion, success confirmation
 * - Warning: Caution, warning states
 * - Error: Error notification, failure
 * - Selection: Slider, picker, toggle interactions
 */
export enum HapticType {
  Light = 'light',
  Medium = 'medium',
  Heavy = 'heavy',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Selection = 'selection',
}

/**
 * Maps HapticType to Expo Haptics API calls
 */
const HAPTIC_MAPPING = {
  [HapticType.Light]: () => 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  [HapticType.Medium]: () => 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  [HapticType.Heavy]: () => 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  [HapticType.Success]: () => 
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  [HapticType.Warning]: () => 
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  [HapticType.Error]: () => 
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  [HapticType.Selection]: () => 
    Haptics.selectionAsync(),
};

/**
 * HapticService - Centralized haptic feedback management
 * 
 * Provides a clean interface for triggering haptic feedback with:
 * - Availability checking (device support)
 * - User preference checking (enabled/disabled)
 * - Error handling (graceful degradation)
 * - Consistent API across the app
 * 
 * @example
 * ```typescript
 * // Trigger haptic on button press
 * await HapticService.trigger(HapticType.Light);
 * 
 * // Check if haptics are available
 * if (HapticService.isAvailable()) {
 *   await HapticService.trigger(HapticType.Success);
 * }
 * 
 * // Check if user has enabled haptics
 * if (HapticService.isEnabled()) {
 *   await HapticService.trigger(HapticType.Medium);
 * }
 * ```
 */
export class HapticService {
  /**
   * User preference for haptic feedback
   * In a real app, this would be stored in user settings/preferences
   * For now, defaults to true (enabled)
   */
  private static enabled: boolean = true;

  /**
   * Trigger haptic feedback with error handling
   * 
   * Checks availability and user preferences before triggering.
   * Fails gracefully if haptics are not available or disabled.
   * 
   * @param type - The type of haptic feedback to trigger
   * @returns Promise that resolves when haptic completes (or immediately if unavailable)
   * 
   * @example
   * ```typescript
   * // Button press
   * await HapticService.trigger(HapticType.Light);
   * 
   * // Action completion
   * await HapticService.trigger(HapticType.Medium);
   * 
   * // Success feedback
   * await HapticService.trigger(HapticType.Success);
   * 
   * // Error feedback
   * await HapticService.trigger(HapticType.Error);
   * ```
   */
  static async trigger(type: HapticType): Promise<void> {
    try {
      // Check if haptics are available on this device
      if (!this.isAvailable()) {
        if (__DEV__) {
          console.warn('Haptics not available on this device');
        }
        return;
      }

      // Check if user has enabled haptics
      if (!this.isEnabled()) {
        return; // Silently skip if user disabled
      }

      // Get the haptic function for this type
      const hapticFn = HAPTIC_MAPPING[type];
      if (!hapticFn) {
        if (__DEV__) {
          console.warn(`Unknown haptic type: ${type}`);
        }
        return;
      }

      // Trigger the haptic feedback
      await hapticFn();
    } catch (error) {
      // Log error but don't crash the app
      if (__DEV__) {
        console.error('Haptic feedback failed:', error);
      }
    }
  }

  /**
   * Check if haptic feedback is available on this device
   * 
   * Haptics are available on iOS and Android devices.
   * Not available on web or other platforms.
   * 
   * @returns true if haptics are supported on this platform
   * 
   * @example
   * ```typescript
   * if (HapticService.isAvailable()) {
   *   // Show haptic settings in UI
   * }
   * ```
   */
  static isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Check if haptic feedback is enabled by the user
   * 
   * Returns the user's preference for haptic feedback.
   * In a real app, this would check user settings/preferences.
   * 
   * @returns true if user has enabled haptic feedback
   * 
   * @example
   * ```typescript
   * if (HapticService.isEnabled()) {
   *   await HapticService.trigger(HapticType.Light);
   * }
   * ```
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable haptic feedback
   * 
   * Sets the user preference to enable haptic feedback.
   * In a real app, this would persist to user settings/preferences.
   * 
   * @example
   * ```typescript
   * // In settings screen
   * HapticService.setEnabled(true);
   * ```
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

/**
 * Haptic usage guidelines for calm design
 * 
 * Use haptics for:
 * - Button press (Light): Primary/secondary buttons
 * - Toggle switch (Selection): Toggle on/off
 * - Slider change (Selection): Slider value change
 * - Action complete (Medium): Task completion
 * - Success feedback (Success): Success confirmation
 * - Error feedback (Error): Error notification
 * 
 * Do NOT use haptics for:
 * - Every tap/touch
 * - Scrolling
 * - Text input
 * - Navigation between screens
 * - Passive UI updates
 * 
 * @example
 * ```typescript
 * // ✅ Good: Button press
 * <Button onPress={async () => {
 *   await HapticService.trigger(HapticType.Light);
 *   handleAction();
 * }}>
 * 
 * // ✅ Good: Toggle switch
 * <Switch onChange={async (value) => {
 *   await HapticService.trigger(HapticType.Selection);
 *   setValue(value);
 * }}>
 * 
 * // ✅ Good: Success feedback
 * try {
 *   await saveData();
 *   await HapticService.trigger(HapticType.Success);
 * } catch (error) {
 *   await HapticService.trigger(HapticType.Error);
 * }
 * 
 * // ❌ Bad: Every tap
 * <View onTouchStart={() => HapticService.trigger(HapticType.Light)}>
 * 
 * // ❌ Bad: Scrolling
 * <ScrollView onScroll={() => HapticService.trigger(HapticType.Light)}>
 * ```
 */
export const HapticGuidelines = {
  buttonPress: HapticType.Light,
  toggleSwitch: HapticType.Selection,
  sliderChange: HapticType.Selection,
  actionComplete: HapticType.Medium,
  successFeedback: HapticType.Success,
  errorFeedback: HapticType.Error,
} as const;

/**
 * Default export for convenience
 */
export default HapticService;
