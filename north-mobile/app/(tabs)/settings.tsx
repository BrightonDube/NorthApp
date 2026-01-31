/**
 * Settings Screen
 * 
 * Allows users to manage their account, subscription, and app preferences.
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Settings Row Component
 */
function SettingsRow({ 
  icon, 
  label, 
  value, 
  onPress,
  destructive = false,
}: { 
  icon: string; 
  label: string; 
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <Text style={{ fontSize: 20, marginRight: 12 }}>{icon}</Text>
      <Text 
        style={{ 
          flex: 1, 
          fontSize: 16, 
          color: destructive ? '#EF4444' : '#374151',
          fontWeight: destructive ? '600' : '400',
        }}
      >
        {label}
      </Text>
      {value && (
        <Text style={{ fontSize: 14, color: '#9CA3AF' }}>{value}</Text>
      )}
      {onPress && (
        <Text style={{ fontSize: 16, color: '#9CA3AF', marginLeft: 8 }}>→</Text>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

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
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>
            Settings
          </Text>
        </View>

        {/* Account Section */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>
          Account
        </Text>
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 }}>
          <SettingsRow 
            icon="👤" 
            label="Profile" 
            value={user?.name || 'Not set'} 
          />
          <SettingsRow 
            icon="✉️" 
            label="Email" 
            value={user?.email || 'Not set'} 
          />
        </View>

        {/* Subscription Section */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>
          Subscription
        </Text>
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 }}>
          <SettingsRow 
            icon="⭐" 
            label="Current Plan" 
            value="Free" 
          />
          <SettingsRow 
            icon="💎" 
            label="Upgrade to Pro" 
            onPress={() => console.log('Open paywall')}
          />
        </View>

        {/* App Section */}
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>
          App
        </Text>
        <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, marginBottom: 24 }}>
          <SettingsRow 
            icon="🌙" 
            label="Theme" 
            value="System" 
          />
          <SettingsRow 
            icon="📄" 
            label="Privacy Policy" 
            onPress={() => console.log('Open privacy policy')}
          />
          <SettingsRow 
            icon="📋" 
            label="Terms of Service" 
            onPress={() => console.log('Open terms')}
          />
        </View>

        {/* Sign Out */}
        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 12, paddingHorizontal: 16 }}>
          <SettingsRow 
            icon="🚪" 
            label="Sign Out" 
            onPress={handleLogout}
            destructive
          />
        </View>

        {/* App Version */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
            North v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
