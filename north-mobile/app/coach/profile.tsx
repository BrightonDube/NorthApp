/**
 * Coach Profile Screen
 * 
 * Displays detailed information about a coach before starting a coaching session.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Full coach details: icon, name, category, about, expectations, tags
 * - Theme color integration for visual identity
 * - Start Coaching Session button
 * - Back navigation to home screen
 * - Loading state while fetching coach data
 * - Error state for invalid/missing coach
 * - Scrollable layout for varying content lengths
 * - Haptic feedback on interactions
 * 
 * Validates: Requirements 1.1, 5.1, 8.1, 8.2, 8.3, 8.4
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCoachStore } from '@/stores/coachStore';
import { useThemeColors } from '@/contexts/ThemeContext';
import { getCoachThemeColor } from '@/lib/coachColors';
import type { Coach } from '@/types';
import type { CoachCategory } from '@/types';

/**
 * Extract a human-readable "about" from the system prompt.
 * Takes the first meaningful paragraph that describes the coach's purpose.
 */
function extractAboutFromPrompt(prompt: string): string {
  const lines = prompt.split('\n').filter(l => l.trim().length > 0);
  // Look for lines starting with "You are" or "Your purpose"
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('You are') || trimmed.startsWith('Your purpose')) {
      return trimmed;
    }
  }
  // Fallback: first line that's descriptive (not a heading/keyword)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 30 && !trimmed.endsWith(':') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
      return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
    }
  }
  return 'An AI coaching assistant designed to help you grow.';
}

/**
 * Returns default expectations based on coach category
 */
function getDefaultExpectations(category: CoachCategory): string[] {
  const defaults: Record<string, string[]> = {
    Business: [
      'Socratic questioning to deepen your thinking',
      'Framework-based analysis, not direct answers',
      'Challenges to your assumptions and blind spots',
      'Every response ends with a probing question',
    ],
    Creative: [
      'Structured critique focused on clarity and impact',
      'Guidance to improve your own work, not rewrites',
      'Audience-first analysis of your writing',
      'Actionable feedback on structure and persuasion',
    ],
    General: [
      'Reflective questions about your own behavior',
      'Perspective-shifting exercises',
      'Frameworks for difficult conversations',
      'Focus on emotional intelligence and self-awareness',
    ],
    Health: [
      'Focus on sustainable habit formation',
      'Small, achievable steps rather than drastic changes',
      'Questions about obstacles and motivations',
      'No medical advice — general wellness principles only',
    ],
    Productivity: [
      'Systems and habits for consistent output',
      'Time management and prioritization frameworks',
      'Focus on eliminating friction, not adding tools',
      'Questions to uncover what actually drives your productivity',
    ],
    Learning: [
      'Active recall and spaced repetition principles',
      'Questions that deepen understanding, not just memorization',
      'Meta-learning strategies tailored to your goals',
      'Focus on connecting new knowledge to what you already know',
    ],
    Entertainment: [
      'Creative exploration and brainstorming support',
      'Questions to spark new ideas and perspectives',
      'Playful approach to problem-solving',
      'Encouragement to think outside the box',
    ],
    Technical: [
      'Problem decomposition and debugging strategies',
      'Best practices guidance through questions',
      'Architecture and design pattern discussions',
      'Focus on understanding, not just solutions',
    ],
  };
  return defaults[category] || defaults['General'];
}

/**
 * CoachIconSection Component
 * 
 * Displays the coach's icon in a rounded square container with a subtle background color.
 * The background uses the coach's theme color with reduced opacity for a subtle effect.
 * 
 * Validates: Requirements 1.2, 5.2
 * 
 * @param coach - The coach object containing icon and theme color
 */
interface CoachIconSectionProps {
  coach: Coach;
}

