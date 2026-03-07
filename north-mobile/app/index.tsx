/**
 * Root Index - Entry Point
 * 
 * Brief loading screen while auth state is determined.
 * The _layout.tsx handles all routing logic via useProtectedRoute.
 * Includes a safety timeout to prevent permanent spinner.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  // Safety timeout: if stuck on this screen for 5s, force navigate
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(tabs)');
      } else if (!isLoading) {
        router.replace('/(auth)/login');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
}
