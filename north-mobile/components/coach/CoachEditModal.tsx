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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { Coach } from '@/types';
import { useBillingStore } from '@/stores/billingStore';
import { useThemeColors } from '@/contexts/ThemeContext';

interface CoachEditModalProps {
  visible: boolean;
  coach: Coach | null;
  onSave: (id: string, updates: { name?: string; icon?: string; systemPrompt?: string; isPublic?: boolean }) => Promise<void>;
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
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isProUser = useBillingStore((state) => state.isProUser);

  // Update form when coach changes
  useEffect(() => {
    if (coach) {
      setName(coach.name);
      setIcon(coach.icon);
      setSystemPrompt(coach.systemPrompt);
      setIsPublic(coach.isPublic);
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
      const updates: { name?: string; icon?: string; systemPrompt?: string; isPublic?: boolean } = {};
      if (trimmedName !== coach.name) updates.name = trimmedName;
      if (icon !== coach.icon) updates.icon = icon;
      if (trimmedPrompt !== coach.systemPrompt) updates.systemPrompt = trimmedPrompt;
      if (isPublic !== coach.isPublic) updates.isPublic = isPublic;

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
        systemPrompt.trim() !== coach.systemPrompt ||
        isPublic !== coach.isPublic;

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

              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                Edit Coach
              </Text>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isLoading || !isFormValid}
                style={{ paddingVertical: 8, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Save changes"
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
                    Save
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
                  placeholder="You are a strategic thinking coach who helps founders make better decisions..."
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

              {/* Make Public Toggle */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 }}>
                      Make Public
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {isProUser 
                        ? 'Share this coach in the marketplace for others to discover and install'
                        : 'Upgrade to Pro to share your coaches publicly'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isProUser) {
                        Alert.alert(
                          'Pro Feature',
                          'Making coaches public is a Pro feature. Upgrade to share your coaches with others.',
                          [{ text: 'OK' }]
                        );
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      }
                    }}
                    disabled={isLoading}
                    accessible
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isPublic, disabled: !isProUser }}
                    accessibilityLabel="Make coach public"
                  >
                    <Switch
                      value={isPublic}
                      onValueChange={(value) => {
                        if (isProUser) {
                          setIsPublic(value);
                          setError(null);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      disabled={!isProUser || isLoading}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={isPublic ? colors.background : colors.surface}
                      ios_backgroundColor={colors.border}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Button */}
              {onDelete && (
                <View style={{ marginBottom: 24 }}>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={isLoading}
                    style={{ padding: 16, backgroundColor: colors.error + '20', borderRadius: 12, borderWidth: 1, borderColor: colors.error }}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Delete coach"
                  >
                    <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.error }}>
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
