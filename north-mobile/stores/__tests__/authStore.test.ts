/**
 * Authentication Store Tests
 * 
 * Tests for authStore functionality including:
 * - Email/password login
 * - Apple Sign In
 * - Session persistence
 * - Session restoration
 * - Logout
 * - Error handling
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.6, 18.2
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, setupAuthListener, useIsAuthenticated, useCurrentUser } from '../authStore';
import { supabase } from '@/lib/supabase';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

// Mock data
const mockSupabaseUser: SupabaseUser = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  role: 'authenticated',
};

const mockSupabaseSession: SupabaseSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() / 1000 + 3600,
  expires_in: 3600,
  token_type: 'bearer',
  user: mockSupabaseUser,
};

const mockProfile = {
  id: 'user-123',
  name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('authStore', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset AsyncStorage
    AsyncStorage.clear();
    
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock successful authentication
      const mockSignIn = jest.fn().mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock) = mockFrom;

      const { result } = renderHook(() => useAuthStore());

      // Call login
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      // Verify authentication was called
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      // Verify state was updated
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
        expect(result.current.user?.email).toBe('test@example.com');
        expect(result.current.user?.name).toBe('Test User');
        expect(result.current.session).not.toBeNull();
        expect(result.current.session?.accessToken).toBe('mock-access-token');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      // Verify session was persisted to AsyncStorage
      const storedSession = await AsyncStorage.getItem('@north/session');
      const storedUser = await AsyncStorage.getItem('@north/user');
      
      expect(storedSession).not.toBeNull();
      expect(storedUser).not.toBeNull();
      
      const parsedSession = JSON.parse(storedSession!);
      expect(parsedSession.accessToken).toBe('mock-access-token');
    });

    it('should handle invalid credentials error', async () => {
      // Mock authentication failure
      const mockSignIn = jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

      const { result } = renderHook(() => useAuthStore());

      // Call login
      await act(async () => {
        await result.current.login('test@example.com', 'wrongpassword');
      });

      // Verify error state
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.error).toBe('Invalid login credentials');
        expect(result.current.isLoading).toBe(false);
      });

      // Verify nothing was persisted
      const storedSession = await AsyncStorage.getItem('@north/session');
      expect(storedSession).toBeNull();
    });

    it('should set loading state during login', async () => {
      // Mock slow authentication
      const mockSignIn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { session: mockSupabaseSession, user: mockSupabaseUser },
          error: null,
        }), 100))
      );

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock) = mockFrom;

      const { result } = renderHook(() => useAuthStore());

      // Start login
      act(() => {
        result.current.login('test@example.com', 'password123');
      });

      // Check loading state immediately
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error
      const mockSignIn = jest.fn().mockRejectedValue(new Error('Network error'));

      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

      const { result } = renderHook(() => useAuthStore());

      // Call login
      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      // Verify error state
      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('loginWithApple', () => {
    it('should initiate Apple Sign In flow', async () => {
      // Mock OAuth initiation
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({
        data: { provider: 'apple', url: 'https://apple.com/auth' },
        error: null,
      });

      (supabase.auth.signInWithOAuth as jest.Mock) = mockSignInWithOAuth;

      const { result } = renderHook(() => useAuthStore());

      // Call loginWithApple
      await act(async () => {
        await result.current.loginWithApple();
      });

      // Verify OAuth was initiated
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: 'north://auth/callback',
        },
      });

      // Verify loading state is cleared
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle Apple Sign In errors', async () => {
      // Mock OAuth error
      const mockSignInWithOAuth = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Apple Sign In cancelled' },
      });

      (supabase.auth.signInWithOAuth as jest.Mock) = mockSignInWithOAuth;

      const { result } = renderHook(() => useAuthStore());

      // Call loginWithApple
      await act(async () => {
        await result.current.loginWithApple();
      });

      // Verify error state
      await waitFor(() => {
        expect(result.current.error).toBe('Apple Sign In cancelled');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear session', async () => {
      // Set up authenticated state
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00Z',
      };
      const mockSession = {
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh',
        expiresAt: Date.now() + 3600000,
      };

      await AsyncStorage.setItem('@north/session', JSON.stringify(mockSession));
      await AsyncStorage.setItem('@north/user', JSON.stringify(mockUser));

      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      // Mock successful sign out
      const mockSignOut = jest.fn().mockResolvedValue({ error: null });
      (supabase.auth.signOut as jest.Mock) = mockSignOut;

      const { result } = renderHook(() => useAuthStore());

      // Call logout
      await act(async () => {
        await result.current.logout();
      });

      // Verify sign out was called
      expect(mockSignOut).toHaveBeenCalled();

      // Verify state was cleared
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      // Verify storage was cleared
      const storedSession = await AsyncStorage.getItem('@north/session');
      const storedUser = await AsyncStorage.getItem('@north/user');
      
      expect(storedSession).toBeNull();
      expect(storedUser).toBeNull();
    });

    it('should handle logout errors', async () => {
      // Mock sign out error
      const mockSignOut = jest.fn().mockResolvedValue({
        error: { message: 'Logout failed' },
      });
      (supabase.auth.signOut as jest.Mock) = mockSignOut;

      const { result } = renderHook(() => useAuthStore());

      // Call logout
      await act(async () => {
        await result.current.logout();
      });

      // Verify error state
      await waitFor(() => {
        expect(result.current.error).toBe('Logout failed');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('restoreSession', () => {
    it('should restore valid session from storage', async () => {
      // Mock stored session
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: mockSupabaseSession },
        error: null,
      });

      const mockGetUser = jest.fn().mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (supabase.auth.getSession as jest.Mock) = mockGetSession;
      (supabase.auth.getUser as jest.Mock) = mockGetUser;
      (supabase.from as jest.Mock) = mockFrom;

      const { result } = renderHook(() => useAuthStore());

      // Call restoreSession
      await act(async () => {
        await result.current.restoreSession();
      });

      // Verify session was restored
      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
        expect(result.current.user?.email).toBe('test@example.com');
        expect(result.current.session).not.toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle no session gracefully', async () => {
      // Mock no session
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      });

      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      const { result } = renderHook(() => useAuthStore());

      // Call restoreSession
      await act(async () => {
        await result.current.restoreSession();
      });

      // Verify state remains unauthenticated
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should clear invalid session', async () => {
      // Set up invalid stored session
      await AsyncStorage.setItem('@north/session', JSON.stringify({ invalid: 'data' }));

      // Mock session error
      const mockGetSession = jest.fn().mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid session' },
      });

      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      const { result } = renderHook(() => useAuthStore());

      // Call restoreSession
      await act(async () => {
        await result.current.restoreSession();
      });

      // Verify storage was cleared
      await waitFor(async () => {
        const storedSession = await AsyncStorage.getItem('@north/session');
        const storedUser = await AsyncStorage.getItem('@north/user');
        
        expect(storedSession).toBeNull();
        expect(storedUser).toBeNull();
      });

      // Verify state is unauthenticated
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should not show error to user on restoration failure', async () => {
      // Mock restoration error
      const mockGetSession = jest.fn().mockRejectedValue(new Error('Network error'));

      (supabase.auth.getSession as jest.Mock) = mockGetSession;

      const { result } = renderHook(() => useAuthStore());

      // Call restoreSession
      await act(async () => {
        await result.current.restoreSession();
      });

      // Verify no error is shown to user
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set error state
      act(() => {
        useAuthStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Helper Hooks', () => {
    describe('useIsAuthenticated', () => {
      it('should return false when not authenticated', () => {
        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBe(false);
      });

      it('should return true when authenticated', () => {
        // Set authenticated state
        act(() => {
          useAuthStore.setState({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              createdAt: '2024-01-01T00:00:00Z',
            },
            session: {
              accessToken: 'mock-token',
              refreshToken: 'mock-refresh',
              expiresAt: Date.now() + 3600000,
            },
          });
        });

        const { result } = renderHook(() => useIsAuthenticated());
        expect(result.current).toBe(true);
      });
    });

    describe('useCurrentUser', () => {
      it('should return null when not authenticated', () => {
        const { result } = renderHook(() => useCurrentUser());
        expect(result.current).toBeNull();
      });

      it('should return user when authenticated', () => {
        const mockUser = {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2024-01-01T00:00:00Z',
        };

        // Set authenticated state
        act(() => {
          useAuthStore.setState({ user: mockUser });
        });

        const { result } = renderHook(() => useCurrentUser());
        expect(result.current).toEqual(mockUser);
      });
    });
  });

  describe('Auth State Change Listener', () => {
    it('should update state on SIGNED_IN event', async () => {
      let authCallback: any;

      // Mock onAuthStateChange to capture callback
      const mockOnAuthStateChange = jest.fn((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      (supabase.auth.onAuthStateChange as jest.Mock) = mockOnAuthStateChange;
      (supabase.from as jest.Mock) = mockFrom;

      // Setup listener
      setupAuthListener();

      expect(mockOnAuthStateChange).toHaveBeenCalled();

      // Trigger SIGNED_IN event
      await act(async () => {
        await authCallback('SIGNED_IN', mockSupabaseSession);
      });

      // Verify state was updated
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).not.toBeNull();
        expect(state.session).not.toBeNull();
      });
    });

    it('should clear state on SIGNED_OUT event', async () => {
      let authCallback: any;

      // Set up authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2024-01-01T00:00:00Z',
        },
        session: {
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh',
          expiresAt: Date.now() + 3600000,
        },
      });

      // Mock onAuthStateChange to capture callback
      const mockOnAuthStateChange = jest.fn((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      (supabase.auth.onAuthStateChange as jest.Mock) = mockOnAuthStateChange;

      // Setup listener
      setupAuthListener();

      // Trigger SIGNED_OUT event
      await act(async () => {
        await authCallback('SIGNED_OUT', null);
      });

      // Verify state was cleared
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.session).toBeNull();
      });
    });

    it('should update session on TOKEN_REFRESHED event', async () => {
      let authCallback: any;

      // Set up authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          createdAt: '2024-01-01T00:00:00Z',
        },
        session: {
          accessToken: 'old-token',
          refreshToken: 'old-refresh',
          expiresAt: Date.now() + 1800000,
        },
      });

      // Mock onAuthStateChange to capture callback
      const mockOnAuthStateChange = jest.fn((callback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      });

      (supabase.auth.onAuthStateChange as jest.Mock) = mockOnAuthStateChange;

      // Setup listener
      setupAuthListener();

      // Create new session with refreshed token
      const refreshedSession = {
        ...mockSupabaseSession,
        access_token: 'new-token',
      };

      // Trigger TOKEN_REFRESHED event
      await act(async () => {
        await authCallback('TOKEN_REFRESHED', refreshedSession);
      });

      // Verify session was updated
      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.session?.accessToken).toBe('new-token');
      });
    });
  });
});
