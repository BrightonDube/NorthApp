/**
 * CoachEditModal Component
 * 
 * Modal for editing user's private coaches.
 * Includes name, icon picker, and system prompt editing.
 * 
 * Validates: Requirements 7.6
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { Coach } from '@/types';

interface CoachEditModalProps {
  visible: boolean;
  coach: Coach | null;
  onSave: (id: string, updates: { name?: string; icon?: string; systemPrompt?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Suggested coach icons (emojis)
 */
const suggestedIcons = [
  '🎯', '💼', '🚀', '💡', '🧠', '📊',
  '🎨', '✍️', '🏃', '💪', '🌟', '🔥',
  '📚', '🎓', '💰', '🏆', '🎭', '🌈',
  '⚡', '🌙', '☀️', '🌊', '🏔️', '🌺',
];

/**
 * CoachEditModal Component
 * 
 * Features:
 * - Name input with validation
 * - Icon picker with emoji suggestions
 * - System prompt textarea with character limit
 * - Save and Cancel buttons
 * - Optional Delete button
 * - Loading state during save/delete operations
 * - Error display with retry option
 * - Keyboard avoiding view for better UX
 * - Haptic feedback on actions
 * - Confirmation dialog for unsaved changes
 * 
 * @example
 * ```tsx
 * <CoachEditModal
 *   visible={isEditModalVisible}
 *   coach={selectedCoach}
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   onClose={() => setIsEditModalVisible(false)}
 * />
 * ```
 */
export function CoachEditModal({
  visible,
  coach,
  onSave,
  onDelete,
  onClose,
}: CoachEditModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when coach changes
  useEffect(() => {
    if (coach) {
      setName(coach.name);
      setIcon(coach.icon);
      setSystemPrompt(coach.systemPrompt);
      setError(null);
    }
  }, [coach]);

  /**
   * Handle icon selection
   */
  const handleIconSelect = (selectedIcon: string) => {
    setIcon(selectedIcon);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Handle save action
   * Validates input and calls onSave callback
   */
  const handleSave = async () => {
    if (!coach) return;

    // Validate inputs
    const trimmedName = name.trim();
    const trimmedPrompt = systemPrompt.trim();

    if (!trimmedName) {
      setError('Coach name is required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmedName.length > 50) {
      setError('Coach name must be 50 characters or less');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!trimmedPrompt) {
      setError('System prompt is required');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmedPrompt.length < 20) {
      setError('System prompt must be at least 20 characters');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmedPrompt.length > 2000) {
      setError('System prompt must be 2000 characters or less');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Only send changed fields
      const updates: { name?: string; icon?: string; systemPrompt?: string } = {};
      if (trimmedName !== coach.name) updates.name = trimmedName;
      if (icon !== coach.icon) updates.icon = icon;
      if (trimmedPrompt !== coach.systemPrompt) updates.systemPrompt = trimmedPrompt;

      await onSave(coach.id, updates);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes';
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle delete action
   * Shows confirmation dialog before deleting
   */
  const handleDelete = () => {
    if (!coach || !onDelete) return;

    Alert.alert(
      'Delete Coach',
      `Are you sure you want to delete "${coach.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            setError(null);

            try {
              await onDelete(coach.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to delete coach';
              setError(errorMessage);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Handle cancel action
   * Confirms if there are unsaved changes
   */
  const handleCancel = () => {
    if (coach) {
      const hasChanges =
        name.trim() !== coach.name ||
        icon !== coach.icon ||
        systemPrompt.trim() !== coach.systemPrompt;

      if (hasChanges) {
        Alert.alert(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to discard them?',
          [
            {
              text: 'Keep Editing',
              style: 'cancel',
            },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              },
            },
          ]
        );
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (!coach) return null;

  const isFormValid = name.trim() && systemPrompt.trim().length >= 20;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-white dark:bg-zinc-950">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isLoading}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-base text-zinc-600 dark:text-zinc-400">
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text className="text-lg font-semibold text-zinc-900 dark:text-white">
                Edit Coach
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading || !isFormValid}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      isFormValid
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6">
              {/* Error Display */}
              {error && (
                <View className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <Text className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </Text>
                </View>
              )}

              {/* Name Input */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Coach Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Strategy Coach"
                  placeholderTextColor="#9ca3af"
                  className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-base text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"
                  maxLength={50}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="Coach name input"
                  accessibilityHint="Enter a name for your coach"
                />
                <Text className="text-xs text-zinc-400 dark:text-zinc-600 mt-1 text-right">
                  {name.length} / 50
                </Text>
              </View>

              {/* Icon Picker */}
              <View className="mt-6">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  Icon
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {suggestedIcons.map((suggestedIcon) => (
                    <TouchableOpacity
                      key={suggestedIcon}
                      onPress={() => handleIconSelect(suggestedIcon)}
                      className={`w-12 h-12 rounded-xl items-center justify-center ${
                        icon === suggestedIcon
                          ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 dark:border-blue-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent'
                      }`}
                      accessible
                      accessibilityRole="radio"
                      accessibilityState={{ checked: icon === suggestedIcon }}
                      accessibilityLabel={`Icon ${suggestedIcon}`}
                    >
                      <Text className="text-2xl">{suggestedIcon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Selected: {icon}
                </Text>
              </View>

              {/* System Prompt Input */}
              <View className="mt-6 mb-6">
                <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  System Prompt
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                  Define your coach's role, expertise, and personality. This guides how the AI responds.
                </Text>
                <TextInput
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  placeholder="You are a strategic thinking coach who helps founders make better decisions..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-base text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 min-h-[200px]"
                  maxLength={2000}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="System prompt input"
                  accessibilityHint="Enter the system prompt that defines your coach's behavior"
                />
                <Text className="text-xs text-zinc-400 dark:text-zinc-600 mt-2 text-right">
                  {systemPrompt.length} / 2000 (minimum 20)
                </Text>
              </View>

              {/* Delete Button */}
              {onDelete && (
                <View className="mb-6">
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isLoading}
                    className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Delete coach"
                  >
                    <Text className="text-center text-base font-semibold text-red-600 dark:text-red-400">
                      Delete Coach
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default CoachEditModal;
