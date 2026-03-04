/**
 * Home Screen (Coach Marketplace)
 * 
 * Displays all available coaches for the user to browse and chat with.
 * Implements Simon's brief: "Browse, download, create, and share AI coaches"
 * 
 * Design: "Beautiful, minimal, clean" - Premium feel, not "techy"
 * 
 * Features:
 * - App logo/branding in header
 * - 2-column grid layout using CoachGrid component
 * - Clear labels and descriptions for each coach
 * - Floating action button for creating coaches (Pro feature)
 * - Pull-to-refresh functionality
 * - Navigation to chat on coach tap
 * - Long-press to edit user coaches
 * - Pro upgrade prompt for free users
 * - Pro features unlocked display
 * - Empty state handling
 * - Target: Load within 2 seconds on cold start
 * 
 * Validates: Requirements 6.2, 6.3, 13.1-13.7
 */

import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import { useBillingStore } from '@/stores/billingStore';
import { CoachGrid, CoachCreateModal, CoachEditModal } from '@/components/coach';
import { PaywallModal } from '@/components/billing/PaywallModal';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { CoachGridSkeleton } from '@/components/SkeletonLoader';
import { useTheme, useIsDark, useThemeColors } from '@/contexts/ThemeContext';
import type { Coach } from '@/types';

/**
 * Back Button Component for header
 */
function HeaderBackButton() {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => router.back()}
      style={styles.headerBackButton}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </Pressable>
  );
}

/**
 * Pro Badge Component
 */
function ProBadge() {
  const colors = useThemeColors();
  
  return (
    <View style={[styles.proBadge, { backgroundColor: colors.text }]}>
      <Ionicons name="diamond" size={12} color={colors.background} />
      <Text style={[styles.proBadgeText, { color: colors.background }]}>PRO</Text>
    </View>
  );
}

/**
 * Pro Features Banner
 * Shows for 20 minutes after upgrade, then hides permanently
 */
