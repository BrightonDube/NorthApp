/**
 * Coach Card Component
 * 
 * Displays a single coach in the Coach Marketplace.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Subtle fade-in animation on mount
 * - Haptic feedback on press
 * - Respects reduced motion preferences
 * - Keyboard focus indicators for accessibility
 * 
 * Validates: Requirements 13.1, 13.2, 13.6, 19.7, 23.7
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useColorScheme } from 'react-native';
import type { Coach } from '@/types';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
  index?: number; // For staggered animations
}

/**
 * CoachCard displays a coach with icon and name.
 * Provides haptic feedback on press for premium feel.
 * Simplified: removed custom badge for cleaner design.
 * Now includes focus indicators for keyboard navigation.
 * 
 * @example
 * ```tsx
 * <CoachCard
 *   coach={strategyCoach}
 *   onPress={() => router.push(`/chat/${coach.id}`)}
 *   onLongPress={() => handleEditCoach(coach)}
 *   index={0}
 * />
 * ```
 */
export function CoachCard({ coach, onPress, onLongPress, testID, index = 0 }: CoachCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  // Focus indicator color
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';

  return (
    <Animated.View
      entering={prefersReducedMotion ? undefined : FadeIn.duration(400).delay(index * 50)}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${coach.name}`}
        accessibilityHint={onLongPress ? "Long press to edit" : "Opens chat conversation with this coach"}
        testID={testID}
        style={({ pressed, focused }) => [
          styles.card,
          pressed && styles.pressed,
          focused && { 
            borderWidth: 2, 
            borderColor: focusColor,
          },
        ]}
      >
        <Text className="text-5xl mb-4">{coach.icon}</Text>
        <Text className="text-base font-semibold text-zinc-900 dark:text-white leading-5">
          {coach.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F4F4F5', // Light mode
    borderRadius: 16,
    padding: 24,
    flex: 1,
    minHeight: 130,
  },
  pressed: {
    opacity: 0.8,
  },
});

export default CoachCard;
