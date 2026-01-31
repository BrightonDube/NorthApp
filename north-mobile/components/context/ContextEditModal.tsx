/**
 * ContextEditModal Component
 * 
 * Modal for editing existing context items.
 * Includes content input, save/cancel buttons, and error handling.
 * 
 * Validates: Requirements 14.2, 14.3
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { UserContext } from '@/types';

interface ContextEditModalProps {
  visible: boolean;
  context: UserContext | null;
  onSave: (id: string, content: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Category display names
 */
const categoryLabels = {
  values: 'Value',
  goals: 'Goal',
  projects: 'Project',
  constraints: 'Constraint',
};

/**
 * ContextEditModal Component
 * 
 * Features:
 * - Multiline text input for content editing
 * - Save and Cancel buttons
 * - Loading state during save operation
 * - Error display with retry option
 * - Keyboard avoiding view for better UX
 * - Haptic feedback on actions
 * 
 * @example
 * ```tsx
 * <ContextEditModal
 *   visible={isEditModalVisible}
 *   context={selectedContext}
 *   onSave={handleSave}
 *   onClose={() => setIsEditModalVisible(false)}
 * />
 * ```
 */
export function ContextEditModal({
  visible,
  context,
  onSave,
  onClose,
}: ContextEditModalProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update content when context changes
  useEffect(() => {
    if (context) {
      setContent(context.content);
      setError(null);
    }
  }, [context]);

  /**
   * Handle save action
   * Validates input and calls onSave callback
   */
  const handleSave = async () => {
    if (!context) return;

    // Validate content
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Content cannot be empty');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (trimmedContent.length > 1000) {
      setError('Content must be 1000 characters or less');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(context.id, trimmedContent);
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
   * Handle cancel action
   * Confirms if there are unsaved changes
   */
  const handleCancel = () => {
    if (context && content.trim() !== context.content) {
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
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  if (!context) return null;

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
          <View className="flex-1 bg-white dark:bg-zinc-950 px-6">
            {/* Header */}
            <View className="flex-row items-center justify-between py-4 border-b border-zinc-200 dark:border-zinc-800">
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
                Edit {categoryLabels[context.category]}
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading || !content.trim()}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text
                    className={`text-base font-semibold ${
                      content.trim()
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Error Display */}
            {error && (
              <View className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <Text className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </Text>
              </View>
            )}

            {/* Content Input */}
            <View className="flex-1 mt-6">
              <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Content
              </Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={`Enter your ${context.category.slice(0, -1)}...`}
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl text-base text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800"
                maxLength={1000}
                editable={!isLoading}
                accessible
                accessibilityLabel="Content input"
                accessibilityHint="Enter the content for your context item"
              />
              <Text className="text-xs text-zinc-400 dark:text-zinc-600 mt-2 text-right">
                {content.length} / 1000
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
