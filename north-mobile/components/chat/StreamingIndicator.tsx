/**
 * StreamingIndicator Component
 * 
 * Displays an animated typing indicator for streaming AI responses.
 * Shows three dots that animate in sequence to indicate the AI is "thinking".
 * 
 * Validates: Requirements 9.5, 11.1
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * StreamingIndicator Component
 * 
 * Renders an animated typing indicator with three dots.
 * Each dot fades in and out in sequence to create a wave effect.
 * 
 * @example
 * ```tsx
 * {isStreaming && <StreamingIndicator />}
 * ```
 */
export function StreamingIndicator() {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const prefersReducedMotion = useReducedMotion();
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Skip animations if user prefers reduced motion
    if (prefersReducedMotion) {
      dot1Opacity.value = 1;
      dot2Opacity.value = 1;
      dot3Opacity.value = 1;
      return;
    }

    // Animate dots in sequence with minimal timing (< 200ms per animation)
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0.3, { duration: 180 })
      ),
      -1, // infinite
      false
    );

    dot2Opacity.value = withRepeat(
      withSequence(
        withDelay(120, withTiming(1, { duration: 180 })),
        withTiming(0.3, { duration: 180 })
      ),
      -1,
      false
    );

    dot3Opacity.value = withRepeat(
      withSequence(
        withDelay(180, withTiming(1, { duration: 180 })),
        withTiming(0.3, { duration: 180 })
      ),
      -1,
      false
    );
  }, [prefersReducedMotion]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <View
      style={{ marginBottom: 8, alignItems: 'flex-start' }}
      accessible
      accessibilityRole="text"
      accessibilityLabel="Coach is thinking"
      accessibilityLiveRegion="polite"
    >
      <View
        style={{
          backgroundColor: isDark ? '#1E1C1A' : '#FFFFFF',
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderRadius: 22,
          borderBottomLeftRadius: 6,
          shadowColor: isDark ? '#000' : '#78716C',
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: isDark ? 8 : 12,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, dot1Style]} />
          <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, dot2Style]} />
          <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, dot3Style]} />
        </View>
      </View>
    </View>
  );
}
