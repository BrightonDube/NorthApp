/**
 * Tabs Layout
 * 
 * Main navigation layout for authenticated users.
 * Uses bottom tab navigation with Home, Context, Settings, and Admin tabs.
 * Admin tab is only visible to users with admin privileges.
 * 
 * Performance optimization: Tabs are lazy-loaded to improve cold start time.
 * Animations: Subtle fade transitions between tabs (< 200ms)
 * 
 * Validates: Requirements 13.7, 20.1 (App Startup Optimization), 19.7 (Animations)
 */

import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, useIsDark, useThemeColors } from '@/contexts/ThemeContext';

// Admin email for access control
const ADMIN_EMAIL = 'max@north.app';

/**
 * Tab icon component
 */
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  const colors = useThemeColors();
  
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? colors.primary : colors.textTertiary,
          fontWeight: focused ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const prefersReducedMotion = useReducedMotion();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const isDark = useIsDark();
  
  // Check if user is admin
  const isAdmin = user?.email === ADMIN_EMAIL || user?.isAdmin === true;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 80 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        // Lazy load tabs for better performance
        lazy: true,
        // Subtle fade animation between tabs (< 200ms)
        animation: prefersReducedMotion ? undefined : 'fade',
        // Smooth transition configuration
        animationDuration: 150, // Even faster for tab switches
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: 'Marketplace',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🛍️" label="Marketplace" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="context"
        options={{
          title: 'Context',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📝" label="Context" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🛡️" label="Admin" focused={focused} />
          ),
          // Hide admin tab for non-admin users
          href: isAdmin ? '/admin' : null,
        }}
      />
    </Tabs>
  );
}
