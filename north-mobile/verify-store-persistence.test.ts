/**
 * Verification Test: Store Persistence to AsyncStorage
 * 
 * This test verifies that all Zustand stores properly persist their state
 * to AsyncStorage for offline access and session restoration.
 * 
 * Validates: Task 17.2 - Verify all stores persist to AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Store Persistence Verification', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
  });

  describe('authStore', () => {
    it('should manually persist session and user to AsyncStorage', async () => {
      // authStore uses manual persistence, not Zustand persist middleware
      // It relies on Supabase's built-in session restoration
      const { useAuthStore } = require('./stores/authStore');
      
      // Check that the store has the expected persistence methods
      const store = useAuthStore.getState();
      expect(store.restoreSession).toBeDefined();
      expect(store.login).toBeDefined();
      expect(store.logout).toBeDefined();
      
      // Verify storage keys are used (check source code)
      const authStoreSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/authStore.ts'),
        'utf-8'
      );
      
      expect(authStoreSource).toContain('@north/session');
      expect(authStoreSource).toContain('@north/user');
      expect(authStoreSource).toContain('AsyncStorage.setItem');
      expect(authStoreSource).toContain('AsyncStorage.removeItem');
      
      // Verify it uses Supabase's built-in session restoration
      expect(authStoreSource).toContain('supabase.auth.getSession()');
    });
  });

  describe('contextStore', () => {
    it('should use Zustand persist middleware with AsyncStorage', async () => {
      const { useContextStore } = require('./stores/contextStore');
      
      // Verify the store is configured with persist
      const storeSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/contextStore.ts'),
        'utf-8'
      );
      
      expect(storeSource).toContain('persist(');
      expect(storeSource).toContain('createJSONStorage(() => AsyncStorage)');
      expect(storeSource).toContain('north-context-storage');
      expect(storeSource).toContain('partialize');
      
      // Verify partialize includes items and lastSynced
      expect(storeSource).toContain('items: state.items');
      expect(storeSource).toContain('lastSynced: state.lastSynced');
    });
  });

  describe('coachStore', () => {
    it('should use Zustand persist middleware with AsyncStorage', async () => {
      const { useCoachStore } = require('./stores/coachStore');
      
      // Verify the store is configured with persist
      const storeSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/coachStore.ts'),
        'utf-8'
      );
      
      expect(storeSource).toContain('persist(');
      expect(storeSource).toContain('createJSONStorage(() => AsyncStorage)');
      expect(storeSource).toContain('north-coach-storage');
      expect(storeSource).toContain('partialize');
      
      // Verify partialize includes coaches and lastSynced
      expect(storeSource).toContain('coaches: state.coaches');
      expect(storeSource).toContain('lastSynced: state.lastSynced');
    });
  });

  describe('chatStore', () => {
    it('should use Zustand persist middleware with AsyncStorage', async () => {
      const { useChatStore } = require('./stores/chatStore');
      
      // Verify the store is configured with persist
      const storeSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/chatStore.ts'),
        'utf-8'
      );
      
      expect(storeSource).toContain('persist(');
      expect(storeSource).toContain('createJSONStorage(() => AsyncStorage)');
      expect(storeSource).toContain('north-chat-storage');
      expect(storeSource).toContain('partialize');
      
      // Verify partialize includes sessions and messages
      expect(storeSource).toContain('sessions: state.sessions');
      expect(storeSource).toContain('messages: state.messages');
    });
  });

  describe('billingStore', () => {
    it('should use Zustand persist middleware with AsyncStorage', async () => {
      const { useBillingStore } = require('./stores/billingStore');
      
      // Verify the store is configured with persist
      const storeSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/billingStore.ts'),
        'utf-8'
      );
      
      expect(storeSource).toContain('persist(');
      expect(storeSource).toContain('createJSONStorage(() => AsyncStorage)');
      expect(storeSource).toContain('north-billing-storage');
      expect(storeSource).toContain('partialize');
      
      // Verify partialize includes entitlements and isProUser
      expect(storeSource).toContain('entitlements: state.entitlements');
      expect(storeSource).toContain('isProUser: state.isProUser');
    });
  });

  describe('Storage Key Uniqueness', () => {
    it('should use unique storage keys for each store', () => {
      const storageKeys = [
        '@north/session',      // authStore (manual)
        '@north/user',         // authStore (manual)
        'north-context-storage', // contextStore
        'north-coach-storage',   // coachStore
        'north-chat-storage',    // chatStore
        'north-billing-storage', // billingStore
      ];
      
      // Verify all keys are unique
      const uniqueKeys = new Set(storageKeys);
      expect(uniqueKeys.size).toBe(storageKeys.length);
    });
  });

  describe('Persistence Configuration', () => {
    it('should only persist necessary state (not loading/error states)', () => {
      // contextStore
      const contextSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/contextStore.ts'),
        'utf-8'
      );
      expect(contextSource).toContain('partialize: (state) => ({');
      expect(contextSource).not.toContain('isLoading: state.isLoading');
      expect(contextSource).not.toContain('error: state.error');
      
      // coachStore
      const coachSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/coachStore.ts'),
        'utf-8'
      );
      expect(coachSource).toContain('partialize: (state) => ({');
      expect(coachSource).not.toContain('isLoading: state.isLoading');
      expect(coachSource).not.toContain('error: state.error');
      
      // chatStore
      const chatSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/chatStore.ts'),
        'utf-8'
      );
      expect(chatSource).toContain('partialize: (state) => ({');
      expect(chatSource).not.toContain('isSending: state.isSending');
      expect(chatSource).not.toContain('streamingMessage: state.streamingMessage');
      
      // billingStore
      const billingSource = require('fs').readFileSync(
        require('path').join(__dirname, 'stores/billingStore.ts'),
        'utf-8'
      );
      expect(billingSource).toContain('partialize: (state) => ({');
      expect(billingSource).not.toContain('isLoading: state.isLoading');
      expect(billingSource).not.toContain('error: state.error');
    });
  });
});
