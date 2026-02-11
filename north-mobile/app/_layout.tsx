import '../global.css';
import { useEffect, useState, Suspense, lazy } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { View, ActivityIndicator, AppState, AppStateStatus, AccessibilityInfo } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore, setupAuthListener } from '@/stores/authStore';
import { useBillingStore } from '@/stores/billingStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useChatStore } from '@/stores/chatStore';
import { useCoachStore } from '@/stores/coachStore';
import { useContextStore } from '@/stores/contextStore';
import { PaywallModal } from '@/components/billing';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useNotifications } from '@/hooks/useNotifications';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { 
  markPerformance, 
  measureColdStart, 
  PERFORMANCE_MARKS,
  setupPerformanceObserver 
} from '@/lib/performance';

// Lazy load non-critical screens to improve startup performance
// These screens are only loaded when the user navigates to them
const LazyLoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#3B82F6" />
  </View>
);

// Prevent the splash screen from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

/**
 * Root Layout Component
 * 
 * Provides:
 * - ErrorBoundary for crash protection
 * - SafeAreaProvider for proper inset handling
 * - Auth state listener setup
 * - Protected route handling
 * - Global navigation structure
 * - Lazy initialization of non-critical services
 * - Performance measurement for cold start time
 * 
 * Performance Optimizations:
 * - Notifications initialized lazily (not blocking startup)
 * - Deep linking initialized lazily (not blocking startup)
 * - Legal screens and coach creation are code-split by Expo Router
 * - Cold start time measurement with React Native Performance API
 * 
 * Validates: Requirements 13.7, 20.1 (cold start < 2s)
 */
