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
import { useThemeColors } from '@/contexts/ThemeContext';

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
  const colors = useThemeColors();
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
          <View style={{ flex: 1, backgroundColor: colors.background }} className="px-6">
            {/* Header */}
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between py-4 border-b">
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isLoading}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ color: colors.textSecondary }} className="text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text style={{ color: colors.text }} className="text-lg font-semibold">
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
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={{ color: content.trim() ? colors.primary : colors.textTertiary }}
                    className="text-base font-semibold"
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Error Display */}
            {error && (
              <View style={{ backgroundColor: colors.backgroundTertiary, borderColor: colors.error }} className="mt-4 p-3 rounded-lg border">
                <Text style={{ color: colors.error }} className="text-sm">
                  {error}
                </Text>
              </View>
            )}

            {/* Content Input */}
            <View className="flex-1 mt-6">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                Content
              </Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={`Enter your ${context.category.slice(0, -1)}...`}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                style={{ 
                  flex: 1,
                  backgroundColor: colors.input,
                  color: colors.text,
                  borderColor: colors.border,
                }}
                className="p-4 rounded-xl text-base border"
                maxLength={1000}
                editable={!isLoading}
                accessible
                accessibilityLabel="Content input"
                accessibilityHint="Enter the content for your context item"
              />
              <Text style={{ color: colors.textTertiary }} className="text-xs mt-2 text-right">
                {content.length} / 1000
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
