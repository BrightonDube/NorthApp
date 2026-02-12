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
import { useThemeColors } from '@/contexts/ThemeContext';

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
  const colors = useThemeColors();
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
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isLoading}
                style={{ paddingVertical: 8, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <Text 
                style={{ fontSize: 18, fontWeight: '600', color: colors.text }}
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
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: isFormValid ? colors.primary : colors.textTertiary
                    }}
                  >
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 24 }}>
              {/* Error Display */}
              {error && (
                <View style={{ marginTop: 16, padding: 12, backgroundColor: colors.error + '20', borderRadius: 12, borderWidth: 1, borderColor: colors.error }}>
                  <Text style={{ fontSize: 14, color: colors.error }}>
                    {error}
                  </Text>
                </View>
              )}

              {/* Name Input */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>
                  Coach Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g., Strategy Coach"
                  placeholderTextColor={colors.textTertiary}
                  style={{ padding: 16, backgroundColor: colors.input, borderRadius: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border }}
                  maxLength={50}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="Coach name input"
                  accessibilityHint="Enter a name for your coach"
                />
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4, textAlign: 'right' }}>
                  {name.length} / 50
                </Text>
              </View>

              {/* Icon Picker */}
              <View style={{ marginTop: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 12 }}>
                  Icon
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {suggestedIcons.map((suggestedIcon) => (
                    <TouchableOpacity
                      key={suggestedIcon}
                      onPress={() => handleIconSelect(suggestedIcon)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: icon === suggestedIcon ? colors.primary + '20' : colors.surface,
                        borderWidth: 2,
                        borderColor: icon === suggestedIcon ? colors.primary : 'transparent'
                      }}
                      accessible
                      accessibilityRole="radio"
                      accessibilityState={{ checked: icon === suggestedIcon }}
                      accessibilityLabel={`Icon ${suggestedIcon}`}
                    >
                      <Text style={{ fontSize: 24 }}>{suggestedIcon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                  Selected: {icon}
                </Text>
              </View>

              {/* System Prompt Input */}
              <View style={{ marginTop: 24, marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 8 }}>
                  System Prompt
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                  Define your coach's role, expertise, and personality. This guides how the AI responds.
                </Text>
                <TextInput
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  placeholder="You are a strategic thinking coach who helps founders make better decisions. You ask clarifying questions and provide frameworks for thinking through complex problems..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  style={{ padding: 16, backgroundColor: colors.input, borderRadius: 12, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 200 }}
                  maxLength={2000}
                  editable={!isLoading}
                  accessible
                  accessibilityLabel="System prompt input"
                  accessibilityHint="Enter the system prompt that defines your coach's behavior"
                />
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 8, textAlign: 'right' }}>
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
