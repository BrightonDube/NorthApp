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
      `You are ${name}, an expert ${finalExpertise} coach. Your coaching style is ${selectedStyle?.label?.toLowerCase() || 'supportive'} - ${selectedStyle?.description?.toLowerCase() || 'warm and encouraging'}. ${description ? `About you: ${description}` : ''}`;

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={handleClose} 
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close coach creation"
          >
            <Ionicons name="close" size={24} color="#71717A" />
          </Pressable>
          <Text style={styles.headerTitle}>Create Coach</Text>
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
            <Text style={styles.label}>Choose Avatar</Text>
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
                    avatar === emoji && styles.avatarOptionSelected,
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
            <Text style={styles.label}>Coach Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Alex the Strategist"
              placeholderTextColor="#A1A1AA"
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
            <Text style={styles.label}>Expertise Area</Text>
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
                    expertise === domain && styles.chipSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: expertise === domain }}
                  accessibilityLabel={`${domain} expertise`}
                >
                  <Text style={[
                    styles.chipText,
                    expertise === domain && styles.chipTextSelected,
                  ]}>
                    {domain}
                  </Text>
                </Pressable>
              ))}
            </View>
            {expertise === 'Custom' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Enter custom expertise..."
                placeholderTextColor="#A1A1AA"
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
            <Text style={styles.label}>Coaching Style</Text>
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
                    style === s.id && styles.styleOptionSelected,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: style === s.id }}
                  accessibilityLabel={`${s.label} coaching style: ${s.description}`}
                >
                  <View style={styles.styleHeader}>
                    <View style={[
                      styles.radio,
                      style === s.id && styles.radioSelected,
                    ]}>
                      {style === s.id && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.styleLabel,
                      style === s.id && styles.styleLabelSelected,
                    ]}>
                      {s.label}
                    </Text>
                  </View>
                  <Text style={styles.styleDescription}>{s.description}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description (Optional) */}
          <View style={styles.section}>
            <Text style={styles.label}>Description <Text style={styles.optional}>(Optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add a short bio for your coach..."
              placeholderTextColor="#A1A1AA"
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
            <Text style={styles.label}>
              System Prompt <Text style={styles.optional}>(Advanced)</Text>
            </Text>
            <Text style={styles.hint}>
              Customize how your coach behaves. Leave empty for auto-generated prompt.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="You are a coach who..."
              placeholderTextColor="#A1A1AA"
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
          <View style={styles.preview}>
            <View style={styles.previewAvatar}>
              <Text style={styles.previewAvatarText}>{avatar}</Text>
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewName}>{name || 'Your Coach'}</Text>
              <Text style={styles.previewExpertise}>
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
              (!isValid || isLoading) && styles.createButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Create coach"
            accessibilityState={{ disabled: !isValid || isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Coach</Text>
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E4E4E7',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B',
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
    color: '#09090B',
    marginBottom: 10,
  },
  optional: {
    fontWeight: '400',
    color: '#71717A',
  },
  hint: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F4F4F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#09090B',
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
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: '#09090B',
    backgroundColor: '#E4E4E7',
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
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  chipSelected: {
    backgroundColor: '#09090B',
    borderColor: '#09090B',
  },
  chipText: {
    fontSize: 14,
    color: '#09090B',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  styleList: {
    gap: 10,
  },
  styleOption: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  styleOptionSelected: {
    borderColor: '#09090B',
    backgroundColor: '#FFFFFF',
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
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioSelected: {
    borderColor: '#09090B',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#09090B',
  },
  styleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#09090B',
  },
  styleLabelSelected: {
    fontWeight: '600',
  },
  styleDescription: {
    fontSize: 13,
    color: '#71717A',
    marginLeft: 30,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F4F4F5',
    borderRadius: 16,
    marginBottom: 24,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
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
    color: '#09090B',
    marginBottom: 2,
  },
  previewExpertise: {
    fontSize: 14,
    color: '#71717A',
  },
  createButton: {
    backgroundColor: '#09090B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#D4D4D8',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