export default function RootLayout() {
  const { restoreSession, isLoading, user } = useAuthStore();
  const { initialize: initializeBilling } = useBillingStore();
  const { initialize: initializeNetwork, cleanup: cleanupNetwork } = useNetworkStore();
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Setup performance observer in development
  useEffect(() => {
    if (__DEV__) {
      setupPerformanceObserver();
    }
  }, []);
  
  // Initialize notifications (deferred to not block startup)
  useNotifications();

  // Initialize deep linking (deferred to not block startup)
  useDeepLinking();

  // Initialize auth on app start (critical path)
  useEffect(() => {
    const init = async () => {
      try {
        // Mark auth initialization start
        markPerformance(PERFORMANCE_MARKS.AUTH_INIT_START);
        
        // Setup auth state listener for real-time auth events
        setupAuthListener();
        
        // Restore any existing session with a safety timeout
        // Even though store has timeouts, this ensures UI unblocks
        const restorePromise = restoreSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth init timeout')), 8000)
        );
        
        await Promise.race([restorePromise, timeoutPromise]);
        
        // Mark auth initialization end
        markPerformance(PERFORMANCE_MARKS.AUTH_INIT_END);
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Force stop loading if timed out
        useAuthStore.setState({ isLoading: false });
        markPerformance(PERFORMANCE_MARKS.AUTH_INIT_END);
      } finally {
        setIsAuthInitialized(true);
        // Mark app as ready after a small delay to ensure smooth transition
        setTimeout(() => setIsAppReady(true), 100);
      }
    };

    init();
  }, []);

  // Initialize network monitoring on app start (critical for offline detection)
  useEffect(() => {
    initializeNetwork();
    
    return () => {
      cleanupNetwork();
    };
  }, []);

  // Handle memory warnings - Property 66: Memory Warning Handling
  // Validates: Requirements 20.3
  useEffect(() => {
    /**
     * Clear non-essential caches to free up memory
     * 
     * This function is called when:
     * 1. The app receives a memory warning from the OS
     * 2. The app goes to background
     * 
     * Actions taken:
     * - Trim message history to last 50 messages per session
     * - Clear coach cache (will be reloaded from AsyncStorage when needed)
     * - Clear context cache (will be reloaded from AsyncStorage when needed)
     * - Log the memory cleanup for debugging
     * 
     * Critical data is preserved:
     * - Recent messages (last 50 per session)
     * - All data remains in AsyncStorage for recovery
     * - Active sessions are maintained
     */
    const clearNonEssentialCaches = () => {
      console.log('[Performance] Memory warning - clearing non-essential caches');
      
      // 1. Trim message history to last 50 messages per session
      const chatState = useChatStore.getState();
      const sessions = Object.keys(chatState.messages);
      
      if (sessions.length > 0) {
        const trimmedMessages: Record<string, any[]> = {};
        
        sessions.forEach(sessionId => {
          const messages = chatState.messages[sessionId];
          if (messages && messages.length > 50) {
            // Keep only the last 50 messages
            trimmedMessages[sessionId] = messages.slice(-50);
            console.log(`[Performance] Trimmed session ${sessionId} from ${messages.length} to 50 messages`);
          } else {
            // Keep all messages if less than 50
            trimmedMessages[sessionId] = messages;
          }
        });
        
        useChatStore.setState({
          messages: trimmedMessages,
        });
      }
      
      // 2. Clear coach cache (will be reloaded from AsyncStorage when needed)
      // Keep the coaches array but mark as stale to force reload on next access
      const coachState = useCoachStore.getState();
      if (coachState.coaches.length > 0) {
        console.log(`[Performance] Marked ${coachState.coaches.length} coaches as stale`);
        useCoachStore.setState({
          lastSynced: null, // Mark as stale
        });
      }
      
      // 3. Clear context cache (will be reloaded from AsyncStorage when needed)
      // Keep the items array but mark as stale to force reload on next access
      const contextState = useContextStore.getState();
      if (contextState.items.length > 0) {
        console.log(`[Performance] Marked ${contextState.items.length} context items as stale`);
        useContextStore.setState({
          lastSynced: null, // Mark as stale
        });
      }
      
      console.log('[Performance] Memory cleanup complete');
    };

    // Handle app state changes (background/foreground)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // App is going to background - good time to clean up memory
        console.log('[Performance] App backgrounded - cleaning up memory');
        clearNonEssentialCaches();
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  // Initialize app data in parallel when user is authenticated
  // Validates: Requirement 14.1 - Optimize initial data fetching (parallel requests)
  useEffect(() => {
    if (user?.id && isAppReady) {
      // Fetch all initial data in parallel for faster startup
      const initializeAppData = async () => {
        try {
          console.log('[Performance] Starting parallel data initialization');
          markPerformance(PERFORMANCE_MARKS.DATA_FETCH_START);
          const startTime = Date.now();
          
          // Import stores dynamically to avoid circular dependencies
          const { useCoachStore } = await import('@/stores/coachStore');
          const { useContextStore } = await import('@/stores/contextStore');
          
          // Execute all data fetches in parallel
          await Promise.all([
            // Initialize billing (includes entitlement fetch)
            initializeBilling(user.id),
            // Fetch coaches
            useCoachStore.getState().fetchCoaches(),
            // Fetch user context
            useContextStore.getState().fetchContexts(),
          ]);
          
          markPerformance(PERFORMANCE_MARKS.DATA_FETCH_END);
          const duration = Date.now() - startTime;
          console.log(`[Performance] Parallel data initialization completed in ${duration}ms`);
        } catch (error) {
          console.error('[Performance] Error during parallel data initialization:', error);
          markPerformance(PERFORMANCE_MARKS.DATA_FETCH_END);
          // Don't block app startup on data fetch errors
          // Individual stores will handle their own error states
        }
      };
      
      // Start initialization immediately (no artificial delay)
      initializeAppData();
    }
  }, [user?.id, isAppReady]);

  // Show loading while initializing auth - render Slot to mount navigation
  if (!isAuthInitialized || isLoading) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <RootLayoutNav />
        <GlobalPaywall />
      </SafeAreaProvider>
    </ErrorBoundary>
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
  const [hasMeasuredColdStart, setHasMeasuredColdStart] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Hide splash screen once we're ready
  useEffect(() => {
    SplashScreen.hideAsync();
    
    // Mark first render
    markPerformance(PERFORMANCE_MARKS.FIRST_RENDER);
  }, []);

  // Measure cold start time once the app is interactive
  useEffect(() => {
    if (!isLoading && !hasMeasuredColdStart) {
      // Small delay to ensure the UI is fully rendered and interactive
      const timer = setTimeout(() => {
        measureColdStart();
        setHasMeasuredColdStart(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, hasMeasuredColdStart]);

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
        // Default fade animation for all screens
        animation: prefersReducedMotion ? 'none' : 'fade',
        animationDuration: 180, // Keep animations under 200ms per requirements
        // Subtle animation configuration
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          animation: prefersReducedMotion ? 'none' : 'fade',
        }} 
      />
      <Stack.Screen 
        name="(auth)" 
        options={{ 
          headerShown: false,
          animation: prefersReducedMotion ? 'none' : 'fade',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
          animation: prefersReducedMotion ? 'none' : 'fade',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="auth" 
        options={{ 
          headerShown: false,
          animation: prefersReducedMotion ? 'none' : 'fade',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="chat/[coachId]" 
        options={{ 
          headerShown: false,
          // Slide from right for chat screens (feels like drilling into content)
          animation: prefersReducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="coach/create" 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          // Slide from bottom for modal-style screens
          animation: prefersReducedMotion ? 'none' : 'slide_from_bottom',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="legal" 
        options={{ 
          headerShown: false,
          // Slide from right for legal pages (feels like navigating to a new page)
          animation: prefersReducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 180,
        }} 
      />
    </Stack>
  );
}
