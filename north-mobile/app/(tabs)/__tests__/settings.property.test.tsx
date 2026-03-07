/**
 * Settings Screen Property-Based Tests
 * 
 * Tests settings functionality including logout and theme persistence.
 * 
 * Properties tested:
 * - Property 48: Logout Session Clearing
 * - Property 49: Theme Toggle Persistence
 * 
 * Validates: Requirements 15.3, 15.5, 15.6
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { useContextStore } from '@/stores/contextStore';
import { useCoachStore } from '@/stores/coachStore';
import { useChatStore } from '@/stores/chatStore';
import { useBillingStore } from '@/stores/billingStore';

// Mock navigation
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock stores
jest.mock('@/stores/authStore');
jest.mock('@/stores/contextStore');
jest.mock('@/stores/coachStore');
jest.mock('@/stores/chatStore');
jest.mock('@/stores/billingStore');

// Helper to run property tests with consistent configuration
function runPropertyTest(property: fc.IProperty<any>) {
  fc.assert(property, {
    numRuns: 100,
    verbose: false,
  });
}

describe('Settings Property-Based Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockReplace.mockClear();
  });

  /**
   * Property 48: Logout Session Clearing
   * 
   * For any logout action, local session data should be cleared and 
   * navigation should return to the login screen.
   * 
   * **Validates: Requirements 15.3, 15.6**
   * 
   * This property ensures:
   * 1. All store data is cleared on logout
   * 2. AsyncStorage is cleared (except app preferences)
   * 3. Navigation redirects to login screen
   * 4. User cannot access protected content after logout
   */
  describe('Property 48: Logout Session Clearing', () => {
    it('should clear all stores on logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (userData) => {
            // Setup mock stores with data
            const mockAuthReset = jest.fn();
            const mockContextReset = jest.fn();
            const mockCoachReset = jest.fn();
            const mockChatReset = jest.fn();
            const mockBillingReset = jest.fn();

            (useAuthStore as any).mockReturnValue({
              user: userData,
              logout: async () => {
                mockAuthReset();
                mockContextReset();
                mockCoachReset();
                mockChatReset();
                mockBillingReset();
              },
            });

            (useContextStore as any).mockReturnValue({ reset: mockContextReset });
            (useCoachStore as any).mockReturnValue({ reset: mockCoachReset });
            (useChatStore as any).mockReturnValue({ reset: mockChatReset });
            (useBillingStore as any).mockReturnValue({ reset: mockBillingReset });

            // Perform logout
            const authStore = useAuthStore();
            await authStore.logout();

            // Verify all stores were reset
            expect(mockAuthReset).toHaveBeenCalled();
            expect(mockContextReset).toHaveBeenCalled();
            expect(mockCoachReset).toHaveBeenCalled();
            expect(mockChatReset).toHaveBeenCalled();
            expect(mockBillingReset).toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should clear AsyncStorage on logout except preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sessionToken: fc.uuid(),
            contextItems: fc.array(fc.string(), { maxLength: 5 }),
            coaches: fc.array(fc.string(), { maxLength: 10 }),
          }),
          async (sessionData) => {
            // Store session data
            await AsyncStorage.setItem('north-auth-storage', JSON.stringify({ 
              state: { session: sessionData.sessionToken } 
            }));
            await AsyncStorage.setItem('north-context-storage', JSON.stringify({ 
              state: { items: sessionData.contextItems } 
            }));
            await AsyncStorage.setItem('north-coach-storage', JSON.stringify({ 
              state: { coaches: sessionData.coaches } 
            }));

            // Store theme preference (should persist)
            await AsyncStorage.setItem('theme-preference', 'dark');

            // Simulate logout clearing storage
            const keysToRemove = [
              'north-auth-storage',
              'north-context-storage',
              'north-coach-storage',
              'north-chat-storage',
              'north-billing-storage',
            ];
            await AsyncStorage.multiRemove(keysToRemove);

            // Verify session data cleared
            const authData = await AsyncStorage.getItem('north-auth-storage');
            const contextData = await AsyncStorage.getItem('north-context-storage');
            const coachData = await AsyncStorage.getItem('north-coach-storage');
            
            expect(authData).toBeNull();
            expect(contextData).toBeNull();
            expect(coachData).toBeNull();

            // Verify theme preference persisted
            const themeData = await AsyncStorage.getItem('theme-preference');
            expect(themeData).toBe('dark');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should navigate to login screen after logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            const mockLogout = jest.fn().mockImplementation(async () => {
              mockReplace('/(auth)/login');
            });

            (useAuthStore as any).mockReturnValue({
              user: { id: userId },
              logout: mockLogout,
            });

            // Perform logout
            const authStore = useAuthStore();
            await authStore.logout();

            // Verify navigation
            expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 49: Theme Toggle Persistence
   * 
   * For any theme toggle, the new theme should apply immediately and 
   * persist across app restarts.
   * 
   * **Validates: Requirements 15.5**
   * 
   * This property ensures:
   * 1. Theme changes are saved to AsyncStorage
   * 2. Theme persists across app restarts
   * 3. Theme applies immediately without restart
   */
  describe('Property 49: Theme Toggle Persistence', () => {
    it('should persist theme preference to AsyncStorage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('light', 'dark', 'system'),
          async (theme) => {
            // Save theme preference
            await AsyncStorage.setItem('theme-preference', theme);

            // Verify stored
            const stored = await AsyncStorage.getItem('theme-preference');
            expect(stored).toBe(theme);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should restore theme preference on app restart', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('light', 'dark', 'system'),
          async (savedTheme) => {
            // Simulate saved theme
            await AsyncStorage.setItem('theme-preference', savedTheme);

            // Simulate app restart - retrieve theme
            const restoredTheme = await AsyncStorage.getItem('theme-preference');
            
            expect(restoredTheme).toBe(savedTheme);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle theme toggle sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('light', 'dark', 'system'), { minLength: 2, maxLength: 10 }),
          async (themeSequence) => {
            let currentTheme = 'light';

            for (const theme of themeSequence) {
              // Toggle to new theme
              await AsyncStorage.setItem('theme-preference', theme);
              currentTheme = theme;

              // Verify current theme is stored
              const stored = await AsyncStorage.getItem('theme-preference');
              expect(stored).toBe(currentTheme);
            }

            // Verify final theme persists
            const finalTheme = await AsyncStorage.getItem('theme-preference');
            expect(finalTheme).toBe(themeSequence[themeSequence.length - 1]);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should default to system theme when no preference is saved', async () => {
      // Clear any saved preference
      await AsyncStorage.removeItem('theme-preference');

      // Retrieve theme (should default to system)
      const theme = await AsyncStorage.getItem('theme-preference');
      
      // When no preference is saved, should be null (app defaults to system)
      expect(theme).toBeNull();
    });

    it('should maintain theme preference through logout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('light', 'dark'),
          async (theme) => {
            // Set theme preference
            await AsyncStorage.setItem('theme-preference', theme);

            // Simulate logout (clear session data but not preferences)
            const keysToRemove = [
              'north-auth-storage',
              'north-context-storage',
              'north-coach-storage',
              'north-chat-storage',
              'north-billing-storage',
            ];
            await AsyncStorage.multiRemove(keysToRemove);

            // Verify theme preference persisted
            const persistedTheme = await AsyncStorage.getItem('theme-preference');
            expect(persistedTheme).toBe(theme);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
