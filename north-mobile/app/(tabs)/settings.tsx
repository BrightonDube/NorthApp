/**
 * Settings Screen
 * 
 * Allows users to manage their account, subscription, and app preferences.
 * Integrates with RevenueCat for subscription management.
 * 
 * Features:
 * - Display subscription status (Free or Pro)
 * - Manage Subscription button (opens PaywallModal or native subscription management)
 * - Restore Purchases button
 * - Logout button with confirmation dialog
 * - Theme toggle (light/dark/system) using React Native Appearance API
 * - Display app version and build number
 * - Links to Privacy Policy and Terms of Service
 * - Haptic feedback and accessibility labels
 * - Dark mode support
 * 
 * Validates: Requirements 15.1-15.4, 20.6
 */

import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator, StyleSheet, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { PaywallModal } from '@/components/billing/PaywallModal';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { NotificationSettings } from '@/components/notifications';
import { useTheme as useThemeContext, useThemeColors, useIsDark } from '@/contexts/ThemeContext';

// Legal URLs - using in-app screens
const PRIVACY_POLICY_URL = '/legal/privacy';
const TERMS_OF_SERVICE_URL = '/legal/terms';

// Theme options
type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/**
 * Theme Selection Modal Component
 */
function ThemeModal({
  visible,
  currentTheme,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentTheme: ThemeMode;
  onSelect: (theme: ThemeMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close theme selection"
      >
        <View style={styles.themeModal}>
          <Text 
            style={styles.themeModalTitle}
            accessibilityRole="header"
          >
            Choose Theme
          </Text>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option.value);
              }}
              style={({ pressed }) => [
                styles.themeOption,
                pressed && styles.themeOptionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${option.label} theme`}
            >
              <View style={styles.themeOptionLeft}>
                <Ionicons name={option.icon as any} size={22} color="#09090B" />
                <Text style={styles.themeOptionLabel}>{option.label}</Text>
              </View>
              {currentTheme === option.value && (
                <Ionicons name="checkmark-circle" size={22} color="#09090B" />
              )}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Settings Row Component
 */
function SettingsRow({ 
  label, 
  value, 
  onPress,
  isLoading = false,
}: { 
  label: string; 
  value?: string;
  onPress?: () => void;
  isLoading?: boolean;
}) {
  const colors = useThemeColors();
  
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress || isLoading}
      style={({ pressed }) => [
        styles.settingsRow,
        { 
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
        pressed && onPress && { backgroundColor: colors.backgroundSecondary },
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      {/* Label Section - Left Aligned */}
      <View style={styles.rowLabelSection}>
        <Text 
          style={[styles.rowLabel, { color: colors.text }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* Value Section - Right Aligned */}
      <View style={styles.rowValueSection}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.textTertiary} />
        ) : (
          <>
            {value && (
              <Text 
                style={[styles.rowValue, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {value}
              </Text>
            )}
            {onPress && (
              <Ionicons 
                name="chevron-forward" 
                size={18} 
                color={colors.textTertiary} 
                style={{ marginLeft: 8 }} 
              />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { themeMode, setTheme: setThemeMode } = useThemeContext();
  const { user, logout } = useAuthStore();
  const { 
    isProUser, 
    entitlements, 
    isLoading: billingLoading,
    showPaywall,
    restorePurchases,
    isPaywallVisible,
    hidePaywall,
  } = useBillingStore();

  // Theme modal state
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  const handleThemeChange = async (theme: ThemeMode) => {
    await setThemeMode(theme);
    setIsThemeModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (isProUser) {
      // For Pro users, open native subscription management
      Alert.alert(
        'Manage Subscription',
        'Would you like to manage your subscription?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              const url = Platform.select({
                ios: 'https://apps.apple.com/account/subscriptions',
                android: 'https://play.google.com/store/account/subscriptions',
              });
              if (url) {
                Linking.openURL(url).catch(() => {
                  Alert.alert('Error', 'Could not open subscription settings');
                });
              }
            },
          },
        ]
      );
    } else {
      // For free users, show paywall
      showPaywall('settings');
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
  };

  const handleOpenUrl = async (url: string) => {
    try {
      // Check if it's an internal route
      if (url.startsWith('/legal/')) {
        router.push(url as any);
      } else {
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the link');
    }
  };

  // Format subscription status
  const subscriptionStatus = isProUser ? 'Pro' : 'Free';
  const expirationDate = entitlements?.pro?.expirationDate;
  const formattedExpiration = expirationDate 
    ? new Date(expirationDate).toLocaleDateString() 
    : null;

  // Get app version and build number
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Platform.select({
    ios: Constants.expoConfig?.ios?.buildNumber || '1',
    android: Constants.expoConfig?.android?.versionCode?.toString() || '1',
  });

  // Get current theme label
  const currentThemeLabel = THEME_OPTIONS.find(opt => opt.value === themeMode)?.label || 'System';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <OfflineIndicator />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text 
            style={[styles.headerTitle, { color: colors.text }]}
            accessibilityRole="header"
          >
            Settings
          </Text>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow 
            label="Name" 
            value={user?.name || 'Not set'} 
          />
          <SettingsRow 
            label="Email" 
            value={user?.email || 'Not set'} 
          />
        </View>

        {/* Subscription Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow 
            label="Current Plan" 
            value={subscriptionStatus}
            isLoading={billingLoading}
          />
          <SettingsRow 
            label={isProUser ? "Manage Subscription" : "Upgrade to Pro"}
            onPress={handleManageSubscription}
          />
          <SettingsRow 
            label="Restore Purchases" 
            onPress={handleRestore}
            isLoading={billingLoading}
          />
        </View>

        {/* Reports Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow 
            label="Session Reports" 
            onPress={() => router.push('/report' as any)}
          />
        </View>

        {/* Notifications Section */}
        <NotificationSettings />

        {/* App Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsRow 
            label="Theme" 
            value={currentThemeLabel}
            onPress={() => setIsThemeModalVisible(true)}
          />
          <SettingsRow 
            label="Privacy Policy" 
            onPress={() => handleOpenUrl(PRIVACY_POLICY_URL)}
          />
          <SettingsRow 
            label="Terms of Service" 
            onPress={() => handleOpenUrl(TERMS_OF_SERVICE_URL)}
          />
          <SettingsRow 
            label="Version" 
            value={`${appVersion} (${buildNumber})`}
          />
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          style={[styles.signOutButton, { backgroundColor: colors.card }]}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      {/* Theme Selection Modal */}
      <ThemeModal
        visible={isThemeModalVisible}
        currentTheme={themeMode}
        onSelect={handleThemeChange}
        onClose={() => setIsThemeModalVisible(false)}
      />

      {/* Paywall Modal */}
      <PaywallModal
        visible={isPaywallVisible}
        feature="settings"
        onClose={hidePaywall}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabelSection: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowValueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  rowValue: {
    fontSize: 15,
    textAlign: 'right',
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Theme Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  themeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  themeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#09090B',
    marginBottom: 20,
    textAlign: 'center',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  themeOptionPressed: {
    backgroundColor: '#F4F4F5',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeOptionLabel: {
    fontSize: 16,
    color: '#09090B',
    marginLeft: 14,
    fontWeight: '500',
  },
});
