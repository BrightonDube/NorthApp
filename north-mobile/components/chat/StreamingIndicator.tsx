/**
 * StreamingIndicator Component
 * 
 * Displays an animated typing indicator for streaming AI responses.
 * Shows three dots that animate in sequence to indicate the AI is "thinking".
 * 
 * Validates: Requirements 9.5, 11.1
 */

import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

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
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  useEffect(() => {
    // Animate dots in sequence
    dot1Opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400 }),
        withTiming(0.3, { duration: 400 })
      ),
      -1, // infinite
      false
    );

    dot2Opacity.value = withRepeat(
      withSequence(
        withDelay(200, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );

    dot3Opacity.value = withRepeat(
      withSequence(
        withDelay(400, withTiming(1, { duration: 400 })),
        withTiming(0.3, { duration: 400 })
      ),
      -1,
      false
    );
  }, []);

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
      className="mb-4 items-start"
      accessible
      accessibilityRole="text"
      accessibilityLabel="Assistant is typing"
    >
      <View className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl">
        <View className="flex-row items-center gap-1">
          <Animated.View style={dot1Style}>
            <Text className="text-zinc-900 dark:text-white text-lg">•</Text>
          </Animated.View>
          <Animated.View style={dot2Style}>
            <Text className="text-zinc-900 dark:text-white text-lg">•</Text>
          </Animated.View>
          <Animated.View style={dot3Style}>
            <Text className="text-zinc-900 dark:text-white text-lg">•</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
