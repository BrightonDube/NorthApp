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
              { backgroundColor: colors.text },
              pressed && styles.buttonPressed,
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.errorButtonText, { color: colors.background }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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

        {/* Placeholder for future sections */}
        <View style={styles.placeholder}>
          <Text style={[styles.placeholderText, { color: colors.textTertiary }]}>
            Additional sections (tags, about, expectations) will be added in subsequent tasks
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Start Session button */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleStartSession}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: colors.text },
            pressed && styles.buttonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Start coaching session"
        >
          <Text style={[styles.startButtonText, { color: colors.background }]}>
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
  placeholder: {
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
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
