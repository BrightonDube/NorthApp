/**
 * Authentication Store
 * 
 * Manages user authentication state and session persistence using Zustand.
 * Integrates with Supabase Auth for email/password, Google, and Apple Sign In.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.6, 18.2
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { clearStorageExceptTheme, resetAllStores } from '@/lib/logout';
import type { AuthStore, User, Session } from '@/types';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Required for OAuth to work properly on native - completes the auth session
if (Platform.OS !== 'web') {
    WebBrowser.maybeCompleteAuthSession();
}

/**
 * Get the correct redirect URI for OAuth
 * In Expo Go, we need to use the exp:// scheme with /--/ prefix
 * In production builds, we use the north:// scheme
 */
function getRedirectUri(): string {
  // Use makeRedirectUri which properly handles Expo Go vs standalone apps
  // For Expo Go: exp://host/--/path
  // For standalone: north://path
  const redirectUri = makeRedirectUri({
    scheme: 'north',
    path: 'auth/callback',
  });
  
  console.log('===========================================');
  console.log('OAuth Redirect URI:', redirectUri);
  console.log('Add this EXACT URL to Supabase Redirect URLs if not already added');
  console.log('===========================================');
  return redirectUri;
}

// Storage keys for session persistence
const SESSION_STORAGE_KEY = '@north/session';
const USER_STORAGE_KEY = '@north/user';

/**
 * Helper to add timeout to promises
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
};

/**
 * Convert Supabase session to our Session type
 */
function convertSession(supabaseSession: SupabaseSession): Session {
  return {
    accessToken: supabaseSession.access_token,
    refreshToken: supabaseSession.refresh_token,
    expiresAt: supabaseSession.expires_at || 0,
  };
}

/**
 * Convert Supabase user to our User type.
 *
 * Uses .maybeSingle() instead of .single() to avoid PostgREST PGRST116
 * errors when no profile row exists yet (new user before onboarding).
 * Also fetches is_pro and is_admin so existing users retain their
 * subscription tier and admin access immediately on login.
 */
async function convertUser(supabaseUser: any): Promise<User> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, is_pro, is_admin')
    .eq('id', supabaseUser.id)
    .maybeSingle();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || '',
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    isPro: profile?.is_pro === true,
    isAdmin: profile?.is_admin === true,
  };
}

/**
 * Authentication Store
 * 
 * Provides authentication state management with the following features:
 * - Email/password login
 * - Apple Sign In
 * - Session persistence across app restarts
 * - Automatic session restoration
 * - Error handling
 * 
 * @example
 * ```typescript
 * import { useAuthStore } from '@/stores/authStore';
 * 
 * function LoginScreen() {
 *   const { login, isLoading, error } = useAuthStore();
 *   
 *   const handleLogin = async () => {
 *     await login('user@example.com', 'password');
 *   };
 *   
 *   return (
 *     <View>
 *       {error && <Text>{error}</Text>}
 *       <Button onPress={handleLogin} disabled={isLoading}>
 *         Login
 *       </Button>
 *     </View>
 *   );
 * }
 * ```
 */
