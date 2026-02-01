/**
 * Centralized Logout Utility
 * 
 * Provides a single function to clear all stores and AsyncStorage on logout.
 * This avoids circular dependency issues with dynamic imports.
 * 
 * Validates: Requirements 15.3, 15.6, 48
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme storage key that should be preserved
const THEME_STORAGE_KEY = '@north/theme';

/**
 * Clear all AsyncStorage keys except theme preference
 * 
 * @returns Promise that resolves when storage is cleared
 */
export async function clearStorageExceptTheme(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove = allKeys.filter(key => key !== THEME_STORAGE_KEY);
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error('[Logout] Error clearing AsyncStorage:', error);
    throw error;
  }
}

/**
 * Reset all Zustand stores to initial state
 * 
 * This function is called by authStore.logout() to clear all app state.
 * It imports stores directly to avoid circular dependencies.
 * 
 * IMPORTANT: This must be called BEFORE clearStorageExceptTheme() to ensure
 * stores are reset before AsyncStorage is cleared.
 */
export async function resetAllStores(): Promise<void> {
  try {
    // Import stores
    const { useContextStore } = require('../stores/contextStore');
    const { useCoachStore } = require('../stores/coachStore');
    const { useChatStore } = require('../stores/chatStore');
    const { useBillingStore } = require('../stores/billingStore');

    // Reset all stores - this clears state and removes persisted storage
    useContextStore.getState().reset();
    useCoachStore.getState().reset();
    useChatStore.getState().reset();
    useBillingStore.getState().reset();
    
    // Logout from RevenueCat
    await useBillingStore.getState().logout();
    
    // Wait a bit for AsyncStorage operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.error('[Logout] Error resetting stores:', error);
    // Don't throw - we want logout to succeed even if store reset fails
  }
}
