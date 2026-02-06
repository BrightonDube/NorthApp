/**
 * Billing Store
 * 
 * Manages subscription state and in-app purchases using RevenueCat.
 * Provides entitlement checking, paywall display, and purchase restoration.
 * 
 * Validates: Requirements 12.1, 12.2, 12.3, 12.6, 12.7
 * 
 * @see https://www.revenuecat.com/docs/getting-started/installation/react-native
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import Constants from 'expo-constants';
import type { BillingStore, Entitlements } from '@/types';

// RevenueCat API keys from environment - Get dynamically to support tests
const getApiKey = () => process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

// Entitlement identifier configured in RevenueCat dashboard
const PRO_ENTITLEMENT_ID = 'pro';

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 * 
 * Validates: Requirements 12.1
 */
let isInitialized = false;
/**
 * Network status listener unsubscribe function
 */
let customerInfoUpdateListener: (() => void) | null = null;

/**
 * Reset initialization state (for testing only)
 */
export function resetInitialization() {
  isInitialized = false;
  customerInfoUpdateListener = null;
}

export async function initializeRevenueCat(userId?: string): Promise<void> {
  // Skip initialization in Expo Go - RevenueCat doesn't work there
  if (Constants.appOwnership === 'expo') {
    console.log('[BillingStore] Expo Go detected. Skipping RevenueCat initialization.');
    isInitialized = true; // Mark as initialized to prevent repeated attempts
    return;
  }

  if (isInitialized) {
    // If already initialized but we have a new user, log in
    if (userId) {
      try {
        await Purchases.logIn(userId);
      } catch (error) {
        console.error('[BillingStore] Error logging in user:', error);
      }
    }
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_revenuecat_api_key_here') {
    console.warn('[BillingStore] RevenueCat API key not configured');
    return;
  }

  try {
    // Set log level for debugging (reduce in production)
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure RevenueCat with platform-specific API key
    // Note: In production, you might have different keys for iOS/Android
    await Purchases.configure({
      apiKey,
      appUserID: userId, // Optional: Supabase user ID for cross-platform sync
    });

    // Set up listener for entitlement changes (Requirement 12.7)
    setupCustomerInfoUpdateListener();

    isInitialized = true;
    console.log('[BillingStore] RevenueCat initialized successfully');
  } catch (error) {
    console.error('[BillingStore] Error initializing RevenueCat:', error);
    throw error;
  }
}

/**
 * Setup listener for customer info updates
 * This listens for entitlement changes from RevenueCat (e.g., purchases, renewals, expirations)
 * 
 * Validates: Requirement 12.7 - Listen for entitlement changes
 */
function setupCustomerInfoUpdateListener() {
  if (customerInfoUpdateListener) {
    return; // Already set up
  }

  // The listener returns void, so we wrap it to match our type
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    console.log('[BillingStore] Customer info updated from RevenueCat');
    const entitlements = convertToEntitlements(customerInfo);
    
    // Update store with new entitlements
    useBillingStore.setState({
      entitlements,
      isProUser: entitlements.pro.isActive,
      lastSynced: Date.now(),
    });
  });
  
  // Mark as initialized (RevenueCat doesn't provide an unsubscribe function)
  customerInfoUpdateListener = () => {
    // No-op: RevenueCat manages listener lifecycle internally
  };
}

/**
 * Convert RevenueCat CustomerInfo to our Entitlements type
 */
function convertToEntitlements(customerInfo: CustomerInfo): Entitlements {
  const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  
  return {
    pro: {
      isActive: !!proEntitlement,
      expirationDate: proEntitlement?.expirationDate || null,
    },
  };
}

/**
 * Billing Store State & Actions Interface (extended for internal use)
 */
interface BillingStoreInternal extends BillingStore {
  offerings: PurchasesOffering | null;
  currentPackage: PurchasesPackage | null;
  paywallFeature: string | null;
  isPaywallVisible: boolean;
  error: string | null;
  lastSynced: number | null;
  
