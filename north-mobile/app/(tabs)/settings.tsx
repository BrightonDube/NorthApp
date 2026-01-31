/**
 * Settings Screen
 * 
 * Allows users to manage their account, subscription, and app preferences.
 * Integrates with RevenueCat for subscription management.
 * 
 * Validates: Requirements 12.3, 12.6
 */

import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';

// Legal URLs (replace with actual URLs)
const PRIVACY_POLICY_URL = 'https://north.app/privacy';
const TERMS_OF_SERVICE_URL = 'https://north.app/terms';

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
  const { user, logout } = useAuthStore();
  const { 
    isProUser, 
    entitlements, 
    isLoading: billingLoading,
    showPaywall,
    restorePurchases,
  } = useBillingStore();

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

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showPaywall('settings');
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restorePurchases();
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Pro Badge (if subscribed) */}
        {isProUser && (
          <View style={styles.proBadgeContainer}>
            <View style={styles.proBadge}>
              <Ionicons name="diamond" size={20} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>North Pro</Text>
            </View>
            {formattedExpiration && (
              <Text style={styles.proExpiration}>
                Renews on {formattedExpiration}
              </Text>
            )}
          </View>
        )}

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
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
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.section}>
          <SettingsRow 
            iconName="star-outline"
            label="Current Plan" 
            value={subscriptionStatus}
            isLoading={billingLoading}
          />
          {!isProUser && (
            <SettingsRow 
              iconName="diamond-outline"
              label="Upgrade to Pro" 
              onPress={handleUpgrade}
            />
          )}
          <SettingsRow 
            iconName="refresh-outline"
            label="Restore Purchases" 
            onPress={handleRestore}
            isLoading={billingLoading}
          />
        </View>

        {/* App Section */}
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.section}>
          <SettingsRow 
            iconName="moon-outline"
            label="Theme" 
            value="System" 
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
          <Text style={styles.versionText}>North v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for creators</Text>
        </View>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#09090B',
  },
  proBadgeContainer: {
    backgroundColor: '#09090B',
    borderRadius: 16,
    padding: 20,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#F4F4F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionDestructive: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
  },
  settingsRowPressed: {
    opacity: 0.7,
  },
  rowIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  rowIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#09090B',
  },
  rowLabelDestructive: {
    color: '#EF4444',
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 14,
    color: '#71717A',
    marginRight: 4,
  },
  versionContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: '#A1A1AA',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#D4D4D8',
    marginTop: 4,
  },
});
