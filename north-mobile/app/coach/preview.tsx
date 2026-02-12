/**
 * Coach Preview Screen
 * 
 * Displays full coach details before installation from marketplace or deep link.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Full-screen modal layout with dismiss gesture
 * - Displays all coach details: name, description, creator, category, date
 * - Install and Cancel buttons
 * - Loading state while fetching coach data
 * - Error state for invalid coaches or network issues
 * - Checks if coach is already installed
 * - Navigates to existing coach if already installed
 * - Haptic feedback on button presses
 * - Respects reduced motion preferences
 * 
 * Validates: Requirements 3.3, 4.1, 4.2, 4.5
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { coachInstaller } from '@/lib/coachInstaller';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import type { PublicCoach } from '@/types';
import { getCategoryColor, getCategoryDisplay } from '@/lib/marketplace.types';
import { useThemeColors } from '@/contexts/ThemeContext';

/**
 * CoachPreviewScreen displays full coach details before installation.
 * 
 * Route parameters:
 * - coachId: The ID of the coach to preview
 * 
 * @example
 * ```tsx
 * // Navigate to preview from marketplace
 * router.push(`/coach/preview?coachId=${coach.id}`);
 * 
 * // Navigate to preview from deep link
 * router.push(`/coach/preview?coachId=${parsedCoachId}`);
 * ```
 */
export default function CoachPreviewScreen() {
  const router = useRouter();
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { fetchCoaches } = useCoachStore();

  // State
  const [coach, setCoach] = useState<PublicCoach | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);
  const [installedCoachId, setInstalledCoachId] = useState<string | null>(null);

  // Fetch coach details on mount
  useEffect(() => {
    if (!coachId) {
      setError('No coach ID provided');
      setLoading(false);
      return;
    }

    fetchCoachDetails();
  }, [coachId]);

  /**
   * Fetch coach details from Supabase
   * Also checks if the user has already installed this coach
   */
  const fetchCoachDetails = async () => {
    if (!coachId || !user?.id) {
      setError('Invalid coach ID or user not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch coach data
      const { data: coachData, error: fetchError } = await supabase
        .from('coaches')
        .select(`
          *,
          creator:creator_id (
            id,
            email
          )
        `)
        .eq('id', coachId)
        .eq('is_public', true)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch coach: ${fetchError.message}`);
      }

      if (!coachData) {
        throw new Error('Coach not found or is not public');
      }

      // Map database fields to PublicCoach interface
      const publicCoach: PublicCoach = {
        id: coachData.id,
        name: coachData.name,
        icon: coachData.icon,
        systemPrompt: coachData.system_prompt,
        creatorId: coachData.creator_id,
        creatorName: coachData.creator?.email?.split('@')[0] || 'Unknown',
        isPublic: coachData.is_public,
        category: coachData.category,
        isFeatured: coachData.is_featured,
        sourceCoachId: coachData.source_coach_id,
        createdAt: coachData.created_at,
        updatedAt: coachData.updated_at,
      };

      setCoach(publicCoach);

      // Check if already installed
      const isInstalled = await coachInstaller.checkIfInstalled(coachId, user.id);
      setAlreadyInstalled(isInstalled);

      if (isInstalled) {
        const existingId = await coachInstaller.getInstalledCoachId(coachId, user.id);
        setInstalledCoachId(existingId);
      }
    } catch (err) {
      console.error('Error fetching coach details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coach details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle Install button press
   * Installs the coach to user's collection and navigates to chat
   */
  const handleInstall = async () => {
    if (!coach || !user?.id) return;

    // If already installed, navigate to existing coach
    if (alreadyInstalled && installedCoachId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace(`/chat/${installedCoachId}`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInstalling(true);

    try {
      // Install the coach
      const installedCoach = await coachInstaller.installCoach(coach.id, user.id);

      // Refresh coaches list
      await fetchCoaches(true);

      // Show success message
      Alert.alert(
        'Coach Installed! 🎉',
        `${coach.name} has been added to your coaches.`,
        [
          {
            text: 'Start Chatting',
            onPress: () => router.replace(`/chat/${installedCoach.id}`),
          },
        ]
      );
    } catch (err) {
      console.error('Error installing coach:', err);
      Alert.alert(
        'Installation Failed',
        err instanceof Error ? err.message : 'Failed to install coach. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setInstalling(false);
    }
  };

  /**
   * Handle Cancel button press
   * Dismisses the preview and returns to previous screen
   */
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading coach details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Unable to Load Coach
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error || 'This coach is no longer available.'}
          </Text>
          <Pressable
            onPress={handleCancel}
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

  // Get category color and display
  const categoryColor = getCategoryColor(coach.category);
  const categoryDisplay = getCategoryDisplay(coach.category);

  // Format creation date
  const createdDate = new Date(coach.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.closeButton,
            { backgroundColor: colors.secondaryBackground },
            pressed && styles.buttonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={colors.textSecondary} 
          />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Coach Preview
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.secondaryBackground }]}>
          <Text style={styles.icon}>{coach.icon}</Text>
        </View>

        {/* Coach Name */}
        <Text style={[styles.name, { color: colors.text }]}>
          {coach.name}
        </Text>

        {/* Creator Info */}
        <Text style={[styles.creator, { color: colors.textSecondary }]}>
          by {coach.creatorName}
        </Text>

        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{categoryDisplay}</Text>
        </View>

        {/* Creation Date */}
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          Created {createdDate}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Description Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          About This Coach
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {coach.systemPrompt}
        </Text>

        {/* Already Installed Notice */}
        {alreadyInstalled && (
          <View style={[styles.notice, { backgroundColor: colors.successBackground }]}>
            <Text style={styles.noticeIcon}>✓</Text>
            <Text style={[styles.noticeText, { color: colors.successText }]}>
              You already have this coach installed
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            { backgroundColor: colors.secondaryBackground },
            pressed && styles.buttonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>
            Cancel
          </Text>
        </Pressable>

        <Pressable
          onPress={handleInstall}
          disabled={installing}
          style={({ pressed }) => [
            styles.installButton,
            { backgroundColor: colors.text },
            installing && { backgroundColor: colors.border },
            pressed && !installing && styles.buttonPressed,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={alreadyInstalled ? 'Open coach' : 'Install coach'}
          accessibilityState={{ disabled: installing }}
        >
          {installing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.installButtonText, { color: colors.background }]}>
              {alreadyInstalled ? 'Open Coach' : 'Install Coach'}
            </Text>
          )}
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
  closeButton: {
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
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
  creator: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noticeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  installButton: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installButtonText: {
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