  // Additional internal actions
  initialize: (userId?: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  hidePaywall: () => void;
  logout: () => Promise<void>;
  checkProAccess: () => boolean;
  reset: () => void;
}

/**
 * Billing Store
 * 
 * Manages all subscription and in-app purchase functionality:
 * - RevenueCat SDK initialization
 * - Entitlement fetching and caching (Requirement 12.7)
 * - Paywall display for gated features
 * - Purchase flow handling
 * - Subscription restoration
 * - Offline entitlement caching (Requirement 12.7)
 * - Real-time entitlement change listening (Requirement 12.7)
 */
export const useBillingStore = create<BillingStoreInternal>()(
  persist(
    (set, get) => ({
      // State
      entitlements: null,
      isProUser: false,
      isLoading: false,
      offerings: null,
      currentPackage: null,
      paywallFeature: null,
      isPaywallVisible: false,
      error: null,
      lastSynced: null,

  /**
   * Initialize RevenueCat and fetch initial entitlements
   */
  initialize: async (userId?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await initializeRevenueCat(userId);
      
      // Fetch entitlements after initialization
      await get().fetchEntitlements();
      
      // Prefetch offerings for faster paywall display
      await get().fetchOfferings();
    } catch (error) {
      console.error('[BillingStore] Initialization error:', error);
      set({ error: 'Failed to initialize billing' });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Fetch current entitlements from RevenueCat
   * Updates isProUser based on active entitlements
   */
  fetchEntitlements: async () => {
    if (!isInitialized) {
      console.warn('[BillingStore] Cannot fetch entitlements - not initialized');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlements = convertToEntitlements(customerInfo);
      
      set({
        entitlements,
        isProUser: entitlements.pro.isActive,
        isLoading: false,
        lastSynced: Date.now(),
      });

      console.log('[BillingStore] Entitlements fetched:', {
        isProUser: entitlements.pro.isActive,
        expirationDate: entitlements.pro.expirationDate,
      });
    } catch (error) {
      console.error('[BillingStore] Error fetching entitlements:', error);
      set({ 
        error: 'Failed to fetch subscription status',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch available offerings/packages for purchase
   */
  fetchOfferings: async () => {
    if (!isInitialized) {
      return;
    }

    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current) {
        set({ offerings: offerings.current });
        console.log('[BillingStore] Offerings fetched:', offerings.current.identifier);
      }
    } catch (error) {
      console.error('[BillingStore] Error fetching offerings:', error);
    }
  },

  /**
   * Show paywall modal for a specific feature
   * @param feature - The feature name to display in paywall (e.g., "coach_creation")
   */
  showPaywall: (feature: string) => {
    set({ 
      paywallFeature: feature,
      isPaywallVisible: true,
    });
  },

  /**
   * Hide paywall modal
   */
  hidePaywall: () => {
    set({ 
      paywallFeature: null,
      isPaywallVisible: false,
    });
  },

  /**
   * Purchase a specific package
   * @returns true if purchase succeeded, false otherwise
   * 
   * Validates: Requirement 12.6 - Refresh entitlements immediately after purchase
   */
  purchasePackage: async (pkg: PurchasesPackage) => {
    if (!isInitialized) {
      Alert.alert('Error', 'Billing not initialized. Please try again.');
      return false;
    }

    set({ isLoading: true, error: null });

    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const entitlements = convertToEntitlements(customerInfo);
      
      set({
        entitlements,
        isProUser: entitlements.pro.isActive,
        isLoading: false,
        isPaywallVisible: false,
        paywallFeature: null,
        lastSynced: Date.now(),
      });

      // Explicitly refresh entitlements to ensure we have the latest state (Requirement 12.6)
      // This provides an additional layer of verification beyond the purchase response
      await get().fetchEntitlements();

      if (entitlements.pro.isActive) {
        console.log('[BillingStore] Purchase successful - user is now Pro');
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Check if user cancelled
      if (error.userCancelled) {
        console.log('[BillingStore] User cancelled purchase');
        set({ isLoading: false });
        return false;
      }

      console.error('[BillingStore] Purchase error:', error);
      set({ 
        error: error.message || 'Purchase failed',
        isLoading: false,
      });
      
      Alert.alert(
        'Purchase Failed',
        'There was an error processing your purchase. Please try again.'
      );
      
      return false;
    }
  },

  /**
   * Restore previous purchases
   * Useful for users who reinstall the app or switch devices
   * 
   * Validates: Requirement 12.6 - Refresh entitlements immediately after purchase/restore
   */
  restorePurchases: async () => {
    if (!isInitialized) {
      Alert.alert('Error', 'Billing not initialized. Please try again.');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlements = convertToEntitlements(customerInfo);
      
      set({
        entitlements,
        isProUser: entitlements.pro.isActive,
        isLoading: false,
        lastSynced: Date.now(),
      });

      // Explicitly refresh entitlements to ensure we have the latest state (Requirement 12.6)
      await get().fetchEntitlements();

      if (entitlements.pro.isActive) {
        Alert.alert('Success', 'Your Pro subscription has been restored!');
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }

      console.log('[BillingStore] Purchases restored:', {
        isProUser: entitlements.pro.isActive,
      });
    } catch (error: any) {
      console.error('[BillingStore] Restore error:', error);
      set({ 
        error: 'Failed to restore purchases',
        isLoading: false,
      });
      
      Alert.alert(
        'Restore Failed',
        'There was an error restoring your purchases. Please try again.'
      );
    }
  },

  /**
   * Log out current user from RevenueCat
   * Should be called when user signs out of the app
   */
  logout: async () => {
    if (!isInitialized) {
      return;
    }

    try {
      await Purchases.logOut();
      set({
        entitlements: null,
        isProUser: false,
        offerings: null,
      });
      console.log('[BillingStore] User logged out from RevenueCat');
    } catch (error) {
      console.error('[BillingStore] Logout error:', error);
    }
  },

  /**
   * Reset store to initial state
   * Called during app logout to clear all billing data
   */
  reset: () => {
    // Clear persisted storage first (synchronously start the operation)
    AsyncStorage.removeItem('north-billing-storage').catch((error) => {
      console.error('[BillingStore] Error clearing storage:', error);
    });
    // Then set state to initial values
    set({
      entitlements: null,
      isProUser: false,
      isLoading: false,
      offerings: null,
      currentPackage: null,
      paywallFeature: null,
      isPaywallVisible: false,
      error: null,
      lastSynced: null,
    });
  },

  /**
   * Quick check if user has Pro access
   * Useful for feature gating without async calls
   */
  checkProAccess: () => {
    return get().isProUser;
  },
    }),
    {
      name: 'north-billing-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist entitlements, isProUser, and lastSynced for offline access (Requirement 12.7)
      partialize: (state) => ({
        entitlements: state.entitlements,
        isProUser: state.isProUser,
        lastSynced: state.lastSynced,
      }),
    }
  )
);

/**
 * Hook to check if a feature requires Pro and show paywall if needed
 * @param feature - Feature identifier
 * @returns Object with canAccess boolean and showPaywall function
 */
export function useProFeature(feature: string) {
  const { isProUser, showPaywall } = useBillingStore();
  
  return {
    canAccess: isProUser,
    requirePro: () => {
      if (!isProUser) {
        showPaywall(feature);
        return false;
      }
      return true;
    },
  };
}

export default useBillingStore;
