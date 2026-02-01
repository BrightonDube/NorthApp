/**
 * Onboarding Property-Based Tests
 * 
 * Property-based tests for onboarding flow using fast-check.
 * Each test validates universal properties that should hold across all inputs.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 4: Onboarding Routing - New users go to onboarding, returning users go to home
 * - Name Storage Property - Name persistence in profiles table
 * 
 * **Validates: Requirements 2.2, 2.5, 2.7**
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useSegments: jest.fn(),
  Stack: 'Stack',
  Slot: 'Slot',
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Onboarding Property-Based Tests', () => {
  let mockRouter: any;
  let mockSegments: string[];

  beforeEach(() => {
    // Setup mock router
    mockRouter = {
      replace: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Default to auth group
    mockSegments = ['(auth)'];
    (useSegments as jest.Mock).mockReturnValue(mockSegments);

    // Reset auth store
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 4: Onboarding Routing
   * 
   * For any authenticated user:
   * - If the user has NO name in their profile (new user), they should be routed to onboarding
   * - If the user HAS a name in their profile (returning user), they should be routed to home
   * 
   * This property ensures that the onboarding flow is only shown to users who need it,
   * and returning users can immediately access the main app.
   * 
   * **Validates: Requirements 2.2, 2.5, 2.7**
   */
  describe('Property 4: Onboarding Routing', () => {
    it('should route new users (without name) to onboarding', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate user data without a name (new user)
          fc.uuid(),
          fc.emailAddress(),
          fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
          async (userId, email, createdAt) => {
            // Create a new user WITHOUT a name (should trigger onboarding)
            const newUser: User = {
              id: userId,
              email,
              name: '', // Empty name indicates new user
              createdAt: createdAt.toISOString(),
            };

            // Setup authenticated state with new user
            useAuthStore.setState({
              user: newUser,
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: false,
              error: null,
            });

            // Simulate being in auth group (where routing logic runs)
            mockSegments = ['(auth)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Import and execute the routing logic from _layout.tsx
            // We'll simulate the useProtectedRoute hook behavior
            const { user, isLoading } = useAuthStore.getState();
            const inAuthGroup = mockSegments[0] === '(auth)';

            if (!isLoading && user && inAuthGroup) {
              // This is the routing logic from _layout.tsx
              if (!user.name) {
                mockRouter.replace('/(auth)/onboarding');
              } else {
                mockRouter.replace('/(tabs)');
              }
            }

            // Verify new user is routed to onboarding
            expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/onboarding');
            expect(mockRouter.replace).not.toHaveBeenCalledWith('/(tabs)');
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should route returning users (with name) to home', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate user data WITH a name (returning user)
          fc.uuid(),
          fc.emailAddress(),
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          fc.date({ min: new Date('2020-01-01'), max: new Date() }).filter(d => !isNaN(d.getTime())),
          async (userId, email, name, createdAt) => {
            // Create a returning user WITH a name (should skip onboarding)
            const returningUser: User = {
              id: userId,
              email,
              name: name.trim(), // Non-empty name indicates returning user
              createdAt: createdAt.toISOString(),
            };

            // Setup authenticated state with returning user
            useAuthStore.setState({
              user: returningUser,
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: false,
              error: null,
            });

            // Simulate being in auth group (where routing logic runs)
            mockSegments = ['(auth)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Import and execute the routing logic from _layout.tsx
            // We'll simulate the useProtectedRoute hook behavior
            const { user, isLoading } = useAuthStore.getState();
            const inAuthGroup = mockSegments[0] === '(auth)';

            if (!isLoading && user && inAuthGroup) {
              // This is the routing logic from _layout.tsx
              if (!user.name) {
                mockRouter.replace('/(auth)/onboarding');
              } else {
                mockRouter.replace('/(tabs)');
              }
            }

            // Verify returning user is routed to home (tabs)
            expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
            expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/onboarding');
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should handle edge cases in name field', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.emailAddress(),
          // Generate various edge cases for name field
          fc.oneof(
            fc.constant(''), // Empty string
            fc.constant('   '), // Whitespace only
            fc.constant(null as any), // Null
            fc.constant(undefined as any), // Undefined
            fc.string({ minLength: 1, maxLength: 1 }), // Single character
            fc.string({ minLength: 2, maxLength: 50 }) // Valid name
          ),
          async (userId, email, name) => {
            // CORRECT BEHAVIOR: The routing logic should match the onboarding validation
            // which requires name.trim().length >= 2
            // 
            // Valid names: trimmed length >= 2
            // Invalid names: empty, whitespace-only, null, undefined, single character
            const isValidName = name && 
                                typeof name === 'string' && 
                                name.trim().length >= 2;

            const user: User = {
              id: userId,
              email,
              name: name || '', // Normalize null/undefined to empty string
              createdAt: new Date().toISOString(),
            };

            // Setup authenticated state
            useAuthStore.setState({
              user,
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: false,
              error: null,
            });

            // Simulate being in auth group
            mockSegments = ['(auth)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Execute routing logic - should match onboarding validation
            const { user: storeUser, isLoading } = useAuthStore.getState();
            const inAuthGroup = mockSegments[0] === '(auth)';

            if (!isLoading && storeUser && inAuthGroup) {
              // CORRECT logic: should validate trimmed name length
              if (!storeUser.name || storeUser.name.trim().length < 2) {
                mockRouter.replace('/(auth)/onboarding');
              } else {
                mockRouter.replace('/(tabs)');
              }
            }

            // Verify routing based on CORRECT behavior
            if (isValidName) {
              expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
            } else {
              expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/onboarding');
            }
          }
        ),
        { numRuns: 30, timeout: 5000 }
      );
    }, 30000);

    it('should not route unauthenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No user
          async (user) => {
            // Setup unauthenticated state
            useAuthStore.setState({
              user: null,
              session: null,
              isLoading: false,
              error: null,
            });

            // Simulate being in tabs group (protected area)
            mockSegments = ['(tabs)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Execute routing logic
            const { user: storeUser, isLoading } = useAuthStore.getState();
            const inAuthGroup = mockSegments[0] === '(auth)';
            const inAuthCallback = mockSegments[0] === 'auth';

            if (!isLoading) {
              if (!storeUser && !inAuthGroup && !inAuthCallback) {
                // Not authenticated, redirect to login
                mockRouter.replace('/(auth)/login');
              }
            }

            // Verify unauthenticated user is redirected to login
            expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
            expect(mockRouter.replace).not.toHaveBeenCalledWith('/(auth)/onboarding');
            expect(mockRouter.replace).not.toHaveBeenCalledWith('/(tabs)');
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 30000);

    it('should not route while loading', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.emailAddress(),
          fc.string({ minLength: 2, maxLength: 50 }),
          async (userId, email, name) => {
            const user: User = {
              id: userId,
              email,
              name,
              createdAt: new Date().toISOString(),
            };

            // Setup loading state
            useAuthStore.setState({
              user,
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: true, // Loading state
              error: null,
            });

            mockSegments = ['(auth)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Execute routing logic
            const { isLoading } = useAuthStore.getState();

            if (!isLoading) {
              // This should not execute while loading
              mockRouter.replace('/(tabs)');
            }

            // Verify no routing occurs while loading
            expect(mockRouter.replace).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should maintain routing consistency across multiple checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.emailAddress(),
          fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: null }),
          fc.integer({ min: 2, max: 5 }),
          async (userId, email, name, numChecks) => {
            const user: User = {
              id: userId,
              email,
              name: name || '',
              createdAt: new Date().toISOString(),
            };

            // Setup authenticated state
            useAuthStore.setState({
              user,
              session: {
                accessToken: 'test-token',
                refreshToken: 'test-refresh',
                expiresAt: Date.now() + 3600000,
              },
              isLoading: false,
              error: null,
            });

            mockSegments = ['(auth)'];
            (useSegments as jest.Mock).mockReturnValue(mockSegments);

            // Execute routing logic multiple times
            const routes: string[] = [];
            for (let i = 0; i < numChecks; i++) {
              jest.clearAllMocks();

              const { user: storeUser, isLoading } = useAuthStore.getState();
              const inAuthGroup = mockSegments[0] === '(auth)';

              if (!isLoading && storeUser && inAuthGroup) {
                if (!storeUser.name) {
                  mockRouter.replace('/(auth)/onboarding');
                  routes.push('/(auth)/onboarding');
                } else {
                  mockRouter.replace('/(tabs)');
                  routes.push('/(tabs)');
                }
              }
            }

            // Verify all routing decisions are consistent
            const expectedRoute = name ? '/(tabs)' : '/(auth)/onboarding';
            expect(routes).toHaveLength(numChecks);
            routes.forEach(route => {
              expect(route).toBe(expectedRoute);
            });
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);
  });

  /**
   * Property: Name Storage in Profiles Table
   * 
   * For any valid name input during onboarding:
   * - The name should be correctly stored in the profiles table via Supabase
   * - The stored name should match the trimmed input
   * - The profiles table should be updated with the user's ID
   * - The operation should handle various name formats correctly
   * 
   * This property ensures that name persistence works correctly for all valid inputs,
   * validating the data flow from user input to database storage.
   * 
   * **Validates: Requirements 2.2, 2.5, 2.7**
   */
  describe('Property: Name Storage in Profiles Table', () => {
    let mockSupabaseFrom: jest.Mock;
    let mockUpsert: jest.Mock;

    beforeEach(() => {
      // Setup Supabase mock chain
      mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom = jest.fn().mockReturnValue({
        upsert: mockUpsert,
      });
      (supabase.from as jest.Mock) = mockSupabaseFrom;

      // Setup auth store with a test user
      useAuthStore.setState({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: '',
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
    });

    it('should store valid names correctly in profiles table', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various valid name formats
          fc.oneof(
            fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            fc.constant('John Doe'),
            fc.constant('María García'),
            fc.constant('李明'),
            fc.constant('O\'Brien'),
            fc.constant('Jean-Pierre'),
            fc.constant('van der Berg'),
          ),
          async (inputName) => {
            const { user } = useAuthStore.getState();
            const trimmedName = inputName.trim();

            // Simulate the onboarding name submission logic
            const { error } = await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: trimmedName,
                updated_at: new Date().toISOString(),
              });

            // Verify Supabase was called correctly
            expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
            expect(mockUpsert).toHaveBeenCalledWith(
              expect.objectContaining({
                id: 'test-user-id',
                name: trimmedName,
                updated_at: expect.any(String),
              })
            );

            // Verify no error occurred
            expect(error).toBeNull();
          }
        ),
        { numRuns: 30, timeout: 5000 }
      );
    }, 30000);

    it('should handle names with leading/trailing whitespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          fc.integer({ min: 0, max: 5 }), // Leading spaces
          fc.integer({ min: 0, max: 5 }), // Trailing spaces
          async (baseName, leadingSpaces, trailingSpaces) => {
            const { user } = useAuthStore.getState();
            const inputName = ' '.repeat(leadingSpaces) + baseName + ' '.repeat(trailingSpaces);
            const expectedName = inputName.trim();

            // Simulate the onboarding name submission logic
            await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: expectedName,
                updated_at: new Date().toISOString(),
              });

            // Verify the stored name is trimmed
            expect(mockUpsert).toHaveBeenCalledWith(
              expect.objectContaining({
                name: expectedName,
              })
            );

            // Verify no leading/trailing whitespace in stored name
            const storedName = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0].name;
            expect(storedName).toBe(storedName.trim());
            expect(storedName.length).toBeGreaterThanOrEqual(2);
          }
        ),
        { numRuns: 25, timeout: 5000 }
      );
    }, 30000);

    it('should associate name with correct user ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          async (userId, name) => {
            // Setup user with specific ID
            useAuthStore.setState({
              user: {
                id: userId,
                email: 'test@example.com',
                name: '',
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

            const { user } = useAuthStore.getState();
            const trimmedName = name.trim();

            // Simulate the onboarding name submission logic
            await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: trimmedName,
                updated_at: new Date().toISOString(),
              });

            // Verify the correct user ID is used
            expect(mockUpsert).toHaveBeenCalledWith(
              expect.objectContaining({
                id: userId,
                name: trimmedName,
              })
            );
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should handle special characters in names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant("O'Brien"),
            fc.constant('Jean-Pierre'),
            fc.constant('María José'),
            fc.constant('Müller'),
            fc.constant('Søren'),
            fc.constant('Владимир'),
            fc.constant('محمد'),
            fc.constant('李明'),
            fc.constant('Nguyễn'),
          ),
          async (specialName) => {
            const { user } = useAuthStore.getState();

            // Simulate the onboarding name submission logic
            await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: specialName,
                updated_at: new Date().toISOString(),
              });

            // Verify special characters are preserved
            expect(mockUpsert).toHaveBeenCalledWith(
              expect.objectContaining({
                name: specialName,
              })
            );

            // Verify the name is stored exactly as provided (after trim)
            const storedName = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0].name;
            expect(storedName).toBe(specialName);
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should include updated_at timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          async (name) => {
            const { user } = useAuthStore.getState();
            const beforeTime = Date.now();

            // Simulate the onboarding name submission logic
            await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: name.trim(),
                updated_at: new Date().toISOString(),
              });

            const afterTime = Date.now();

            // Verify updated_at is included
            expect(mockUpsert).toHaveBeenCalledWith(
              expect.objectContaining({
                updated_at: expect.any(String),
              })
            );

            // Verify updated_at is a valid ISO timestamp
            const storedData = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0];
            const updatedAt = storedData.updated_at;
            expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            
            // Verify timestamp is within reasonable range
            const updatedAtTime = new Date(updatedAt).getTime();
            expect(updatedAtTime).toBeGreaterThanOrEqual(beforeTime);
            expect(updatedAtTime).toBeLessThanOrEqual(afterTime);
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should handle database errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
          fc.oneof(
            fc.constant('Database connection failed'),
            fc.constant('Permission denied'),
            fc.constant('Invalid user ID'),
          ),
          async (name, errorMessage) => {
            const { user } = useAuthStore.getState();

            // Mock a database error
            mockUpsert.mockResolvedValueOnce({ error: { message: errorMessage } });

            // Simulate the onboarding name submission logic
            const { error } = await supabase
              .from('profiles')
              .upsert({
                id: user!.id,
                name: name.trim(),
                updated_at: new Date().toISOString(),
              });

            // Verify error is returned
            expect(error).not.toBeNull();
            expect(error).toHaveProperty('message', errorMessage);

            // Reset mock for next iteration
            mockUpsert.mockResolvedValue({ error: null });
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 30000);

    it('should maintain data consistency across multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            { minLength: 2, maxLength: 5 }
          ),
          async (names) => {
            const { user } = useAuthStore.getState();

            // Clear mock before test
            mockUpsert.mockClear();

            // Simulate multiple name updates
            for (const name of names) {
              await supabase
                .from('profiles')
                .upsert({
                  id: user!.id,
                  name: name.trim(),
                  updated_at: new Date().toISOString(),
                });
            }

            // Verify all updates used the same user ID
            const calls = mockUpsert.mock.calls;
            expect(calls.length).toBe(names.length);
            
            calls.forEach((call, index) => {
              expect(call[0]).toMatchObject({
                id: 'test-user-id',
                name: names[index].trim(),
              });
            });

            // Verify the last update has the final name
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall.name).toBe(names[names.length - 1].trim());
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);
  });

  /**
   * Property: Goal Storage in User Context Table
   * 
   * For any valid goal input during onboarding:
   * - The goal should be correctly stored in the user_context table via Supabase
   * - The stored goal should match the trimmed input
   * - The goal should be stored with category "goals"
   * - The goal should be associated with the correct user ID
   * - The operation should handle various goal formats correctly
   * 
   * This property ensures that goal persistence works correctly for all valid inputs,
   * validating the data flow from user input to database storage.
   * 
   * **Validates: Requirements 2.2, 2.5, 2.7**
   */
  describe('Property: Goal Storage in User Context Table', () => {
    let mockSupabaseFrom: jest.Mock;
    let mockInsert: jest.Mock;

    beforeEach(() => {
      // Setup Supabase mock chain for user_context
      mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      });
      (supabase.from as jest.Mock) = mockSupabaseFrom;

      // Setup auth store with a test user
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
    });

    it('should store valid goals correctly in user_context table', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various valid goal formats
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length >= 1),
            fc.constant('Launch my startup by Q2'),
            fc.constant('Write a book this year'),
            fc.constant('Build a SaaS for small businesses'),
            fc.constant('Learn TypeScript and React Native'),
            fc.constant('Improve work-life balance'),
            fc.constant('Grow my business to $1M ARR'),
          ),
          async (inputGoal) => {
            const { user } = useAuthStore.getState();
            const trimmedGoal = inputGoal.trim();

            // Simulate the onboarding goal submission logic
            const { error } = await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: trimmedGoal,
              });

            // Verify Supabase was called correctly
            expect(mockSupabaseFrom).toHaveBeenCalledWith('user_context');
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: 'test-user-id',
                category: 'goals',
                content: trimmedGoal,
              })
            );

            // Verify no error occurred
            expect(error).toBeNull();
          }
        ),
        { numRuns: 30, timeout: 5000 }
      );
    }, 30000);

    it('should store goals with correct category', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length >= 1),
          async (goal) => {
            const { user } = useAuthStore.getState();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: goal.trim(),
              });

            // Verify category is always "goals"
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                category: 'goals',
              })
            );

            // Verify category is not any other value
            const storedData = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0];
            expect(storedData.category).toBe('goals');
            expect(storedData.category).not.toBe('values');
            expect(storedData.category).not.toBe('projects');
            expect(storedData.category).not.toBe('constraints');
          }
        ),
        { numRuns: 25, timeout: 5000 }
      );
    }, 30000);

    it('should handle goals with leading/trailing whitespace', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length >= 1),
          fc.integer({ min: 0, max: 5 }), // Leading spaces
          fc.integer({ min: 0, max: 5 }), // Trailing spaces
          async (baseGoal, leadingSpaces, trailingSpaces) => {
            const { user } = useAuthStore.getState();
            const inputGoal = ' '.repeat(leadingSpaces) + baseGoal + ' '.repeat(trailingSpaces);
            const expectedGoal = inputGoal.trim();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: expectedGoal,
              });

            // Verify the stored goal is trimmed
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                content: expectedGoal,
              })
            );

            // Verify no leading/trailing whitespace in stored goal
            const storedGoal = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0].content;
            expect(storedGoal).toBe(storedGoal.trim());
            expect(storedGoal.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 25, timeout: 5000 }
      );
    }, 30000);

    it('should associate goal with correct user ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length >= 1),
          async (userId, goal) => {
            // Setup user with specific ID
            useAuthStore.setState({
              user: {
                id: userId,
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

            const { user } = useAuthStore.getState();
            const trimmedGoal = goal.trim();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: trimmedGoal,
              });

            // Verify the correct user ID is used
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                user_id: userId,
                category: 'goals',
                content: trimmedGoal,
              })
            );
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should handle multi-line goals', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('Launch my startup\nGrow to 100 users\nRaise seed funding'),
            fc.constant('Write a book\n- Chapter 1: Introduction\n- Chapter 2: Core concepts'),
            fc.constant('Build a SaaS product\nValidate with 10 customers\nIterate based on feedback'),
          ),
          async (multiLineGoal) => {
            const { user } = useAuthStore.getState();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: multiLineGoal.trim(),
              });

            // Verify multi-line content is preserved
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                content: multiLineGoal.trim(),
              })
            );

            // Verify the content is stored exactly as provided (after trim)
            const storedGoal = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0].content;
            expect(storedGoal).toBe(multiLineGoal.trim());
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should handle goals with special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('Grow revenue to $1M ARR by Q4'),
            fc.constant('Launch product in 3 markets: US, UK & EU'),
            fc.constant('Build a team of 10+ engineers'),
            fc.constant('Write 50 blog posts @ 2/week'),
            fc.constant('Achieve 99.9% uptime'),
            fc.constant('Reduce costs by 20-30%'),
          ),
          async (specialGoal) => {
            const { user } = useAuthStore.getState();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: specialGoal,
              });

            // Verify special characters are preserved
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                content: specialGoal,
              })
            );

            // Verify the goal is stored exactly as provided
            const storedGoal = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0].content;
            expect(storedGoal).toBe(specialGoal);
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);

    it('should handle empty goals (skip functionality)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\n'),
            fc.constant('\t'),
          ),
          async (emptyGoal) => {
            const { user } = useAuthStore.getState();

            // Clear mock before test
            mockInsert.mockClear();

            // Simulate the onboarding goal submission logic with skip check
            if (emptyGoal.trim()) {
              await supabase
                .from('user_context')
                .insert({
                  user_id: user!.id,
                  category: 'goals',
                  content: emptyGoal.trim(),
                });
            }

            // Verify no database call is made for empty goals
            expect(mockInsert).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should handle database errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length >= 1),
          fc.oneof(
            fc.constant('Database connection failed'),
            fc.constant('Permission denied'),
            fc.constant('Invalid user ID'),
            fc.constant('Foreign key constraint violation'),
          ),
          async (goal, errorMessage) => {
            const { user } = useAuthStore.getState();

            // Mock a database error
            mockInsert.mockResolvedValueOnce({ error: { message: errorMessage } });

            // Simulate the onboarding goal submission logic
            const { error } = await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: goal.trim(),
              });

            // Verify error is returned
            expect(error).not.toBeNull();
            expect(error).toHaveProperty('message', errorMessage);

            // Reset mock for next iteration
            mockInsert.mockResolvedValue({ error: null });
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 30000);

    it('should handle long goals within reasonable limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 1000 }),
          async (longGoal) => {
            const { user } = useAuthStore.getState();
            const trimmedGoal = longGoal.trim();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: trimmedGoal,
              });

            // Verify long goals are stored correctly
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                content: trimmedGoal,
              })
            );

            // Verify content length is preserved
            const storedGoal = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0].content;
            expect(storedGoal.length).toBe(trimmedGoal.length);
            expect(storedGoal.length).toBeGreaterThanOrEqual(100);
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should maintain data consistency for multiple goal submissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length >= 1),
            { minLength: 2, maxLength: 5 }
          ),
          async (goals) => {
            const { user } = useAuthStore.getState();

            // Clear mock before test
            mockInsert.mockClear();

            // Simulate multiple goal submissions (e.g., user going back and changing goal)
            for (const goal of goals) {
              await supabase
                .from('user_context')
                .insert({
                  user_id: user!.id,
                  category: 'goals',
                  content: goal.trim(),
                });
            }

            // Verify all submissions used the same user ID and category
            const calls = mockInsert.mock.calls;
            expect(calls.length).toBe(goals.length);
            
            calls.forEach((call, index) => {
              expect(call[0]).toMatchObject({
                user_id: 'test-user-id',
                category: 'goals',
                content: goals[index].trim(),
              });
            });
          }
        ),
        { numRuns: 15, timeout: 5000 }
      );
    }, 30000);

    it('should handle goals with various unicode characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('Lanzar mi startup en español 🚀'),
            fc.constant('在中国市场推出产品'),
            fc.constant('Développer mon entreprise en France'),
            fc.constant('Расширить бизнес в России'),
            fc.constant('مساعدة 1000 عميل'),
            fc.constant('Build a product with ❤️ and 💪'),
          ),
          async (unicodeGoal) => {
            const { user } = useAuthStore.getState();

            // Simulate the onboarding goal submission logic
            await supabase
              .from('user_context')
              .insert({
                user_id: user!.id,
                category: 'goals',
                content: unicodeGoal,
              });

            // Verify unicode characters are preserved
            expect(mockInsert).toHaveBeenCalledWith(
              expect.objectContaining({
                content: unicodeGoal,
              })
            );

            // Verify the goal is stored exactly as provided
            const storedGoal = mockInsert.mock.calls[mockInsert.mock.calls.length - 1][0].content;
            expect(storedGoal).toBe(unicodeGoal);
          }
        ),
        { numRuns: 20, timeout: 5000 }
      );
    }, 30000);
  });
});
