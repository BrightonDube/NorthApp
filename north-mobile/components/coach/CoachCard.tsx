/**
 * Coach Card Component
 * 
 * Displays a single coach in the Coach Marketplace.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Validates: Requirements 13.1, 13.2, 13.6
 */

import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Coach } from '@/types';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  onLongPress?: () => void;
  testID?: string;
}

/**
 * CoachCard displays a coach with icon, name, and custom badge.
 * Provides haptic feedback on press for premium feel.
 * Shows "Custom" badge for user-created coaches.
 * 
 * @example
 * ```tsx
 * <CoachCard
 *   coach={strategyCoach}
 *   onPress={() => router.push(`/chat/${coach.id}`)}
 *   onLongPress={() => handleEditCoach(coach)}
 * />
 * ```
 */
export function CoachCard({ coach, onPress, onLongPress, testID }: CoachCardProps) {
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

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl p-5 flex-1 min-h-[120px]"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${coach.name}`}
      accessibilityHint={onLongPress ? "Long press to edit" : "Opens chat conversation with this coach"}
      testID={testID}
    >
      <Text className="text-4xl mb-3">{coach.icon}</Text>
      <Text className="text-base font-semibold text-zinc-900 dark:text-white">
        {coach.name}
      </Text>
      {coach.creatorId && (
        <View className="absolute top-3 right-3 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-purple-600 dark:text-purple-400">Custom</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default CoachCard;
