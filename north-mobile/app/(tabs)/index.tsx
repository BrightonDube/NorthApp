/**
 * Home Screen (Coach Marketplace)
 * 
 * Displays all available coaches for the user to browse and chat with.
 * Implements Simon's brief: "Browse, download, create, and share AI coaches"
 * 
 * Design: "Beautiful, minimal, clean" - Premium feel, not "techy"
 * 
 * Validates: Requirements 6.2, 6.3, 13.1
 */

import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import { CoachCard } from '@/components/coach';
import type { Coach } from '@/types';

/**
 * Section Header Component
 */
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Create Coach Button (Pro Feature)
 */
function CreateCoachButton({ onPress }: { onPress: () => void }) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.createButton,
        pressed && styles.createButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Create custom coach"
      accessibilityHint="Opens coach creation modal (Pro feature)"
    >
      <View style={styles.createIconContainer}>
        <Text style={styles.createIcon}>+</Text>
      </View>
      <View style={styles.createContent}>
        <Text style={styles.createTitle}>Create Custom Coach</Text>
        <Text style={styles.createSubtitle}>Pro Feature</Text>
      </View>
    </Pressable>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text style={styles.emptyTitle}>No coaches available</Text>
      <Text style={styles.emptySubtitle}>Pull to refresh or check your connection</Text>
    </View>
  );
}

/**
 * Error State Component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    coaches, 
    isLoading, 
    error, 
    fetchCoaches,
    getDefaultCoaches,
    getUserCoaches,
    clearError,
  } = useCoachStore();
  
  const [refreshing, setRefreshing] = useState(false);

  // Fetch coaches on mount
  useEffect(() => {
    fetchCoaches();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    await fetchCoaches();
    setRefreshing(false);
  }, [fetchCoaches, clearError]);

  const handleCoachPress = (coach: Coach) => {
    // Navigate to chat screen with coach ID
    router.push(`/chat/${coach.id}`);
  };

  const handleCreateCoach = () => {
    // TODO: Open coach creation modal or show paywall
    console.log('Create coach pressed - TODO: implement modal');
  };

  // Separate coaches by type
  const defaultCoaches = getDefaultCoaches();
  const myCoaches = user?.id ? getUserCoaches(user.id) : [];

  // Show loading state on initial load
  if (isLoading && coaches.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#09090B" />
          <Text style={styles.loadingText}>Loading coaches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#09090B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Friend'}</Text>
        </View>

        {/* Error State */}
        {error && coaches.length === 0 ? (
          <ErrorState message={error} onRetry={onRefresh} />
        ) : (
          <>
            {/* Default Coaches Section */}
            {defaultCoaches.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="Your Board of Directors" count={defaultCoaches.length} />
                {defaultCoaches.map((coach) => (
                  <CoachCard
                    key={coach.id}
                    coach={coach}
                    onPress={() => handleCoachPress(coach)}
                    testID={`coach-card-${coach.id}`}
                  />
                ))}
              </View>
            )}

            {/* User's Custom Coaches Section */}
            {myCoaches.length > 0 && (
              <View style={styles.section}>
                <SectionHeader title="My Coaches" count={myCoaches.length} />
                {myCoaches.map((coach) => (
                  <CoachCard
                    key={coach.id}
                    coach={coach}
                    onPress={() => handleCoachPress(coach)}
                    testID={`coach-card-${coach.id}`}
                  />
                ))}
              </View>
            )}

            {/* Empty State */}
            {coaches.length === 0 && !isLoading && <EmptyState />}

            {/* Create Coach Button */}
            <View style={styles.section}>
              <CreateCoachButton onPress={handleCreateCoach} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#71717A',
  },
  header: {
    marginTop: 16,
    marginBottom: 28,
  },
  greeting: {
    fontSize: 15,
    color: '#71717A',
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#09090B',
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717A',
  },
  createButton: {
    borderWidth: 2,
    borderColor: '#E4E4E7',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonPressed: {
    backgroundColor: '#F4F4F5',
  },
  createIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F4F4F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  createIcon: {
    fontSize: 24,
    color: '#71717A',
  },
  createContent: {
    flex: 1,
  },
  createTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 2,
  },
  createSubtitle: {
    fontSize: 14,
    color: '#71717A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#09090B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
