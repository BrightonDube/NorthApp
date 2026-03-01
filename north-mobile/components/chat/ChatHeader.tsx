/**
 * ChatHeader Component
 * 
 * Header with coach name, icon, and back button.
 * Provides navigation and context for the current chat.
 * 
 * Validates: Requirements 11.6, 11.7
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { Coach } from '@/types';

export interface ChatHeaderProps {
  coach: Coach;
  onBack: () => void;
  onOpenFileSelector?: () => void;
  onExport?: () => void;
}

/**
 * ChatHeader Component
 * 
 * Displays coach information and navigation controls at the top of the chat screen.
 * Features:
 * - Coach name and icon
 * - Back button with haptic feedback
 * - File selector button for session-specific file selection
 * - Safe area handling for notched devices
 * 
 * @param coach - The coach for this chat
 * @param onBack - Callback when back button is pressed
 * @param onOpenFileSelector - Optional callback to open file selector
 * 
 * @example
 * ```tsx
 * <ChatHeader
 *   coach={coach}
 *   onBack={() => router.back()}
 *   onOpenFileSelector={() => setShowFileSelector(true)}
 * />
 * ```
 */
export function ChatHeader({ coach, onBack, onOpenFileSelector, onExport }: ChatHeaderProps) {
  const colors = useThemeColors();
  
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  };

  const handleFileSelector = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOpenFileSelector?.();
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={{ backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }}
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
            color={colors.text}
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
              style={{ color: colors.text }}
              className="text-lg font-semibold"
              numberOfLines={1}
              accessible
              accessibilityRole="header"
              accessibilityLabel={`Chatting with ${coach.name}`}
            >
              {coach.name}
            </Text>
          </View>
        </View>

        {/* Export Button */}
        {onExport && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onExport();
            }}
            className="ml-1 items-center justify-center"
            style={{ width: 44, height: 44 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Export conversation"
          >
            <Ionicons
              name="share-outline"
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        )}

        {/* File Selector Button */}
        {onOpenFileSelector && (
          <TouchableOpacity
            onPress={handleFileSelector}
            className="ml-2 items-center justify-center"
            style={{ width: 44, height: 44 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Select files for this conversation"
            accessibilityHint="Opens file selector to choose which files to include"
          >
            <Ionicons
              name="document-text-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
