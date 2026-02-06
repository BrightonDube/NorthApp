/**
 * Tabs Layout
 * 
 * Main navigation layout for authenticated users.
 * Uses bottom tab navigation with Home, Context, and Settings tabs.
 * 
 * Performance optimization: Tabs are lazy-loaded to improve cold start time.
 * Animations: Subtle fade transitions between tabs (< 200ms)
 * 
 * Validates: Requirements 13.7, 20.1 (App Startup Optimization), 19.7 (Animations)
 */

import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Tab icon component
 */
function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? '#3B82F6' : '#9CA3AF',
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 80,
          paddingBottom: 20,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
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
    </Tabs>
  );
}
