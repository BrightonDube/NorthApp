import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, setupAuthListener } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { useNetworkStore } from '@/stores/networkStore';
import { PaywallModal } from '@/components/billing';

// Prevent the splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

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
  const { restoreSession, isLoading, user } = useAuthStore();
  const { initialize: initializeBilling } = useBillingStore();
  const { initialize: initializeNetwork, cleanup: cleanupNetwork } = useNetworkStore();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);

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
        setIsAuthInitialized(true);
      }
    };

    init();
  }, []);

  // Initialize network monitoring on app start
  useEffect(() => {
    initializeNetwork();
    
    return () => {
      cleanupNetwork();
    };
  }, []);

  // Initialize RevenueCat when user is authenticated
  useEffect(() => {
    if (user?.id) {
      initializeBilling(user.id);
    }
  }, [user?.id]);

  // Show loading while initializing auth - render Slot to mount navigation
  if (!isAuthInitialized || isLoading) {
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
      <RootLayoutNav />
      <GlobalPaywall />
    </SafeAreaProvider>
  );
}

/**
 * Global Paywall Component
 * Renders the paywall modal that can be triggered from anywhere in the app
 */
function GlobalPaywall() {
  const { isPaywallVisible, paywallFeature, hidePaywall } = useBillingStore();
  
  return (
    <PaywallModal
      visible={isPaywallVisible}
      feature={paywallFeature || undefined}
      onClose={hidePaywall}
    />
  );
}

/**
 * Root Layout Navigation
 * Separated to ensure Stack is always mounted before useProtectedRoute runs
 */
function RootLayoutNav() {
  const { user, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);

  // Hide splash screen once we're ready
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Protected route logic - runs after Stack is mounted
  useEffect(() => {
    // Prevent multiple navigations
    if (hasNavigated) return;
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAuthCallback = segments[0] === 'auth';
    const inTabs = segments[0] === '(tabs)';

    // Small delay to ensure navigation is fully ready
    const timer = setTimeout(() => {
      if (!user && !inAuthGroup && !inAuthCallback) {
        // Not authenticated, redirect to login
        setHasNavigated(true);
        router.replace('/(auth)/login');
      } else if (user && (inAuthGroup || (!inTabs && !inAuthCallback))) {
        // Authenticated, redirect to main app
        setHasNavigated(true);
        if (!user.name || user.name.trim().length < 2) {
          router.replace('/(auth)/onboarding');
        } else {
          router.replace('/(tabs)');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, segments, isLoading, hasNavigated]);

  // Reset hasNavigated when user changes (login/logout)
  useEffect(() => {
    setHasNavigated(false);
  }, [user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen 
        name="coach/create" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }} 
      />
    </Stack>
  );
}
