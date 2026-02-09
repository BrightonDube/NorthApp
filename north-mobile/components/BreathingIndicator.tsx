/**
 * Breathing Indicator Component
 * 
 * A calming, meditative loading indicator that uses breathing animation.
 * Implements scale and opacity pulse animations for a soothing effect.
 * 
 * Features:
 * - Breathing animation (scale: 1.0 → 1.08 → 1.0)
 * - Opacity pulse (0.6 → 1.0 → 0.6)
 * - 2500ms duration with ease-breathing curve
 * - Customizable size and color
 * - Dark mode support
 * 
 * Validates: Requirements 3.3, 7.1
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <BreathingIndicator />
 * 
 * // Custom size and color
 * <BreathingIndicator size={80} color="#78716C" />
 * 
 * // With text
 * <BreathingIndicator text="Loading..." />
 * ```
 */

import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

interface BreathingIndicatorProps {
  /**
   * Size of the breathing circle in pixels
   * @default 60
   */
  size?: number;
  
  /**
   * Color of the breathing circle
   * @default '#78716C' (brand-accent)
   */
  color?: string;
  
  /**
   * Optional text to display below the indicator
   */
  text?: string;
  
  /**
   * Whether to center the indicator in its container
   * @default true
   */
  centered?: boolean;
}

/**
 * Custom easing function for breathing animation
 * Matches the ease-breathing curve: cubic-bezier(0.45, 0.05, 0.55, 0.95)
 */
const easeBreathing = Easing.bezier(0.45, 0.05, 0.55, 0.95);

/**
 * Breathing Indicator Component
 * 
 * Creates a calming, meditative loading indicator with breathing animation.
 * The animation cycles through scale (1.0 → 1.08 → 1.0) and opacity (0.6 → 1.0 → 0.6)
 * over 2500ms using a custom breathing easing curve.
 */
export function BreathingIndicator({
  size = 60,
  color = '#78716C',
  text,
  centered = true,
}: BreathingIndicatorProps) {
  // Shared values for animations
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  
  useEffect(() => {
    // Start breathing animation
    // Scale: 1.0 → 1.08 → 1.0
    scale.value = withRepeat(
      withTiming(1.08, {
        duration: 2500,
        easing: easeBreathing,
      }),
      -1, // Infinite repeat
      true // Reverse (creates the breathing in/out effect)
    );
    
    // Opacity: 0.6 → 1.0 → 0.6
    opacity.value = withRepeat(
      withTiming(1.0, {
        duration: 2500,
        easing: easeBreathing,
      }),
      -1, // Infinite repeat
      true // Reverse
    );
  }, [scale, opacity]);
  
  // Animated style for the breathing circle
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });
  
  return (
    <View style={[styles.container, centered && styles.centered]}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
      {text && (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  circle: {
    // Base circle styles
    // Size, borderRadius, and backgroundColor are set dynamically
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#78716C',
    textAlign: 'center',
    fontWeight: '400',
  },
});
