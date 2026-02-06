/**
 * CoachCreateModal Component
 * 
 * Modal for creating new custom coaches (Pro feature).
 * Includes name, icon picker, and system prompt input.
 * 
 * Validates: Requirements 7.1, 7.2
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

interface CoachCreateModalProps {
  visible: boolean;
  onCreate: (name: string, icon: string, systemPrompt: string) => Promise<void>;
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
 * CoachCreateModal Component
 * 
 * Features:
 * - Name input with validation
 * - Icon picker with emoji suggestions
 * - System prompt textarea with character limit
 * - Create and Cancel buttons
 * - Loading state during creation
 * - Error display with retry option
 * - Keyboard avoiding view for better UX
 * - Haptic feedback on actions
 * - Form validation
 * 
 * @example
 * ```tsx
 * <CoachCreateModal
 *   visible={isCreateModalVisible}
 *   onCreate={handleCreate}
 *   onClose={() => setIsCreateModalVisible(false)}
 * />
 * ```
 */
export function CoachCreateModal({
  visible,
  onCreate,
  onClose,
}: CoachCreateModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setIcon('🎯');
      setSystemPrompt('');
      setError(null);
    }
  }, [visible]);

  /**
   * Handle icon selection
   */
  const handleIconSelect = (selectedIcon: string) => {
    setIcon(selectedIcon);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Handle create action
   * Validates input and calls onCreate callback
   */
  const handleCreate = async () => {
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
      await onCreate(trimmedName, icon, trimmedPrompt);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create coach';
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle cancel action
   */
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const isFormValid = name.trim() && systemPrompt.trim().length >= 20;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
      accessibilityViewIsModal={true}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-white dark:bg-zinc-950">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800" style={{ paddingVertical: 16, minHeight: 56 }}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isLoading}
                style={{ paddingVertical: 8, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text className="text-base text-zinc-600 dark:text-zinc-400">
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text 
                className="text-lg font-semibold text-zinc-900 dark:text-white"
                accessibilityRole="header"
              >
                Create Coach
              </Text>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isLoading || !isFormValid}
                style={{ paddingVertical: 8, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Create coach"
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
                    Create
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
                      className={`rounded-xl items-center justify-center ${
                        icon === suggestedIcon
                          ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500 dark:border-blue-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 border-2 border-transparent'
                      }`}
                      style={{ width: 48, height: 48 }}
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
                  placeholder="You are a strategic thinking coach who helps founders make better decisions. You ask clarifying questions and provide frameworks for thinking through complex problems..."
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default CoachCreateModal;
