/**
 * Logout → Login Flow Integration Test
 * 
 * Tests the complete flow of logging out and then logging back in.
 * Validates that session is properly cleared and can be re-established.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 15.3, 15.6, 48
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, setupAuthListener } from '@/stores/authStore';
import { useContextStore } from '@/stores/contextStore';
import { useCoachStore } from '@/stores/coachStore';
import { useChatStore } from '@/stores/chatStore';
import { useBillingStore } from '@/stores/billingStore';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    logOut: jest.fn(),
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    addCustomerInfoUpdateListener: jest.fn(() => jest.fn()),
  },
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
  },
}));

describe('Logout → Login Flow Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const mockSession = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    expiresAt: Date.now() + 3600000,
  };

  const mockSupabaseUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2026-01-01T00:00:00.000Z',
  };

  const mockSupabaseSession = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: mockSupabaseUser,
  };

  beforeEach(async () => {
    // Clear all stores
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });
    
    useContextStore.getState().reset();
    useCoachStore.getState().reset();
    useChatStore.getState().reset();
    useBillingStore.getState().reset();
    
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Complete Logout → Login Flow', () => {
    it('should successfully logout and then login again', async () => {
      // ============================================================
      // STEP 1: Setup initial logged-in state
      // ============================================================
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      // Add some data to other stores to verify cleanup
      useContextStore.setState({
        items: [
          {
            id: 'ctx-1',
            userId: 'user-123',
            category: 'values',
            content: 'Test value',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      await AsyncStorage.setItem('@north/session', JSON.stringify(mockSession));
      await AsyncStorage.setItem('@north/user', JSON.stringify(mockUser));
      await AsyncStorage.setItem('@north/theme', 'dark');

      // Verify initial state
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().session).toEqual(mockSession);

      // ============================================================
      // STEP 2: Logout
      // ============================================================
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await useAuthStore.getState().logout();

      // Verify logout cleared auth state
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();

      // Verify session removed from AsyncStorage
      const storedSession = await AsyncStorage.getItem('@north/session');
      const storedUser = await AsyncStorage.getItem('@north/user');
      expect(storedSession).toBeNull();
      expect(storedUser).toBeNull();

      // Verify theme preference preserved
      const theme = await AsyncStorage.getItem('@north/theme');
      expect(theme).toBe('dark');

      // Verify other stores were reset
      expect(useContextStore.getState().items).toEqual([]);

      // ============================================================
      // STEP 3: Login again
      // ============================================================
      // Mock successful login
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      // Mock profile fetch
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      // Verify login restored auth state
      const authState = useAuthStore.getState();
      expect(authState.user).not.toBeNull();
      expect(authState.user?.email).toBe('test@example.com');
      expect(authState.user?.name).toBe('Test User');
      expect(authState.session).not.toBeNull();
      expect(authState.session?.accessToken).toBe('access-token-123');
      expect(authState.error).toBeNull();

      // Verify session stored in AsyncStorage
      const newStoredSession = await AsyncStorage.getItem('@north/session');
      const newStoredUser = await AsyncStorage.getItem('@north/user');
      expect(newStoredSession).not.toBeNull();
      expect(newStoredUser).not.toBeNull();

      // Verify theme preference still preserved
      const themeAfterLogin = await AsyncStorage.getItem('@north/theme');
      expect(themeAfterLogin).toBe('dark');
    });

    it('should handle logout error and still allow login attempt', async () => {
      // ============================================================
      // STEP 1: Setup initial logged-in state
      // ============================================================
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      // ============================================================
      // STEP 2: Logout with error
      // ============================================================
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({
        error: { message: 'Network error during logout' },
      });

      await useAuthStore.getState().logout();

      // Verify error is set
      expect(useAuthStore.getState().error).toBe('Network error during logout');

      // ============================================================
      // STEP 3: Clear error and try to login
      // ============================================================
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();

      // Mock successful login
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      // Mock profile fetch
      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      // Verify login succeeded despite previous logout error
      const authState = useAuthStore.getState();
      expect(authState.user).not.toBeNull();
      expect(authState.session).not.toBeNull();
      expect(authState.error).toBeNull();
    });

    it('should handle login failure after successful logout', async () => {
      // ============================================================
      // STEP 1: Setup and logout
      // ============================================================
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      await useAuthStore.getState().logout();

      // Verify logout succeeded
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();

      // ============================================================
      // STEP 2: Attempt login with invalid credentials
      // ============================================================
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      });

      await useAuthStore.getState().login('test@example.com', 'wrongpassword');

      // Verify login failed with error
      const authState = useAuthStore.getState();
      expect(authState.user).toBeNull();
      expect(authState.session).toBeNull();
      expect(authState.error).toBe('Invalid login credentials');
    });

    it('should preserve theme preference through logout and login cycle', async () => {
      // ============================================================
      // STEP 1: Setup with theme preference
      // ============================================================
      await AsyncStorage.setItem('@north/theme', 'light');
      
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      // ============================================================
      // STEP 2: Logout
      // ============================================================
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      await useAuthStore.getState().logout();

      // Verify theme preserved after logout
      let theme = await AsyncStorage.getItem('@north/theme');
      expect(theme).toBe('light');

      // ============================================================
      // STEP 3: Login
      // ============================================================
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      // Verify theme still preserved after login
      theme = await AsyncStorage.getItem('@north/theme');
      expect(theme).toBe('light');
    });

    it('should allow multiple logout-login cycles', async () => {
      // Mock successful operations
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      // ============================================================
      // Cycle 1: Login → Logout
      // ============================================================
      await useAuthStore.getState().login('test@example.com', 'password123');
      expect(useAuthStore.getState().user).not.toBeNull();

      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().user).toBeNull();

      // ============================================================
      // Cycle 2: Login → Logout
      // ============================================================
      await useAuthStore.getState().login('test@example.com', 'password123');
      expect(useAuthStore.getState().user).not.toBeNull();

      await useAuthStore.getState().logout();
      expect(useAuthStore.getState().user).toBeNull();

      // ============================================================
      // Cycle 3: Login (final)
      // ============================================================
      await useAuthStore.getState().login('test@example.com', 'password123');
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(useAuthStore.getState().session).not.toBeNull();
    });
  });

  describe('Session Restoration After Logout-Login', () => {
    it('should restore session from AsyncStorage after login', async () => {
      // ============================================================
      // STEP 1: Logout (starting from logged-in state)
      // ============================================================
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      await useAuthStore.getState().logout();

      // ============================================================
      // STEP 2: Login
      // ============================================================
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      // ============================================================
      // STEP 3: Simulate app restart by restoring session
      // ============================================================
      // Clear in-memory state to simulate app restart
      useAuthStore.setState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });

      // Mock session restoration
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSupabaseSession },
        error: null,
      });

      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().restoreSession();

      // Verify session was restored
      const authState = useAuthStore.getState();
      expect(authState.user).not.toBeNull();
      expect(authState.session).not.toBeNull();
      expect(authState.user?.email).toBe('test@example.com');
    });
  });

  describe('Store State After Logout-Login', () => {
    it('should have clean store state after logout before login', async () => {
      // ============================================================
      // STEP 1: Setup with data in all stores
      // ============================================================
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
      });

      useContextStore.setState({
        items: [
          {
            id: 'ctx-1',
            userId: 'user-123',
            category: 'goals',
            content: 'Test goal',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      useCoachStore.setState({
        coaches: [
          {
            id: 'coach-1',
            name: 'Test Coach',
            icon: '🎯',
            systemPrompt: 'Test prompt',
            creatorId: 'user-123',
            isPublic: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      });

      // ============================================================
      // STEP 2: Logout
      // ============================================================
      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
      await useAuthStore.getState().logout();

      // ============================================================
      // STEP 3: Verify all stores are clean
      // ============================================================
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useContextStore.getState().items).toEqual([]);
      expect(useCoachStore.getState().coaches).toEqual([]);
      expect(useChatStore.getState().sessions).toEqual({});
      expect(useChatStore.getState().messages).toEqual({});

      // ============================================================
      // STEP 4: Login creates fresh state
      // ============================================================
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
        data: {
          session: mockSupabaseSession,
          user: mockSupabaseUser,
        },
        error: null,
      });

      const mockFrom = supabase.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { name: 'Test User' },
              error: null,
            }),
          }),
        }),
      });

      await useAuthStore.getState().login('test@example.com', 'password123');

      // Verify auth state is restored but other stores remain clean
      expect(useAuthStore.getState().user).not.toBeNull();
      expect(useAuthStore.getState().session).not.toBeNull();
      expect(useContextStore.getState().items).toEqual([]);
      expect(useCoachStore.getState().coaches).toEqual([]);
    });
  });
});
