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
  useColorScheme,
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
  const colorScheme = useColorScheme();
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

  // Focus indicator color
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, colorScheme === 'dark' && styles.containerDark]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#FFFFFF' : '#09090B'} />
          <Text style={[styles.loadingText, colorScheme === 'dark' && styles.loadingTextDark]}>
            Loading coach details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !coach) {
    return (
      <SafeAreaView style={[styles.container, colorScheme === 'dark' && styles.containerDark]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorTitle, colorScheme === 'dark' && styles.errorTitleDark]}>
            Unable to Load Coach
          </Text>
          <Text style={[styles.errorMessage, colorScheme === 'dark' && styles.errorMessageDark]}>
            {error || 'This coach is no longer available.'}
          </Text>
          <Pressable
            onPress={handleCancel}
            style={({ pressed, focused }) => [
              styles.errorButton,
              colorScheme === 'dark' && styles.errorButtonDark,
              pressed && styles.buttonPressed,
              focused && { borderWidth: 2, borderColor: focusColor },
            ]}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.errorButtonText, colorScheme === 'dark' && styles.errorButtonTextDark]}>
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
    <SafeAreaView style={[styles.container, colorScheme === 'dark' && styles.containerDark]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, colorScheme === 'dark' && styles.headerDark]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed, focused }) => [
            styles.closeButton,
            colorScheme === 'dark' && styles.closeButtonDark,
            pressed && styles.buttonPressed,
            focused && { borderWidth: 2, borderColor: focusColor },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close preview"
        >
          <Ionicons 
            name="close" 
            size={24} 
            color={colorScheme === 'dark' ? '#A1A1AA' : '#71717A'} 
          />
        </Pressable>
        <Text style={[styles.headerTitle, colorScheme === 'dark' && styles.headerTitleDark]}>
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
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{coach.icon}</Text>
        </View>

        {/* Coach Name */}
        <Text style={[styles.name, colorScheme === 'dark' && styles.nameDark]}>
          {coach.name}
        </Text>

        {/* Creator Info */}
        <Text style={[styles.creator, colorScheme === 'dark' && styles.creatorDark]}>
          by {coach.creatorName}
        </Text>

        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{categoryDisplay}</Text>
        </View>

        {/* Creation Date */}
        <Text style={[styles.date, colorScheme === 'dark' && styles.dateDark]}>
          Created {createdDate}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, colorScheme === 'dark' && styles.dividerDark]} />

        {/* Description Section */}
        <Text style={[styles.sectionTitle, colorScheme === 'dark' && styles.sectionTitleDark]}>
          About This Coach
        </Text>
        <Text style={[styles.description, colorScheme === 'dark' && styles.descriptionDark]}>
          {coach.systemPrompt}
        </Text>

        {/* Already Installed Notice */}
        {alreadyInstalled && (
          <View style={[styles.notice, colorScheme === 'dark' && styles.noticeDark]}>
            <Text style={styles.noticeIcon}>✓</Text>
            <Text style={[styles.noticeText, colorScheme === 'dark' && styles.noticeTextDark]}>
              You already have this coach installed
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, colorScheme === 'dark' && styles.footerDark]}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed, focused }) => [
            styles.cancelButton,
            colorScheme === 'dark' && styles.cancelButtonDark,
            pressed && styles.buttonPressed,
            focused && { borderWidth: 2, borderColor: focusColor },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelButtonText, colorScheme === 'dark' && styles.cancelButtonTextDark]}>
            Cancel
          </Text>
        </Pressable>

        <Pressable
          onPress={handleInstall}
          disabled={installing}
          style={({ pressed, focused }) => [
            styles.installButton,
            colorScheme === 'dark' && styles.installButtonDark,
            installing && styles.installButtonDisabled,
            pressed && !installing && styles.buttonPressed,
            focused && { borderWidth: 2, borderColor: focusColor },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={alreadyInstalled ? 'Open coach' : 'Install coach'}
          accessibilityState={{ disabled: installing }}
        >
          {installing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.installButtonText}>
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
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#09090B',
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
  headerDark: {
    borderBottomColor: '#27272A',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F4F4F5',
  },
  closeButtonDark: {
    backgroundColor: '#18181B',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B',
  },
  headerTitleDark: {
    color: '#FAFAFA',
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
    backgroundColor: '#F4F4F5',
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
    color: '#09090B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  nameDark: {
    color: '#FAFAFA',
  },
  creator: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 16,
  },
  creatorDark: {
    color: '#A1A1AA',
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
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 24,
  },
  dateDark: {
    color: '#71717A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E4E7',
    marginVertical: 24,
  },
  dividerDark: {
    backgroundColor: '#27272A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#FAFAFA',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#52525B',
    marginBottom: 24,
  },
  descriptionDark: {
    color: '#D4D4D8',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  noticeDark: {
    backgroundColor: '#14532D',
  },
  noticeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  noticeTextDark: {
    color: '#BBF7D0',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  footerDark: {
    borderTopColor: '#27272A',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDark: {
    backgroundColor: '#18181B',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#09090B',
  },
  cancelButtonTextDark: {
    color: '#FAFAFA',
  },
  installButton: {
    flex: 2,
    backgroundColor: '#09090B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  installButtonDark: {
    backgroundColor: '#FAFAFA',
  },
  installButtonDisabled: {
    backgroundColor: '#D4D4D8',
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#71717A',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingTextDark: {
    color: '#A1A1AA',
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
    color: '#09090B',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorTitleDark: {
    color: '#FAFAFA',
  },
  errorMessage: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorMessageDark: {
    color: '#A1A1AA',
  },
  errorButton: {
    backgroundColor: '#09090B',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  errorButtonDark: {
    backgroundColor: '#FAFAFA',
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorButtonTextDark: {
    color: '#09090B',
  },
});