function ProFeaturesBanner() {
  const colors = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);
  const { lastUpgradeTime } = useBillingStore();
  
  useEffect(() => {
    // Check if user upgraded recently (within 20 minutes)
    if (lastUpgradeTime) {
      const twentyMinutes = 20 * 60 * 1000;
      const timeSinceUpgrade = Date.now() - lastUpgradeTime;
      if (timeSinceUpgrade < twentyMinutes) {
        setIsVisible(true);
        // Auto-hide after remaining time
        const remainingTime = twentyMinutes - timeSinceUpgrade;
        setTimeout(() => setIsVisible(false), remainingTime);
      }
    }
  }, [lastUpgradeTime]);
  
  if (!isVisible) return null;
  
  return (
    <View style={[styles.proFeaturesBanner, { 
      backgroundColor: colors.backgroundSecondary, 
      borderColor: colors.border 
    }]}>
      <View style={styles.proFeaturesHeader}>
        <Ionicons name="diamond" size={20} color={colors.primary} />
        <Text style={[styles.proFeaturesTitle, { color: colors.text }]}>Pro Features Unlocked</Text>
      </View>
      <View style={styles.proFeaturesList}>
        <View style={styles.proFeatureItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Unlimited context items</Text>
        </View>
        <View style={styles.proFeatureItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Create custom coaches</Text>
        </View>
        <View style={styles.proFeatureItem}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={[styles.proFeatureText, { color: colors.textSecondary }]}>Priority AI responses</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Section Header Component
 * With subtitle for clarity
 */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const colors = useThemeColors();
  
  return (
    <View style={styles.sectionHeader}>
      <Text 
        style={[styles.sectionTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

/**
 * Create Coach Button (Pro Feature)
 * Simplified: solid background, no dashed border, cleaner design
 */
function CreateCoachButton({ onPress, isProUser }: { onPress: () => void; isProUser: boolean }) {
  const colors = useThemeColors();
  
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.createButton,
        { backgroundColor: colors.backgroundTertiary },
        pressed && styles.createButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Create custom coach"
      accessibilityHint="Opens coach creation modal (Pro feature)"
    >
      <View style={[styles.createIconContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="add" size={28} color={colors.text} />
      </View>
      <View style={styles.createContent}>
        <Text style={[styles.createTitle, { color: colors.text }]}>Create Custom Coach</Text>
        <Text style={[styles.createSubtitle, { color: colors.textTertiary }]}>
          {isProUser ? 'Design your own AI advisor' : 'Upgrade to Pro to unlock'}
        </Text>
      </View>
      {!isProUser && (
        <View style={[styles.createLockBadge, { backgroundColor: colors.backgroundTertiary }]}>
          <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
        </View>
      )}
    </Pressable>
  );
}

/**
 * Empty State Component
 */
function EmptyState() {
  const colors = useThemeColors();
  
  return (
    <View 
      style={styles.emptyState}
      accessible
      accessibilityRole="text"
      accessibilityLabel="No coaches available. Pull to refresh or check your connection."
    >
      <Text style={styles.emptyIcon}>🎯</Text>
      <Text 
        style={[styles.emptyTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        No coaches available
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>Pull to refresh or check your connection</Text>
    </View>
  );
}

/**
 * Error State Component
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useThemeColors();
  
  return (
    <View 
      style={styles.emptyState}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text 
        style={[styles.emptyTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        Something went wrong
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>{message}</Text>
      <Pressable 
        onPress={onRetry} 
        style={[styles.retryButton, { backgroundColor: colors.text }]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading coaches"
      >
        <Text style={[styles.retryText, { color: colors.background }]}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { 
    coaches, 
    isLoading, 
    error, 
    fetchCoaches,
    getDefaultCoaches,
    getUserCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
    clearError,
    lastSynced,
  } = useCoachStore();
  
  const { isProUser, isPaywallVisible, paywallFeature, hidePaywall } = useBillingStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  // Fetch coaches on mount (skip if already loaded from parallel initialization)
  useEffect(() => {
    // Only fetch if we don't have coaches yet or if data is stale
    if (coaches.length === 0 || !lastSynced) {
      fetchCoaches();
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    clearError();
    await fetchCoaches();
    setRefreshing(false);
  }, [fetchCoaches, clearError]);

  const handleCoachPress = (coach: Coach) => {
    // Go directly to chat — no intermediate profile screen
    router.push(`/chat/${coach.id}`);
  };

  const handleCoachLongPress = (coach: Coach) => {
    // Only allow editing user's own coaches
    if (coach.creatorId === user?.id) {
      setSelectedCoach(coach);
      setIsEditModalVisible(true);
    }
  };

  const handleCreateCoach = () => {
    // Check Pro access
    if (!isProUser) {
      // Paywall will be shown via billingStore
      useBillingStore.getState().showPaywall('coach_creation');
      return;
    }
    setIsCreateModalVisible(true);
  };

  const handleCreateSubmit = async (name: string, icon: string, systemPrompt: string) => {
    await createCoach(name, icon, systemPrompt, undefined, isProUser);
    setIsCreateModalVisible(false);
  };

  const handleEditSubmit = async (id: string, updates: { name?: string; icon?: string; systemPrompt?: string }) => {
    await updateCoach(id, updates);
    setIsEditModalVisible(false);
    setSelectedCoach(null);
  };

  const handleDeleteCoach = async (id: string) => {
    await deleteCoach(id);
    setIsEditModalVisible(false);
    setSelectedCoach(null);
  };

  // Separate coaches by type
  const defaultCoaches = getDefaultCoaches();
  const myCoaches = user?.id ? getUserCoaches(user.id) : [];

  // Show loading state on initial load
  if (isLoading && coaches.length === 0 && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.borderSecondary }]}>
          <HeaderBackButton />
          {isProUser && <ProBadge />}
        </View>
        <View style={styles.headerSection}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Coaches</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Choose a coach to start your session
          </Text>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CoachGridSkeleton count={4} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineIndicator />
      
      {/* Fixed Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSecondary }]}>
        <HeaderBackButton />
        {isProUser && <ProBadge />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text 
            style={[styles.headerTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            AI Coaches
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textTertiary }]}>
            Choose a coach to start your session
          </Text>
        </View>

        {/* Pro Features Banner - show if Pro user */}
        {isProUser && <ProFeaturesBanner />}

        {/* Error State */}
        {error && coaches.length === 0 ? (
          <ErrorState message={error} onRetry={onRefresh} />
        ) : (
          <>
            {/* Default Coaches Section */}
            {defaultCoaches.length > 0 && (
              <View style={styles.section}>
                <CoachGrid
                  coaches={defaultCoaches}
                  onCoachPress={handleCoachPress}
                  testID="default-coaches-grid"
                />
              </View>
            )}

            {/* User's Custom Coaches Section */}
            {myCoaches.length > 0 && (
              <View style={styles.section}>
                <SectionHeader 
                  title="My Custom Coaches" 
                  subtitle="Long press to edit"
                />
                <CoachGrid
                  coaches={myCoaches}
                  onCoachPress={handleCoachPress}
                  onCoachLongPress={handleCoachLongPress}
                  testID="my-coaches-grid"
                />
              </View>
            )}

            {/* Empty State */}
            {coaches.length === 0 && !isLoading && <EmptyState />}

            {/* Goals Quick Access */}
            <View style={styles.section}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/goals');
                }}
                style={({ pressed }) => [
                  styles.createButton,
                  { backgroundColor: colors.backgroundTertiary },
                  pressed && styles.createButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="View goals"
              >
                <View style={[styles.createIconContainer, { backgroundColor: colors.card }]}>
                  <Text style={{ fontSize: 24 }}>🎯</Text>
                </View>
                <View style={styles.createContent}>
                  <Text style={[styles.createTitle, { color: colors.text }]}>My Goals</Text>
                  <Text style={[styles.createSubtitle, { color: colors.textTertiary }]}>
                    Track progress & AI-powered planning
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* Create Coach Button */}
            <View style={styles.section}>
              <CreateCoachButton onPress={handleCreateCoach} isProUser={isProUser} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Coach Creation Modal */}
      <CoachCreateModal
        visible={isCreateModalVisible}
        onCreate={handleCreateSubmit}
        onClose={() => setIsCreateModalVisible(false)}
      />

      {/* Coach Edit Modal */}
      {selectedCoach && (
        <CoachEditModal
          visible={isEditModalVisible}
          coach={selectedCoach}
          onSave={handleEditSubmit}
          onDelete={handleDeleteCoach}
          onClose={() => {
            setIsEditModalVisible(false);
            setSelectedCoach(null);
          }}
        />
      )}

      {/* Paywall Modal */}
      <PaywallModal
        visible={isPaywallVisible}
        feature={paywallFeature || 'coach_creation'}
        onClose={hidePaywall}
      />
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  proFeaturesBanner: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
  },
  proFeaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  proFeaturesTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  proFeaturesList: {
    gap: 8,
  },
  proFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proFeatureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  createButton: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonPressed: {
    opacity: 0.8,
  },
  createIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createContent: {
    flex: 1,
  },
  createTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  createSubtitle: {
    fontSize: 14,
  },
  createLockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 48,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
