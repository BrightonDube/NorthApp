/**
 * Authentication Store
 * 
 * Manages user authentication state and session persistence using Zustand.
 * Integrates with Supabase Auth for email/password and Apple Sign In.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.6, 18.2
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { AuthStore, User, Session } from '@/types';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

// Storage keys for session persistence
const SESSION_STORAGE_KEY = '@north/session';
const USER_STORAGE_KEY = '@north/user';

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
 * Convert Supabase user to our User type
 */
async function convertUser(supabaseUser: any): Promise<User> {
  // Fetch user profile to get name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', supabaseUser.id)
    .single();

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: profile?.name || '',
    createdAt: supabaseUser.created_at || new Date().toISOString(),
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
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      set({ error: errorMessage, isLoading: false });
    }
  },

  /**
   * Login with Apple Sign In
   * 
   * Validates: Requirements 1.1, 1.2
   * 
   * Note: This requires additional setup with Apple Developer account
   * and Supabase Apple OAuth configuration.
   * 
   * @throws Error if authentication fails
   * 
   * @example
   * ```typescript
   * await loginWithApple();
   * ```
   */
  loginWithApple: async () => {
    set({ isLoading: true, error: null });

    try {
      // Note: Apple Sign In requires native module setup
      // This is a placeholder implementation that will be completed
      // when Apple OAuth is configured in Supabase
      
      // For now, we'll use Supabase's OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'north://auth/callback',
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // OAuth flow will redirect to callback URL
      // Session will be handled by the auth state change listener
      set({ isLoading: false });
    } catch (error) {
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
   * 
   * @example
   * ```typescript
   * await logout();
   * // User is now signed out
   * ```
   */
  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Clear local storage (Requirement 15.6, 48)
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);

      // Clear state
      set({
        user: null,
        session: null,
        isLoading: false,
        error: null,
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
      // Supabase automatically restores session from AsyncStorage
      // We just need to get the current session
      const { data: { session: supabaseSession }, error } = await supabase.auth.getSession();

      if (error) {
        // Session restoration failed, clear any stale data
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        set({ isLoading: false, error: null });
        return;
      }

      if (!supabaseSession) {
        // No session to restore
        set({ isLoading: false, error: null });
        return;
      }

      // Get current user
      const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !supabaseUser) {
        // User data unavailable, clear session
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await AsyncStorage.removeItem(USER_STORAGE_KEY);
        set({ isLoading: false, error: null });
        return;
      }

      // Convert to our types
      const session = convertSession(supabaseSession);
      const user = await convertUser(supabaseUser);

      // Update local storage
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

      // Update state
      set({
        user,
        session,
        isLoading: false,
        error: null,
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
