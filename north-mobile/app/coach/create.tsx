/**
 * Coach Creation Screen
 * 
 * Allows Pro users to create custom AI coaches with:
 * - Name and avatar selection
 * - Expertise domain
 * - Coaching style/personality
 * - System prompt configuration
 * 
 * Design: Clean, step-by-step wizard with minimal interface
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 13.3
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCoachStore } from '@/stores/coachStore';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { useThemeColors } from '@/contexts/ThemeContext';

// Available avatars (emoji-based for simplicity)
const AVATARS = ['🧠', '💡', '🎯', '🚀', '💪', '🌟', '📚', '🎨', '⚡', '🔥', '💎', '🌈'];

// Coaching style options
const COACHING_STYLES = [
  { id: 'supportive', label: 'Supportive', description: 'Warm, encouraging, empathetic' },
  { id: 'direct', label: 'Direct', description: 'Straightforward, honest, no-nonsense' },
  { id: 'socratic', label: 'Socratic', description: 'Questions-based, thought-provoking' },
  { id: 'motivational', label: 'Motivational', description: 'Inspiring, energizing, action-oriented' },
  { id: 'analytical', label: 'Analytical', description: 'Data-driven, logical, systematic' },
];

// Expertise domains
const EXPERTISE_DOMAINS = [
  'Life Coaching',
  'Career Development',
  'Health & Fitness',
  'Productivity',
  'Relationships',
  'Finance',
  'Creativity',
  'Mindfulness',
  'Leadership',
  'Custom',
];

export default function CreateCoachScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createCoach, isLoading } = useCoachStore();
  const { isProUser } = useBillingStore();
  const colors = useThemeColors();

  // Form state
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [expertise, setExpertise] = useState('');
  const [customExpertise, setCustomExpertise] = useState('');
  const [style, setStyle] = useState('supportive');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Validation
  const isValid = name.trim().length >= 2 && 
    (expertise !== 'Custom' ? expertise : customExpertise.trim().length > 0);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleCreate = async () => {
    if (!user?.id || !isValid) return;

    // Check Pro status before creating
    if (!isProUser) {
      Alert.alert(
        'Pro Feature',
        'Creating custom coaches requires a Pro subscription. Upgrade to unlock this feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => router.back() }
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const selectedStyle = COACHING_STYLES.find(s => s.id === style);
    const finalExpertise = expertise === 'Custom' ? customExpertise : expertise;

    // Build system prompt
    const finalSystemPrompt = systemPrompt || 
      `You are ${name}, an expert ${finalExpertise} coach.

CORE IDENTITY:
- Your coaching style is ${selectedStyle?.label?.toLowerCase() || 'supportive'}: ${selectedStyle?.description?.toLowerCase() || 'warm and encouraging'}
- You guide users through questions and frameworks, not direct answers
- Every response ends with exactly ONE specific question to deepen the conversation
${description ? `- About you: ${description}` : ''}

ANTI-HALLUCINATION RULES:
- Never invent facts, statistics, or research you are not certain about
- If you don't know something, say so honestly and redirect with a question
- Use "many people find..." rather than fabricating studies
- Never claim certainty about future outcomes

SAFETY GUARDRAILS:
- Decline medical, legal, or financial advice — recommend licensed professionals
- If the user describes a crisis or safety concern, recommend professional support
- Do not assist with anything unethical or harmful
- Maintain appropriate professional boundaries

TONE: ${selectedStyle?.description || 'Warm, encouraging, and supportive'}. You are a thinking partner, not an authority.`;

    try {
      await createCoach(name.trim(), avatar, finalSystemPrompt, undefined, isProUser);

      Alert.alert(
        'Coach Created! 🎉',
        `${name} is ready to help you on your journey.`,
        [{ text: 'Start Chatting', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create coach');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable 
            onPress={handleClose} 
            style={[styles.closeButton, { backgroundColor: colors.backgroundSecondary }]}
            accessibilityRole="button"
            accessibilityLabel="Close coach creation"
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Create Coach</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Choose Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAvatar(emoji);
                  }}
                  style={[
                    styles.avatarOption,
                    { backgroundColor: colors.backgroundSecondary, borderColor: 'transparent' },
                    avatar === emoji && { borderColor: colors.text, backgroundColor: colors.border },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: avatar === emoji }}
                  accessibilityLabel={`Avatar ${emoji}`}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Coach Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="e.g., Alex the Strategist"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
              maxLength={50}
              autoCapitalize="words"
              accessibilityLabel="Coach name input"
              accessibilityHint="Enter a name for your coach"
            />
          </View>

          {/* Expertise Selection */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Expertise Area</Text>
            <View style={styles.chipGrid}>
              {EXPERTISE_DOMAINS.map((domain) => (
                <Pressable
                  key={domain}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExpertise(domain);
                  }}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                    expertise === domain && { backgroundColor: colors.text, borderColor: colors.text },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: expertise === domain }}
                  accessibilityLabel={`${domain} expertise`}
                >
                  <Text style={[
                    styles.chipText,
                    { color: colors.text },
                    expertise === domain && { color: colors.background },
                  ]}>
                    {domain}
                  </Text>
                </Pressable>
              ))}
            </View>
            {expertise === 'Custom' && (
              <TextInput
                style={[styles.input, { marginTop: 12, backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder="Enter custom expertise..."
                placeholderTextColor={colors.textTertiary}
                value={customExpertise}
                onChangeText={setCustomExpertise}
                maxLength={100}
                accessibilityLabel="Custom expertise input"
                accessibilityHint="Enter your custom expertise area"
              />
            )}
          </View>

          {/* Coaching Style */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Coaching Style</Text>
            <View style={styles.styleList}>
              {COACHING_STYLES.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setStyle(s.id);
                  }}
                  style={[
                    styles.styleOption,
                    { backgroundColor: colors.backgroundSecondary, borderColor: 'transparent' },
                    style === s.id && { borderColor: colors.text, backgroundColor: colors.background },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: style === s.id }}
                  accessibilityLabel={`${s.label} coaching style: ${s.description}`}
                >
                  <View style={styles.styleHeader}>
                    <View style={[
                      styles.radio,
                      { borderColor: colors.border },
                      style === s.id && { borderColor: colors.text },
                    ]}>
                      {style === s.id && <View style={[styles.radioInner, { backgroundColor: colors.text }]} />}
                    </View>
                    <Text style={[
                      styles.styleLabel,
                      { color: colors.text },
                    ]}>
                      {s.label}
                    </Text>
                  </View>
                  <Text style={[styles.styleDescription, { color: colors.textSecondary }]}>{s.description}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description (Optional) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Description <Text style={[styles.optional, { color: colors.textSecondary }]}>(Optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="Add a short bio for your coach..."
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Coach description input"
              accessibilityHint="Optional: Add a short bio for your coach"
            />
          </View>

          {/* Advanced: System Prompt (Optional) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              System Prompt <Text style={[styles.optional, { color: colors.textSecondary }]}>(Advanced)</Text>
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Customize how your coach behaves. Leave empty for auto-generated prompt.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              placeholder="You are a coach who..."
              placeholderTextColor={colors.textTertiary}
              value={systemPrompt}
              onChangeText={setSystemPrompt}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              accessibilityLabel="System prompt input"
              accessibilityHint="Advanced: Customize how your coach behaves"
            />
          </View>

          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={[styles.previewAvatar, { backgroundColor: colors.background }]}>
              <Text style={styles.previewAvatarText}>{avatar}</Text>
            </View>
            <View style={styles.previewContent}>
              <Text style={[styles.previewName, { color: colors.text }]}>{name || 'Your Coach'}</Text>
              <Text style={[styles.previewExpertise, { color: colors.textSecondary }]}>
                {expertise === 'Custom' ? customExpertise : expertise || 'Select expertise'}
              </Text>
            </View>
          </View>

          {/* Create Button */}
          <Pressable
            onPress={handleCreate}
            disabled={!isValid || isLoading}
            style={[
              styles.createButton,
              { backgroundColor: colors.text },
              (!isValid || isLoading) && { backgroundColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create coach"
            accessibilityState={{ disabled: !isValid || isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.createButtonText, { color: colors.background }]}>Create Coach</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  optional: {
    fontWeight: '400',
  },
  hint: {
    fontSize: 13,
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 14,
  },
  styleList: {
    gap: 10,
  },
  styleOption: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  styleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  styleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  styleDescription: {
    fontSize: 13,
    marginLeft: 30,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewAvatarText: {
    fontSize: 28,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewExpertise: {
    fontSize: 14,
  },
  createButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