export const useAuthStore = create<AuthStore>((set, get) => ({
  // ============================================================================
  // State
  // ============================================================================
  
  user: null,
  session: null,
  isLoading: false,
  error: null,
  lastSynced: null,

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Login with email and password
   * 
   * Validates: Requirements 1.1, 1.2, 1.4
   * 
   * @param email - User's email address
   * @param password - User's password
   * @throws Error if authentication fails
   * 
   * @example
   * ```typescript
   * await login('user@example.com', 'password123');
   * ```
   */
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Display specific error from Supabase (Requirement 1.4, 17.2)
        set({ error: error.message, isLoading: false });
        return;
      }

      if (!data.session || !data.user) {
        set({ error: 'Authentication failed. Please try again.', isLoading: false });
        return;
      }

      // Convert to our types
      const session = convertSession(data.session);
      const user = await convertUser(data.user);

      // Persist session to AsyncStorage (Requirement 1.2, 18.2)
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      // Update state
      set({
        user,
        session,
        isLoading: false,
        error: null,
        lastSynced: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Sign up with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @param name - User's display name
   * @throws Error if registration fails
   */
  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        // Handle rate limiting specifically
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
          set({ 
            error: 'Too many signup attempts. Please wait a few minutes and try again.', 
            isLoading: false 
          });
          return;
        }
        
        set({ error: error.message, isLoading: false });
        return;
      }

      if (!data.session || !data.user) {
        // Email confirmation might be required
        set({ 
          error: null, 
          isLoading: false,
        });
        return { needsConfirmation: true };
      }

      // Convert to our types
      const session = convertSession(data.session);
      const user = await convertUser(data.user);

      // Persist session to AsyncStorage
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      // Update state
      set({
        user,
        session,
        isLoading: false,
        error: null,
        lastSynced: Date.now(),
      });
      
      return { needsConfirmation: false };
    } catch (error) {
      let errorMessage = 'Registration failed';
      
      if (error instanceof Error) {
        // Handle rate limiting
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
          errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      set({ error: errorMessage, isLoading: false });
      return { needsConfirmation: false };
    }
  },

  /**
   * Login with Google Sign In
   * 
   * Uses Supabase OAuth with expo-web-browser for the OAuth flow.
   * The redirect URL must be configured in Supabase dashboard.
   * 
   * Validates: Requirements 1.1, 1.2
   * 
   * @throws Error if authentication fails
   */
  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get the correct redirect URI for the current environment
      const redirectTo = getRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      if (data?.url) {
        // Race WebBrowser against a timeout — on Android production,
        // the deep link may be handled by Expo Router instead of WebBrowser,
        // causing openAuthSessionAsync to hang indefinitely.
        const browserPromise = WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true }
        );
        const timeoutPromise = new Promise<{ type: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ type: 'timeout' }), 60000)
        );

        const result = await Promise.race([browserPromise, timeoutPromise]) as any;

        if (result.type === 'timeout') {
          // WebBrowser hung — the deep link was likely handled by auth/callback screen.
          // Check if session was established by the callback handler.
          console.log('[loginWithGoogle] WebBrowser timed out, checking session...');
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            const user = await convertUser(existingSession.user);
            const converted = convertSession(existingSession);
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(converted));
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            set({ user, session: converted, isLoading: false, error: null });
          } else {
            set({ isLoading: false });
          }
          return;
        }

        if (result.type === 'success') {
          const url = result.url;

          // Try to extract tokens from hash fragment first (implicit flow)
          let accessToken: string | null = null;
          let refreshToken: string | null = null;

          // Check hash fragment (for implicit grant)
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }

          // Check query params (for authorization code flow)
          if (!accessToken && url.includes('?')) {
            const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              set({ error: sessionError.message, isLoading: false });
              return;
            }
          } else {
            // Check for PKCE authorization code (Supabase v2 default flow)
            let code: string | null = null;
            if (url.includes('?')) {
              const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
              code = queryParams.get('code');
            }

            if (code) {
              console.log('Found PKCE code, exchanging for session...');
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                set({ error: exchangeError.message, isLoading: false });
                return;
              }
            } else {
              console.log('No tokens or code in redirect URL, checking session...');
              await supabase.auth.getSession();
            }
          }

          // Set user directly to avoid race condition with auth listener
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            const user = await convertUser(currentSession.user);
            const converted = convertSession(currentSession);
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(converted));
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            set({ user, session: converted, isLoading: false, error: null });
            return;
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          set({ error: null, isLoading: false });
          return;
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Google Sign In error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google Sign In failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Login with Apple Sign In
   * 
   * Uses Supabase OAuth with web browser for Apple Sign In.
   * Works in Expo Go without native modules.
   * 
   * Validates: Requirements 1.1, 1.2
   * 
   * @throws Error if authentication fails
   */
  loginWithApple: async () => {
    set({ isLoading: true, error: null });

    try {
      // Get the correct redirect URI for the current environment
      const redirectTo = getRedirectUri();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('Apple OAuth error:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      if (data?.url) {
        // Race WebBrowser against a timeout — same as Google login
        const browserPromise = WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true }
        );
        const timeoutPromise = new Promise<{ type: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ type: 'timeout' }), 60000)
        );

        const result = await Promise.race([browserPromise, timeoutPromise]) as any;

        if (result.type === 'timeout') {
          console.log('[loginWithApple] WebBrowser timed out, checking session...');
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          if (existingSession) {
            const user = await convertUser(existingSession.user);
            const converted = convertSession(existingSession);
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(converted));
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            set({ user, session: converted, isLoading: false, error: null });
          } else {
            set({ isLoading: false });
          }
          return;
        }

        if (result.type === 'success') {
          const url = result.url;

          // Try to extract tokens from hash fragment first (implicit flow)
          let accessToken: string | null = null;
          let refreshToken: string | null = null;

          // Check hash fragment (for implicit grant)
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }

          // Check query params (for authorization code flow)
          if (!accessToken && url.includes('?')) {
            const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              set({ error: sessionError.message, isLoading: false });
              return;
            }
          } else {
            // Check for PKCE authorization code (Supabase v2 default flow)
            let code: string | null = null;
            if (url.includes('?')) {
              const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
              code = queryParams.get('code');
            }

            if (code) {
              console.log('Found PKCE code, exchanging for session...');
              const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                set({ error: exchangeError.message, isLoading: false });
                return;
              }
            } else {
              console.log('No tokens or code in redirect URL, checking session...');
              await supabase.auth.getSession();
            }
          }

          // Set user directly to avoid race condition with auth listener
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            const user = await convertUser(currentSession.user);
            const converted = convertSession(currentSession);
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(converted));
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            set({ user, session: converted, isLoading: false, error: null });
            return;
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          set({ error: null, isLoading: false });
          return;
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Apple Sign In error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Apple Sign In failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Logout the current user
   * 
   * Validates: Requirements 15.3, 15.6, 48
   * 
   * Clears session from storage and signs out from Supabase.
   * Also clears all Zustand stores and AsyncStorage (except theme preference).
   * 
   * @example
   * ```typescript
   * await logout();
   * // User is now signed out, all data cleared
   * ```
   */
  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      // Reset all other stores FIRST (Requirement 15.3)
      // This must happen before clearing AsyncStorage to prevent rehydration issues
      await resetAllStores();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Clear session from AsyncStorage
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);

      // Clear all AsyncStorage keys except theme preference (Requirement 15.3, 15.6, 48)
      await clearStorageExceptTheme();

      // Clear authStore state
      set({
        user: null,
        session: null,
        isLoading: false,
        error: null,
        lastSynced: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Restore session from AsyncStorage
   * 
   * Validates: Requirements 1.3, 18.2, Property 1
   * 
   * Called on app startup to restore authenticated state without requiring re-login.
   * Uses Supabase's built-in session restoration with AsyncStorage.
   * 
   * @example
   * ```typescript
   * // In App.tsx or root component
   * useEffect(() => {
   *   restoreSession();
   * }, []);
   * ```
   */
  restoreSession: async () => {
    set({ isLoading: true, error: null });

    try {
      // 1. FAST RESTORE: Try to load from AsyncStorage first
      // This allows the app to start immediately while verifying in background
      const storedSessionStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      const storedUserStr = await AsyncStorage.getItem(USER_STORAGE_KEY);

      if (storedSessionStr && storedUserStr) {
        try {
          const session = JSON.parse(storedSessionStr);
          const user = JSON.parse(storedUserStr);
          
          // Optimistically set state immediately
          set({
            user,
            session,
            isLoading: false, // Stop loading spinner immediately
            error: null,
            lastSynced: Date.now(),
          });
        } catch (parseError) {
          // If parsing fails, ignore and proceed to standard restore
          console.error('Failed to parse stored session/user:', parseError);
        }
      }

      // 2. BACKGROUND VERIFY: Validate with Supabase
      // Supabase automatically restores session from AsyncStorage
      // We just need to get the current session
      // Add timeout to prevent hanging indefinitely
      const { data: { session: supabaseSession }, error } = await withTimeout(
        supabase.auth.getSession(), 
        5000 // 5s timeout for session check
      );

      if (error || !supabaseSession) {
        // Session invalid or expired - clear local state if we had it
        // Suppress "Invalid Refresh Token" errors as they're expected on first launch
        if (error && !error.message.includes('Refresh Token Not Found')) {
          console.warn('Session restoration error:', error.message);
        }
        
        if (storedSessionStr) {
          await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
          await AsyncStorage.removeItem(USER_STORAGE_KEY);
          // Only reset if we optimistically set it
          if (get().session) {
            set({ user: null, session: null, isLoading: false, error: null });
          }
        } else {
          set({ isLoading: false, error: null });
        }
        return;
      }

      // Get current user
      const { data: { user: supabaseUser }, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        5000 // 5s timeout for user check
      );

      if (userError || !supabaseUser) {
        // User data unavailable, clear session
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        set({ user: null, session: null, isLoading: false, error: null });
        return;
      }

      // Convert to our types
      const session = convertSession(supabaseSession);
      const user = await convertUser(supabaseUser);

      // Update local storage
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      // Update state with verified data
      set({
        user,
        session,
        isLoading: false,
        error: null,
        lastSynced: Date.now(),
      });
    } catch (error) {
      // Don't show error to user for session restoration failures
      // Just log and continue with unauthenticated state
      console.error('Session restoration failed:', error);
      set({ isLoading: false, error: null });
    }
  },

  /**
   * Clear error state
   * 
   * Useful for dismissing error messages in the UI.
   * 
   * @example
   * ```typescript
   * const { error, clearError } = useAuthStore();
   * 
   * return (
   *   <View>
   *     {error && (
   *       <Alert>
   *         {error}
   *         <Button onPress={clearError}>Dismiss</Button>
   *       </Alert>
   *     )}
   *   </View>
   * );
   * ```
   */
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Setup auth state change listener
 * 
 * This should be called once when the app initializes to listen for
 * authentication state changes from Supabase (e.g., token refresh, sign out).
 * 
 * @example
 * ```typescript
 * // In App.tsx
 * useEffect(() => {
 *   setupAuthListener();
 * }, []);
 * ```
 */
export function setupAuthListener() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      const store = useAuthStore.getState();

      if (event === 'SIGNED_IN' && session) {
        // User signed in, update state
        const user = await convertUser(session.user);
        const convertedSession = convertSession(session);
        
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(convertedSession));
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        
        useAuthStore.setState({
          user,
          session: convertedSession,
          isLoading: false,
          error: null,
          lastSynced: Date.now(),
        });
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear state
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        
        useAuthStore.setState({
          user: null,
          session: null,
          isLoading: false,
          error: null,
        });
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed, update session
        const convertedSession = convertSession(session);
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(convertedSession));
        
        useAuthStore.setState({
          session: convertedSession,
        });
      }
    } catch (error) {
      console.error('Auth state change handler error:', error);
      // Ensure isLoading is cleared even if handler fails
      useAuthStore.setState({ isLoading: false });
    }
  });
}

/**
 * Helper hook to check if user is authenticated
 * 
 * @returns true if user is authenticated, false otherwise
 * 
 * @example
 * ```typescript
 * function ProtectedScreen() {
 *   const isAuthenticated = useIsAuthenticated();
 *   
 *   if (!isAuthenticated) {
 *     return <Navigate to="/login" />;
 *   }
 *   
 *   return <View>Protected content</View>;
 * }
 * ```
 */
export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.user !== null && state.session !== null);
}

/**
 * Helper hook to get current user
 * 
 * @returns Current user or null if not authenticated
 * 
 * @example
 * ```typescript
 * function ProfileScreen() {
 *   const user = useCurrentUser();
 *   
 *   if (!user) return null;
 *   
 *   return <Text>Welcome, {user.name}!</Text>;
 * }
 * ```
 */
export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}
