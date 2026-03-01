/**
 * CoachCreateModal Component
 * 
 * A paginated Socratic wizard for creating custom coaches (Pro feature).
 * Uses fluid Reanimated transitions between steps with haptic feedback.
 * 
 * Steps:
 * 1. Name & Icon — "What shall we call your coach?"
 * 2. Personality  — "How should your coach behave?"
 * 3. Review       — Preview and confirm
 * 
 * Validates: Requirements 7.1, 7.2
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

interface CoachCreateModalProps {
  visible: boolean;
  onCreate: (name: string, icon: string, systemPrompt: string) => Promise<void>;
  onClose: () => void;
}

const TOTAL_STEPS = 3;

const suggestedIcons = [
  '🎯', '💼', '🚀', '💡', '🧠', '📊',
  '🎨', '✍️', '🏃', '💪', '🌟', '🔥',
  '📚', '🎓', '💰', '🏆', '🎭', '🌈',
  '⚡', '🌙', '☀️', '🌊', '🏔️', '🌺',
];

const stepTitles = [
  'What shall we call\nyour coach?',
  'How should your\ncoach behave?',
  'Looking good!\nReady to create?',
];

export function CoachCreateModal({ visible, onCreate, onClose }: CoachCreateModalProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep(0);
      setDirection('forward');
      setName('');
      setIcon('🎯');
      setSystemPrompt('');
      setError(null);
    }
  }, [visible]);

  const canAdvance = useCallback(() => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return systemPrompt.trim().length >= 20;
    return true;
  }, [step, name, systemPrompt]);

  const goNext = useCallback(() => {
    if (!canAdvance() || step >= TOTAL_STEPS - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setDirection('forward');
    setStep(s => s + 1);
  }, [canAdvance, step]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setDirection('back');
    setStep(s => s - 1);
  }, [step]);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onCreate(name.trim(), icon, systemPrompt.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coach');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [name, icon, systemPrompt, onCreate, onClose]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleIconSelect = useCallback((sel: string) => {
    setIcon(sel);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const entering = direction === 'forward'
    ? SlideInRight.duration(300).springify()
    : SlideInLeft.duration(300).springify();
  const exiting = direction === 'forward'
    ? SlideOutLeft.duration(200)
    : SlideOutRight.duration(200);

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
      accessibilityViewIsModal
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            {/* Header with progress */}
            <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Pressable
                  onPress={step === 0 ? handleCancel : goBack}
                  style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={step === 0 ? 'Cancel' : 'Go back'}
                >
                  <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                    {step === 0 ? 'Cancel' : '← Back'}
                  </Text>
                </Pressable>
                <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: '500' }}>
                  Step {step + 1} of {TOTAL_STEPS}
                </Text>
                <View style={{ minWidth: 44 }} />
              </View>
              {/* Progress bar */}
              <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                <Animated.View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.primary,
                    width: `${progress}%`,
                  }}
                />
              </View>
            </View>

            {/* Step content */}
            <View style={{ flex: 1, paddingHorizontal: 24 }}>
              {/* Step title */}
              <Animated.Text
                key={`title-${step}`}
                entering={FadeIn.duration(300).delay(100)}
                exiting={FadeOut.duration(150)}
                style={{ fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 24, marginBottom: 8, lineHeight: 36, letterSpacing: -0.5 }}
                accessibilityRole="header"
              >
                {stepTitles[step]}
              </Animated.Text>

              {/* Error */}
              {error && (
                <Animated.View entering={FadeIn.duration(200)} style={{ padding: 12, backgroundColor: colors.error + '15', borderRadius: 12, borderWidth: 1, borderColor: colors.error + '40', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: colors.error }}>{error}</Text>
                </Animated.View>
              )}

              {/* Step 0: Name & Icon */}
              {step === 0 && (
                <Animated.View key="step-0" entering={entering} exiting={exiting} style={{ flex: 1, paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>
                    Give your coach a memorable name and pick an icon that represents their vibe.
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Strategy Coach"
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      padding: 16,
                      backgroundColor: isDark ? '#1E1C1A' : '#FFFFFF',
                      borderRadius: 16,
                      fontSize: 18,
                      fontWeight: '500',
                      color: colors.text,
                      borderWidth: 1.5,
                      borderColor: name.trim() ? colors.primary + '60' : colors.border,
                      marginBottom: 6,
                    }}
                    maxLength={50}
                    autoFocus
                    accessible
                    accessibilityLabel="Coach name"
                    accessibilityHint="Enter a name for your coach"
                  />
                  <Text style={{ fontSize: 12, color: colors.textTertiary, textAlign: 'right', marginBottom: 24 }}>
                    {name.length}/50
                  </Text>

                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 14 }}>
                    Choose an icon
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {suggestedIcons.map((ic) => (
                      <Pressable
                        key={ic}
                        onPress={() => handleIconSelect(ic)}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: icon === ic ? colors.primary + '18' : (isDark ? '#1E1C1A' : '#FFFFFF'),
                          borderWidth: 2,
                          borderColor: icon === ic ? colors.primary : 'transparent',
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: icon === ic }}
                        accessibilityLabel={`Icon ${ic}`}
                      >
                        <Text style={{ fontSize: 26 }}>{ic}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* Step 1: System Prompt */}
              {step === 1 && (
                <Animated.View key="step-1" entering={entering} exiting={exiting} style={{ flex: 1, paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 20, lineHeight: 22 }}>
                    Describe your coach's personality, expertise, and coaching style. Be specific — this shapes every conversation.
                  </Text>
                  <TextInput
                    value={systemPrompt}
                    onChangeText={setSystemPrompt}
                    placeholder="You are a strategic thinking coach who helps founders make better decisions..."
                    placeholderTextColor={colors.textTertiary}
                    multiline
                    textAlignVertical="top"
                    style={{
                      flex: 1,
                      padding: 16,
                      backgroundColor: isDark ? '#1E1C1A' : '#FFFFFF',
                      borderRadius: 16,
                      fontSize: 16,
                      color: colors.text,
                      lineHeight: 24,
                      borderWidth: 1.5,
                      borderColor: systemPrompt.trim().length >= 20 ? colors.primary + '60' : colors.border,
                      minHeight: 200,
                      maxHeight: 360,
                    }}
                    maxLength={2000}
                    autoFocus
                    accessible
                    accessibilityLabel="System prompt"
                    accessibilityHint="Describe how your coach should behave"
                  />
                  <Text style={{ fontSize: 12, color: systemPrompt.trim().length < 20 ? colors.warning : colors.textTertiary, marginTop: 6, textAlign: 'right' }}>
                    {systemPrompt.length}/2000 {systemPrompt.trim().length < 20 ? `(${20 - systemPrompt.trim().length} more needed)` : ''}
                  </Text>
                </Animated.View>
              )}

              {/* Step 2: Review */}
              {step === 2 && (
                <Animated.View key="step-2" entering={entering} exiting={exiting} style={{ flex: 1, paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 24, lineHeight: 22 }}>
                    Here's a preview of your new coach. Hit Create when you're happy!
                  </Text>

                  {/* Preview card */}
                  <View style={{
                    backgroundColor: isDark ? '#1E1C1A' : '#FFFFFF',
                    borderRadius: 20,
                    padding: 24,
                    shadowColor: isDark ? '#000' : '#78716C',
                    shadowOpacity: isDark ? 0.3 : 0.1,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                      <View style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        backgroundColor: colors.primary + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 16,
                      }}>
                        <Text style={{ fontSize: 30 }}>{icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{name.trim()}</Text>
                        <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 2 }}>Custom Coach</Text>
                      </View>
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 16 }} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>Personality</Text>
                    <Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }} numberOfLines={6}>
                      {systemPrompt.trim()}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Bottom button */}
            <View style={{ paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 8 : 16, paddingTop: 12 }}>
              {step < TOTAL_STEPS - 1 ? (
                <Pressable
                  onPress={goNext}
                  disabled={!canAdvance()}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: canAdvance() ? colors.primary : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Continue to next step"
                  accessibilityState={{ disabled: !canAdvance() }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '600', color: canAdvance() ? '#FFFFFF' : colors.textTertiary }}>
                    Continue
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCreate}
                  disabled={isLoading}
                  style={{
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Create coach"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#FFFFFF' }}>
                      Create Coach
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default CoachCreateModal;
