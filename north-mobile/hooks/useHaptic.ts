/**
 * useHaptic Hook
 * 
 * React hook wrapper for HapticService that provides convenient API for components.
 * Follows the calm design principle of using haptics sparingly and purposefully.
 * 
 * @module hooks/useHaptic
 * 
 * Requirements:
 * - 10.1: Define haptic feedback patterns for different interaction types
 * - 10.2: Trigger medium-impact haptic for significant actions
 * - 10.3: Trigger light-impact haptic for selections
 * - 10.4: Trigger notification-style haptic for errors
 * - 10.5: Limit haptic feedback to meaningful interactions only
 * - 10.6: Trigger selection-style haptic for toggles
 */

import { useCallback, useMemo } from 'react';
import HapticService, { HapticType } from '@/lib/haptics';

/**
 * Return type for useHaptic hook
 */
export interface UseHapticReturn {
  /**
   * Trigger haptic feedback with the specified type
   * @param type - The type of haptic feedback to trigger
   */
  trigger: (type: HapticType) => Promise<void>;
  
  /**
   * Check if haptic feedback is available on this device
   */
  isAvailable: boolean;
  
  /**
   * Check if haptic feedback is enabled by the user
   */
  isEnabled: boolean;
  
  /**
   * Convenience methods for common haptic patterns
   */
  light: () => Promise<void>;
  medium: () => Promise<void>;
  heavy: () => Promise<void>;
  success: () => Promise<void>;
  warning: () => Promise<void>;
  error: () => Promise<void>;
  selection: () => Promise<void>;
}

/**
 * useHaptic Hook
 * 
 * Provides a convenient React hook interface for triggering haptic feedback.
 * Wraps the HapticService with memoized callbacks for optimal performance.
 * 
 * @returns {UseHapticReturn} Object with haptic trigger methods and status
 * 
 * @example
 * ```tsx
 * function MyButton() {
 *   const haptic = useHaptic();
 *   
 *   const handlePress = async () => {
 *     await haptic.light(); // Trigger light haptic
 *     // Handle button action
 *   };
 *   
 *   return <Button onPress={handlePress}>Press Me</Button>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function ToggleSwitch() {
 *   const haptic = useHaptic();
 *   const [enabled, setEnabled] = useState(false);
 *   
 *   const handleToggle = async () => {
 *     await haptic.selection(); // Trigger selection haptic
 *     setEnabled(!enabled);
 *   };
 *   
 *   return <Switch value={enabled} onValueChange={handleToggle} />;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * function SaveButton() {
 *   const haptic = useHaptic();
 *   
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       await haptic.success(); // Success feedback
 *     } catch (error) {
 *       await haptic.error(); // Error feedback
 *     }
 *   };
 *   
 *   return <Button onPress={handleSave}>Save</Button>;
 * }
 * ```
 */
export function useHaptic(): UseHapticReturn {
  // Main trigger function - memoized to prevent unnecessary re-renders
  const trigger = useCallback(async (type: HapticType) => {
    await HapticService.trigger(type);
  }, []);

  // Convenience methods for common haptic patterns
  const light = useCallback(async () => {
    await HapticService.trigger(HapticType.Light);
  }, []);

  const medium = useCallback(async () => {
    await HapticService.trigger(HapticType.Medium);
  }, []);

  const heavy = useCallback(async () => {
    await HapticService.trigger(HapticType.Heavy);
  }, []);

  const success = useCallback(async () => {
    await HapticService.trigger(HapticType.Success);
  }, []);

  const warning = useCallback(async () => {
    await HapticService.trigger(HapticType.Warning);
  }, []);

  const error = useCallback(async () => {
    await HapticService.trigger(HapticType.Error);
  }, []);

  const selection = useCallback(async () => {
    await HapticService.trigger(HapticType.Selection);
  }, []);

  // Status checks - memoized to prevent unnecessary re-renders
  const isAvailable = useMemo(() => HapticService.isAvailable(), []);
  const isEnabled = useMemo(() => HapticService.isEnabled(), []);

  return {
    trigger,
    isAvailable,
    isEnabled,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}

/**
 * Haptic usage guidelines for calm design
 * 
 * Use haptics for:
 * - Button press (light): Primary/secondary buttons
 * - Toggle switch (selection): Toggle on/off
 * - Slider change (selection): Slider value change
 * - Action complete (medium): Task completion
 * - Success feedback (success): Success confirmation
 * - Error feedback (error): Error notification
 * 
 * Do NOT use haptics for:
 * - Every tap/touch
 * - Scrolling
 * - Text input
 * - Navigation between screens
 * - Passive UI updates
 * 
 * @example
 * ```tsx
 * // ✅ Good: Button press
 * function ActionButton() {
 *   const haptic = useHaptic();
 *   
 *   return (
 *     <Button onPress={async () => {
 *       await haptic.light();
 *       handleAction();
 *     }}>
 *       Action
 *     </Button>
 *   );
 * }
 * 
 * // ✅ Good: Toggle switch
 * function SettingToggle() {
 *   const haptic = useHaptic();
 *   const [value, setValue] = useState(false);
 *   
 *   return (
 *     <Switch
 *       value={value}
 *       onValueChange={async (newValue) => {
 *         await haptic.selection();
 *         setValue(newValue);
 *       }}
 *     />
 *   );
 * }
 * 
 * // ✅ Good: Success feedback
 * function SaveForm() {
 *   const haptic = useHaptic();
 *   
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       await haptic.success();
 *     } catch (error) {
 *       await haptic.error();
 *     }
 *   };
 *   
 *   return <Button onPress={handleSave}>Save</Button>;
 * }
 * 
 * // ❌ Bad: Every tap
 * function BadExample() {
 *   const haptic = useHaptic();
 *   
 *   return (
 *     <View onTouchStart={() => haptic.light()}>
 *       <Text>Don't do this!</Text>
 *     </View>
 *   );
 * }
 * 
 * // ❌ Bad: Scrolling
 * function AnotherBadExample() {
 *   const haptic = useHaptic();
 *   
 *   return (
 *     <ScrollView onScroll={() => haptic.light()}>
 *       <Text>Don't do this either!</Text>
 *     </ScrollView>
 *   );
 * }
 * ```
 */

/**
 * Default export for convenience
 */
export default useHaptic;
