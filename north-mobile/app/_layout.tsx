import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, setupAuthListener } from '@/stores/authStore';

/**
 * Auth state protection hook
 * Handles routing based on authentication state
 */
function useProtectedRoute() {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAuthCallback = segments[0] === 'auth';

    if (!user && !inAuthGroup && !inAuthCallback) {
      // Not authenticated, redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Authenticated, redirect to main app
      // Check if user needs onboarding (no name set)
      if (!user.name) {
        router.replace('/(auth)/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [user, segments, isLoading]);
}

/**
 * Root Layout Component
 * 
 * Provides:
 * - SafeAreaProvider for proper inset handling
 * - Auth state listener setup
 * - Protected route handling
 * - Global navigation structure
 */
export default function RootLayout() {
  const { restoreSession, isLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // Initialize auth on app start
  useEffect(() => {
    const init = async () => {
      try {
        // Setup auth state listener for real-time auth events
        setupAuthListener();
        
        // Restore any existing session
        await restoreSession();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  // Apply protected route logic
  useProtectedRoute();

  // Show loading while initializing
  if (!isReady || isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
