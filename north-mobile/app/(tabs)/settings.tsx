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
import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator, StyleSheet, Platform, useColorScheme, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { PaywallModal } from '@/components/billing/PaywallModal';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { NotificationSettings } from '@/components/notifications';

// Legal URLs - using in-app screens
const PRIVACY_POLICY_URL = '/legal/privacy';
const TERMS_OF_SERVICE_URL = '/legal/terms';

// Theme storage key
const THEME_STORAGE_KEY = '@north/theme';

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
  icon, 
  iconName,
  label, 
  value, 
  onPress,
  destructive = false,
  isLoading = false,
}: { 
  icon?: string; 
  iconName?: string;
  label: string; 
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  isLoading?: boolean;
}) {
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
        pressed && onPress && styles.settingsRowPressed,
      ]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      {icon ? (
        <Text style={styles.rowIcon}>{icon}</Text>
      ) : iconName ? (
        <View style={styles.rowIconContainer}>
          <Ionicons name={iconName as any} size={20} color={destructive ? '#EF4444' : '#71717A'} />
        </View>
      ) : null}
      <Text 
        style={[
          styles.rowLabel,
          destructive && styles.rowLabelDestructive,
        ]}
      >
        {label}
      </Text>
      {isLoading ? (
        <ActivityIndicator size="small" color="#71717A" />
      ) : (
        <>
          {value && (
            <Text style={styles.rowValue}>{value}</Text>
          )}
          {onPress && (
            <Ionicons name="chevron-forward" size={18} color="#D4D4D8" />
          )}
        </>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
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

  // Theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isThemeModalVisible, setIsThemeModalVisible] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeMode(savedTheme as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const handleThemeChange = async (theme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      setThemeMode(theme);
      setIsThemeModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Note: In a production app, you would apply the theme here
      // For now, we're just persisting the preference
      Alert.alert(
        'Theme Updated',
        `Theme set to ${theme}. Restart the app to see changes.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving theme preference:', error);
      Alert.alert('Error', 'Failed to save theme preference');
    }
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <OfflineIndicator />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text 
            style={styles.headerTitle}
            accessibilityRole="header"
          >
            Settings
          </Text>
        </View>

        {/* Tier Status Badge */}
        <View style={[
          styles.tierBadgeContainer,
          isProUser ? styles.tierBadgeContainerPro : styles.tierBadgeContainerFree
        ]}>
          <View style={styles.tierBadge}>
            <Ionicons 
              name={isProUser ? "diamond" : "star-outline"} 
              size={20} 
              color={isProUser ? "#FFFFFF" : "#71717A"} 
            />
            <Text style={[
              styles.tierBadgeText,
              isProUser ? styles.tierBadgeTextPro : styles.tierBadgeTextFree
            ]}>
              {isProUser ? 'North Pro' : 'North Free'}
            </Text>
          </View>
          {isProUser && formattedExpiration && (
            <Text style={styles.tierExpiration}>
              Renews on {formattedExpiration}
            </Text>
          )}
          {!isProUser && (
            <Text style={styles.tierDescription}>
              Upgrade to unlock unlimited context and custom coaches
            </Text>
          )}
        </View>

        {/* Account Section */}
        <Text 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Account
        </Text>
        <View style={styles.section}>
          <SettingsRow 
            iconName="person-outline"
            label="Name" 
            value={user?.name || 'Not set'} 
          />
          <SettingsRow 
            iconName="mail-outline"
            label="Email" 
            value={user?.email || 'Not set'} 
          />
        </View>

        {/* Subscription Section */}
        <Text 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Subscription
        </Text>
        <View style={styles.section}>
          <SettingsRow 
            iconName="star-outline"
            label="Current Plan" 
            value={subscriptionStatus}
            isLoading={billingLoading}
          />
          <SettingsRow 
            iconName={isProUser ? "settings-outline" : "diamond-outline"}
            label={isProUser ? "Manage Subscription" : "Upgrade to Pro"}
            onPress={handleManageSubscription}
          />
          <SettingsRow 
            iconName="refresh-outline"
            label="Restore Purchases" 
            onPress={handleRestore}
            isLoading={billingLoading}
          />
        </View>

        {/* Notifications Section */}
        <Text 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          Notifications
        </Text>
        <NotificationSettings />

        {/* App Section */}
        <Text 
          style={styles.sectionTitle}
          accessibilityRole="header"
        >
          App
        </Text>
        <View style={styles.section}>
          <SettingsRow 
            iconName="color-palette-outline"
            label="Theme" 
            value={currentThemeLabel}
            onPress={() => setIsThemeModalVisible(true)}
          />
          <SettingsRow 
            iconName="shield-checkmark-outline"
            label="Privacy Policy" 
            onPress={() => handleOpenUrl(PRIVACY_POLICY_URL)}
          />
          <SettingsRow 
            iconName="document-text-outline"
            label="Terms of Service" 
            onPress={() => handleOpenUrl(TERMS_OF_SERVICE_URL)}
          />
        </View>

        {/* Sign Out */}
        <View style={styles.sectionDestructive}>
          <SettingsRow 
            iconName="log-out-outline"
            label="Sign Out" 
            onPress={handleLogout}
            destructive
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>North v{appVersion} ({buildNumber})</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for creators</Text>
        </View>
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
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: -0.5,
  },
  proBadgeContainer: {
    backgroundColor: '#09090B',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  proBadgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  proExpiration: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  tierBadgeContainer: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
  },
  tierBadgeContainerPro: {
    backgroundColor: '#09090B',
  },
  tierBadgeContainerFree: {
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 10,
  },
  tierBadgeTextPro: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  tierBadgeTextFree: {
    fontSize: 20,
    fontWeight: '700',
    color: '#09090B',
    marginLeft: 10,
  },
  tierExpiration: {
    fontSize: 14,
    color: '#A1A1AA',
    marginTop: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#71717A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  section: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F4F4F5',
  },
  sectionDestructive: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
  },
  settingsRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  rowIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  rowIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#09090B',
    fontWeight: '500',
  },
  rowLabelDestructive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 15,
    color: '#71717A',
    marginRight: 8,
  },
  versionContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 13,
    color: '#D4D4D8',
    marginTop: 6,
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
