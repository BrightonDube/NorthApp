/**
 * Authentication Store
 * 
 * Manages user authentication state and session persistence using Zustand.
 * Integrates with Supabase Auth for email/password, Google, and Apple Sign In.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.6, 18.2
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import type { AuthStore, User, Session } from '@/types';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

// Required for OAuth to work properly on native - completes the auth session
WebBrowser.maybeCompleteAuthSession();

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
      // Create the redirect URI using the app scheme
      // This MUST match what's configured in Supabase Auth settings
      const redirectUrl = 'north://auth/callback';
      
      console.log('Google OAuth - Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        
        // Open the OAuth URL in the system browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: false,
          }
        );
        
        console.log('WebBrowser result:', result.type);
        
        if (result.type === 'success' && result.url) {
          console.log('Success URL:', result.url);
          
          // Extract tokens from the callback URL
          const url = result.url;
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Parse hash fragment (Supabase uses implicit grant by default)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            if (hashPart) {
              const hashParams = new URLSearchParams(hashPart);
              accessToken = hashParams.get('access_token');
              refreshToken = hashParams.get('refresh_token');
              console.log('Found tokens in hash fragment');
            }
          }
          
          // Also check query params as fallback
          if (!accessToken && url.includes('?')) {
            const queryPart = url.split('?')[1]?.split('#')[0];
            if (queryPart) {
              const queryParams = new URLSearchParams(queryPart);
              accessToken = queryParams.get('access_token');
              refreshToken = queryParams.get('refresh_token');
              console.log('Found tokens in query params');
            }
          }
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              set({ error: sessionError.message, isLoading: false });
              return;
            }
            
            if (sessionData.session && sessionData.user) {
              console.log('Session set successfully');
              // The auth state listener will handle updating the store
            }
          } else {
            console.log('No tokens found in URL, attempting to get session...');
            // Try to get the session anyway (in case of cookie-based auth)
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (!sessionCheck.session) {
              set({ error: 'Failed to complete authentication', isLoading: false });
              return;
            }
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          console.log('User cancelled OAuth');
          set({ error: null, isLoading: false });
          return;
        }
      } else {
        set({ error: 'Failed to start OAuth flow', isLoading: false });
        return;
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
      // Use web-based OAuth flow - works in Expo Go
      const redirectUrl = 'north://auth/callback';
      
      console.log('Apple OAuth - Using redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('Apple OAuth error:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      if (data?.url) {
        console.log('Opening Apple OAuth URL:', data.url);
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: false,
          }
        );
        
        console.log('WebBrowser result:', result.type);
        
        if (result.type === 'success' && result.url) {
          console.log('Success URL:', result.url);
          
          // Extract tokens from the callback URL
          const url = result.url;
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Parse hash fragment (Supabase uses implicit grant by default)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            if (hashPart) {
              const hashParams = new URLSearchParams(hashPart);
              accessToken = hashParams.get('access_token');
              refreshToken = hashParams.get('refresh_token');
              console.log('Found tokens in hash fragment');
            }
          }
          
          // Also check query params as fallback
          if (!accessToken && url.includes('?')) {
            const queryPart = url.split('?')[1]?.split('#')[0];
            if (queryPart) {
              const queryParams = new URLSearchParams(queryPart);
              accessToken = queryParams.get('access_token');
              refreshToken = queryParams.get('refresh_token');
              console.log('Found tokens in query params');
            }
          }
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              set({ error: sessionError.message, isLoading: false });
              return;
            }
            
            if (sessionData.session && sessionData.user) {
              console.log('Session set successfully');
              // The auth state listener will handle updating the store
            }
          } else {
            console.log('No tokens found in URL, attempting to get session...');
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (!sessionCheck.session) {
              set({ error: 'Failed to complete authentication', isLoading: false });
              return;
            }
          }
        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          console.log('User cancelled OAuth');
          set({ error: null, isLoading: false });
          return;
        }
      } else {
        set({ error: 'Failed to start OAuth flow', isLoading: false });
        return;
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
