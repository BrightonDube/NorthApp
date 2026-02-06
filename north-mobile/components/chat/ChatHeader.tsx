/**
 * ChatHeader Component
 * 
 * Header with coach name, icon, and back button.
 * Provides navigation and context for the current chat.
 * 
 * Validates: Requirements 11.6, 11.7
 */

import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { Coach } from '@/types';

export interface ChatHeaderProps {
  coach: Coach;
  onBack: () => void;
}

/**
 * ChatHeader Component
 * 
 * Displays coach information and navigation controls at the top of the chat screen.
 * Features:
 * - Coach name and icon
 * - Back button with haptic feedback
 * - Safe area handling for notched devices
 * 
 * @param coach - The coach for this chat
 * @param onBack - Callback when back button is pressed
 * 
 * @example
 * ```tsx
 * <ChatHeader
 *   coach={coach}
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function ChatHeader({ coach, onBack }: ChatHeaderProps) {
  const handleBack = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBack();
  };

  return (
    <SafeAreaView
      edges={['top']}
      className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800"
    >
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity
          onPress={handleBack}
          className="mr-3 items-center justify-center -ml-2"
          style={{ width: 44, height: 44 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={Platform.OS === 'ios' ? '#09090B' : '#09090B'}
            className="dark:text-white"
          />
        </TouchableOpacity>

        <View className="flex-row items-center flex-1">
          <Text
            className="text-3xl mr-3"
            accessible
            accessibilityLabel={`Coach icon: ${coach.icon}`}
          >
            {coach.icon}
          </Text>
          <View className="flex-1">
            <Text
              className="text-lg font-semibold text-zinc-900 dark:text-white"
              numberOfLines={1}
              accessible
              accessibilityRole="header"
              accessibilityLabel={`Chatting with ${coach.name}`}
            >
              {coach.name}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