function CoachIconSection({ coach }: CoachIconSectionProps) {
  const colors = useThemeColors();
  const themeColor = getCoachThemeColor(coach);
  
  // Create a subtle background by using the theme color with low opacity
  // Falls back to backgroundTertiary if theme color is not available
  const backgroundColor = themeColor 
    ? `${themeColor}15` // 15 in hex = ~8% opacity for subtle effect
    : colors.backgroundTertiary;

  return (
    <View 
      style={[
        styles.iconContainer, 
        { backgroundColor }
      ]}
      accessible
      accessibilityLabel={`${coach.name} coach icon`}
    >
      <Text style={styles.icon}>{coach.icon}</Text>
    </View>
  );
}

/**
 * CoachProfileScreen displays detailed coach information before starting a session.
 * 
 * Route parameters:
 * - coachId: The ID of the coach to display
 * 
 * @example
 * ```tsx
 * // Navigate to profile from home screen
 * router.push(`/coach/profile?coachId=${coach.id}`);
 * ```
 */
export default function CoachProfileScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const colors = useThemeColors();
  const { coaches, fetchCoaches, isLoading } = useCoachStore();

  // Find the coach by ID
  const coach = coaches.find((c) => c.id === coachId);

  // Fetch coaches if not loaded
  useEffect(() => {
    if (coaches.length === 0) {
      fetchCoaches();
    }
  }, []);

  /**
   * Handle back button press
   * Returns to the previous screen (home)
   */
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  /**
   * Handle Start Coaching Session button press
   * Navigates to chat screen with the coach
   */
  const handleStartSession = () => {
    if (!coach) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/chat/${coach.id}`);
  };

  // Render loading state
  if (isLoading && !coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading coach profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state for invalid/missing coach
  if (!coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Coach Not Found
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {coachId ? 'This coach is no longer available.' : 'No coach ID provided.'}
          </Text>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.errorButton,
              { backgroundColor: '#3B82F6' },
              pressed && { backgroundColor: '#2563EB' },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.errorButtonText, { color: '#FFFFFF' }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header with back button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.backgroundTertiary },
            pressed && styles.buttonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Coach Profile
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach icon section */}
        <CoachIconSection coach={coach} />

        {/* Coach name */}
        <Text style={[styles.name, { color: colors.text }]}>
          {coach.name}
        </Text>

        {/* Coach category */}
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          {coach.category}
        </Text>

        {/* Tags section */}
        {coach.tags && coach.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {coach.tags.map((tag, index) => (
              <View 
                key={index} 
                style={[styles.tag, { backgroundColor: colors.backgroundTertiary }]}
              >
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* About section */}
        {coach.about ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {coach.about}
            </Text>
          </View>
        ) : coach.systemPrompt ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
              {extractAboutFromPrompt(coach.systemPrompt)}
            </Text>
          </View>
        ) : null}

        {/* Expectations section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>What to Expect</Text>
          {(coach.expectations && coach.expectations.length > 0) ? (
            coach.expectations.map((expectation, index) => (
              <View key={index} style={styles.expectationRow}>
                <Text style={[styles.expectationBullet, { color: colors.primary || colors.text }]}>•</Text>
                <Text style={[styles.expectationText, { color: colors.textSecondary }]}>
                  {expectation}
                </Text>
              </View>
            ))
          ) : (
            getDefaultExpectations(coach.category).map((expectation, index) => (
              <View key={index} style={styles.expectationRow}>
                <Text style={[styles.expectationBullet, { color: colors.primary || colors.text }]}>•</Text>
                <Text style={[styles.expectationText, { color: colors.textSecondary }]}>
                  {expectation}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Footer with Start Session button */}
      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleStartSession}
          style={[
            styles.startButton,
            { backgroundColor: '#3B82F6' },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Start coaching session"
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
            Start Coaching Session
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 56,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  category: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  sectionBody: {
    fontSize: 15,
    lineHeight: 24,
  },
  expectationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  expectationBullet: {
    fontSize: 18,
    lineHeight: 22,
    marginRight: 10,
    fontWeight: '600',
  },
  expectationText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  startButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
