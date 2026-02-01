/**
 * Authentication Store Property-Based Tests
 * 
 * Property-based tests for authStore using fast-check.
 * Each test validates universal properties that should hold across all inputs.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 1: Session Persistence Round Trip
 * - Property 2: Invalid Credentials Rejection
 * - Property 3: No Anonymous Access
 * - Property 57: Session Token Persistence
 * 
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 18.2
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, setupAuthListener, useIsAuthenticated } from '../authStore';
import { supabase } from '@/lib/supabase';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
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

// Mock logout helper
jest.mock('@/lib/logout', () => ({
  resetAllStores: jest.fn().mockResolvedValue(undefined),
  clearStorageExceptTheme: jest.fn().mockResolvedValue(undefined),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const mockImpl = {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  };
  return {
    __esModule: true,
    default: mockImpl,
    ...mockImpl,
  };
});

describe('AuthStore Property-Based Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });
    
    // Clear AsyncStorage
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
  });

  /**
   * Property 1: Session Persistence Round Trip
   * 
   * For any valid authentication, creating a session then restarting the app
   * should restore the authenticated state without requiring re-login.
   * 
   * Validates: Requirements 1.2, 1.3
   */
  describe('Property 1: Session Persistence Round Trip', () => {
    it('should restore session after app restart for any valid authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid email and password
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 50 }),
          fc.uuid(),
          fc.string({ minLength: 20, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'a')), // Alphanumeric token
          async (email, password, userId, accessToken) => {
            // Setup: Mock successful authentication
            const mockSession: SupabaseSession = {
              access_token: accessToken,
              refresh_token: 'refresh_token_' + userId,
              expires_at: Date.now() + 3600000,
              expires_in: 3600,
              token_type: 'bearer',
              user: {
                id: userId,
                email,
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
              } as SupabaseUser,
            };

            const mockProfile = {
              name: 'Test User',
            };

            (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
              data: { session: mockSession, user: mockSession.user },
              error: null,
            });

            (supabase.from as jest.Mock).mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
                }),
              }),
            });

            // Step 1: Login
            const { result: loginResult } = renderHook(() => useAuthStore());
            
            await act(async () => {
              await loginResult.current.login(email, password);
            });

            // Verify login succeeded
            expect(loginResult.current.user).not.toBeNull();
            expect(loginResult.current.session).not.toBeNull();
            expect(loginResult.current.user?.email).toBe(email);

            // Verify session was persisted to AsyncStorage
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
              '@north/session',
              expect.stringContaining(accessToken)
            );
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
              '@north/user',
              expect.stringContaining(email)
            );

            // Step 2: Simulate app restart by resetting store
            useAuthStore.setState({
              user: null,
              session: null,
              isLoading: false,
              error: null,
            });

            // Mock AsyncStorage to return the persisted session
            (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
              if (key === '@north/session') {
                return Promise.resolve(JSON.stringify({
                  accessToken,
                  refreshToken: 'refresh_token_' + userId,
                  expiresAt: Date.now() + 3600000,
                }));
              }
              if (key === '@north/user') {
                return Promise.resolve(JSON.stringify({
                  id: userId,
                  email,
                  name: 'Test User',
                  createdAt: new Date().toISOString(),
                }));
              }
              return Promise.resolve(null);
            });

            // Mock Supabase session restoration
            (supabase.auth.getSession as jest.Mock).mockResolvedValue({
              data: { session: mockSession },
              error: null,
            });

            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: mockSession.user },
              error: null,
            });

            // Step 3: Restore session
            const { result: restoreResult } = renderHook(() => useAuthStore());
            
            await act(async () => {
              await restoreResult.current.restoreSession();
            });

            // Verify session was restored
            await waitFor(() => {
              expect(restoreResult.current.user).not.toBeNull();
              expect(restoreResult.current.session).not.toBeNull();
              expect(restoreResult.current.user?.email).toBe(email);
              expect(restoreResult.current.session?.accessToken).toBe(accessToken);
            });
          }
        ),
        { numRuns: 10 } // Reduced runs for async tests
      );
    });
  });

  /**
   * Property 2: Invalid Credentials Rejection
   * 
   * For any invalid credentials (wrong password, non-existent email, malformed input),
   * authentication should fail with a descriptive error and maintain the login screen.
   * 
   * Validates: Requirements 1.4
   */
  describe('Property 2: Invalid Credentials Rejection', () => {
    it('should reject invalid credentials with descriptive error', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various invalid credential combinations
          fc.oneof(
            // Invalid email format
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('@')),
            // Empty email
            fc.constant(''),
            // Valid email (will be rejected by server)
            fc.emailAddress()
          ),
          fc.oneof(
            // Empty password
            fc.constant(''),
            // Too short password
            fc.string({ maxLength: 5 }),
            // Any password (will be rejected by server)
            fc.string({ minLength: 1, maxLength: 50 })
          ),
          async (email, password) => {
            // Mock authentication failure
            const errorMessage = 'Invalid login credentials';
            (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
              data: { session: null, user: null },
              error: { message: errorMessage },
            });

            const { result } = renderHook(() => useAuthStore());

            // Attempt login
            await act(async () => {
              await result.current.login(email, password);
            });

            // Verify authentication failed
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
            expect(result.current.error).toBe(errorMessage);
            expect(result.current.isLoading).toBe(false);

            // Verify no session was persisted
            expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
              '@north/session',
              expect.anything()
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle various Supabase error messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }),
          fc.oneof(
            fc.constant('Invalid login credentials'),
            fc.constant('Email not confirmed'),
            fc.constant('User not found'),
            fc.constant('Too many requests'),
            fc.constant('Network error')
          ),
          async (email, password, errorMessage) => {
            // Mock specific error
            (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
              data: { session: null, user: null },
              error: { message: errorMessage },
            });

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
              await result.current.login(email, password);
            });

            // Verify error is displayed to user
            expect(result.current.error).toBe(errorMessage);
            expect(result.current.user).toBeNull();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 3: No Anonymous Access
   * 
   * For any protected route or feature, accessing it without authentication
   * should result in unauthenticated state.
   * 
   * Validates: Requirements 1.5
   */
  describe('Property 3: No Anonymous Access', () => {
    it('should maintain unauthenticated state without valid session', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various scenarios of missing/invalid session data
          fc.oneof(
            fc.constant(null), // No session
            fc.constant(undefined), // Undefined session
            fc.constant(''), // Empty string
            fc.constant('invalid-json'), // Invalid JSON
          ),
          async (invalidSessionData) => {
            // Mock AsyncStorage to return invalid session
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(invalidSessionData);

            // Mock Supabase to return no session
            (supabase.auth.getSession as jest.Mock).mockResolvedValue({
              data: { session: null },
              error: null,
            });

            const { result } = renderHook(() => useAuthStore());

            // Attempt to restore session
            await act(async () => {
              await result.current.restoreSession();
            });

            // Verify user remains unauthenticated
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should verify authentication state using useIsAuthenticated hook', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (shouldBeAuthenticated) => {
            // Setup store state
            if (shouldBeAuthenticated) {
              useAuthStore.setState({
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
                  name: 'Test User',
                  createdAt: new Date().toISOString(),
                },
                session: {
                  accessToken: 'test-token',
                  refreshToken: 'test-refresh',
                  expiresAt: Date.now() + 3600000,
                },
                isLoading: false,
                error: null,
              });
            } else {
              useAuthStore.setState({
                user: null,
                session: null,
                isLoading: false,
                error: null,
              });
            }

            const { result } = renderHook(() => useIsAuthenticated());

            // Verify authentication state matches expectation
            expect(result.current).toBe(shouldBeAuthenticated);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 57: Session Token Persistence
   * 
   * For any successful authentication, the session token should be persisted
   * to local storage.
   * 
   * Validates: Requirements 18.2
   */
  describe('Property 57: Session Token Persistence', () => {
    it('should persist session token to AsyncStorage on successful login', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8 }),
          fc.uuid(),
          fc.string({ minLength: 20, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'a')), // Alphanumeric token
          fc.string({ minLength: 20, maxLength: 100 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'a')), // Alphanumeric token
          async (email, password, userId, accessToken, refreshToken) => {
            // Clear mocks for this iteration
            jest.clearAllMocks();
            
            // Mock successful authentication
            const mockSession: SupabaseSession = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Date.now() + 3600000,
              expires_in: 3600,
              token_type: 'bearer',
              user: {
                id: userId,
                email,
                created_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
              } as SupabaseUser,
            };

            (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
              data: { session: mockSession, user: mockSession.user },
              error: null,
            });

            (supabase.from as jest.Mock).mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { name: 'Test User' },
                    error: null,
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
              await result.current.login(email, password);
            });

            // Verify session was persisted with correct tokens
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
              '@north/session',
              expect.any(String)
            );

            // Parse the persisted session and verify tokens
            const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
            const sessionCall = setItemCalls.find(call => call[0] === '@north/session');
            expect(sessionCall).toBeDefined();

            const persistedSession = JSON.parse(sessionCall[1]);
            expect(persistedSession.accessToken).toBe(accessToken);
            expect(persistedSession.refreshToken).toBe(refreshToken);
            expect(persistedSession.expiresAt).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should clear session token from AsyncStorage on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.emailAddress(),
          async (userId, email) => {
            // Setup authenticated state
            useAuthStore.setState({
              user: {
                id: userId,
                email,
                name: 'Test User',
                createdAt: new Date().toISOString(),
              },
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: false,
              error: null,
            });

            // Mock successful logout
            (supabase.auth.signOut as jest.Mock).mockResolvedValue({
              error: null,
            });

            const { result } = renderHook(() => useAuthStore());

            await act(async () => {
              await result.current.logout();
            });

            // Verify session was removed from AsyncStorage
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@north/session');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@north/user');

            // Verify state was cleared
            expect(result.current.user).toBeNull();
            expect(result.current.session).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
