/**
 * ContextCreateModal Component
 * 
 * Modal for creating new context items.
 * Includes category picker, content input, and error handling.
 * 
 * Validates: Requirements 14.4
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
import type { ContextCategory } from '@/types';
import { useThemeColors } from '@/contexts/ThemeContext';

interface ContextCreateModalProps {
  visible: boolean;
  onCreate: (category: ContextCategory, content: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Category options with labels and descriptions
 */
const categories: Array<{
  value: ContextCategory;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: 'values',
    label: 'Value',
    description: 'Core principles and beliefs',
    color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  },
  {
    value: 'goals',
    label: 'Goal',
    description: 'Objectives and aspirations',
    color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  },
  {
    value: 'projects',
    label: 'Project',
    description: 'Current active work',
    color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  },
  {
    value: 'constraints',
    label: 'Constraint',
    description: 'Limitations and boundaries',
    color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  },
];

/**
 * ContextCreateModal Component
 * 
 * Features:
 * - Category picker with visual indicators
 * - Multiline text input for content
 * - Create and Cancel buttons
 * - Loading state during creation
 * - Error display with retry option
 * - Keyboard avoiding view for better UX
 * - Haptic feedback on actions
 * - Form validation
 * 
 * @example
 * ```tsx
 * <ContextCreateModal
 *   visible={isCreateModalVisible}
 *   onCreate={handleCreate}
 *   onClose={() => setIsCreateModalVisible(false)}
 * />
 * ```
 */
export function ContextCreateModal({
  visible,
  onCreate,
  onClose,
}: ContextCreateModalProps) {
  const colors = useThemeColors();
  const [selectedCategory, setSelectedCategory] = useState<ContextCategory>('values');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedCategory('values');
      setContent('');
      setError(null);
    }
  }, [visible]);

  /**
   * Handle category selection
   */
  const handleCategorySelect = (category: ContextCategory) => {
    setSelectedCategory(category);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Handle create action
   * Validates input and calls onCreate callback
   */
  const handleCreate = async () => {
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
      await onCreate(selectedCategory, trimmedContent);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create context';
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
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ borderBottomColor: colors.border }} className="flex-row items-center justify-between px-6 py-4 border-b">
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
                Add Context
              </Text>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isLoading || !content.trim()}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Create context item"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text
                    style={{ color: content.trim() ? colors.primary : colors.textTertiary }}
                    className="text-base font-semibold"
                  >
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6">
              {/* Error Display */}
              {error && (
                <View style={{ backgroundColor: colors.backgroundTertiary, borderColor: colors.error }} className="mt-4 p-3 rounded-lg border">
                  <Text style={{ color: colors.error }} className="text-sm">
                    {error}
                  </Text>
                </View>
              )}

              {/* Category Picker */}
              <View className="mt-6">
                <Text style={{ color: colors.text }} className="text-sm font-medium mb-3">
                  Category
                </Text>
                <View className="gap-3">
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      onPress={() => handleCategorySelect(category.value)}
                      className={`p-4 rounded-xl border-2 ${
                        selectedCategory === category.value
                          ? category.color
                          : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      }`}
                      accessible
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selectedCategory === category.value }}
                      accessibilityLabel={`${category.label}: ${category.description}`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text style={{ color: colors.text }} className="text-base font-semibold mb-1">
                            {category.label}
                          </Text>
                          <Text style={{ color: colors.textSecondary }} className="text-sm">
                            {category.description}
                          </Text>
                        </View>
                        {selectedCategory === category.value && (
                          <View style={{ backgroundColor: colors.primary }} className="w-6 h-6 rounded-full items-center justify-center">
                            <Text className="text-white text-xs">✓</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Content Input */}
              <View className="mt-6 mb-6">
                <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                  Content
                </Text>
                <TextInput
                  value={content}
                  onChangeText={setContent}
                  placeholder={`Enter your ${selectedCategory.slice(0, -1)}...`}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={{ 
                    backgroundColor: colors.input,
                    color: colors.text,
                    borderColor: colors.border,
                  }}
                  className="p-4 rounded-xl text-base border min-h-[150px]"
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
