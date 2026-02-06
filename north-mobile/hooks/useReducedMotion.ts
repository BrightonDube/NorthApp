/**
 * useReducedMotion Hook
 * 
 * Detects if the user has enabled reduced motion preferences in their device settings.
 * This hook respects accessibility preferences and allows animations to be disabled
 * for users who prefer reduced motion.
 * 
 * Validates: Requirements 15.2, 23.1-23.10
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * useReducedMotion Hook
 * 
 * Returns true if the user has enabled reduced motion in their device settings.
 * Automatically updates when the setting changes.
 * 
 * @returns {boolean} True if reduced motion is enabled, false otherwise
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *   
 *   return (
 *     <Animated.View
 *       entering={prefersReducedMotion ? undefined : FadeIn}
 *     >
 *       <Text>Content</Text>
 *     </Animated.View>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        setPrefersReducedMotion(isEnabled);
      })
      .catch((error) => {
        // Handle errors gracefully - default to false
        console.warn('Failed to check reduced motion preference:', error);
        setPrefersReducedMotion(false);
      });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isEnabled) => {
        setPrefersReducedMotion(isEnabled);
      }
    );

    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
}
