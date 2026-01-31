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
import { Platform, Alert } from 'react-native';
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
} from 'react-native-purchases';
import type { BillingStore, Entitlements } from '@/types';

// RevenueCat API keys from environment
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';

// Entitlement identifier configured in RevenueCat dashboard
const PRO_ENTITLEMENT_ID = 'pro';

// Storage key for caching entitlements
const ENTITLEMENTS_CACHE_KEY = '@north/entitlements';

/**
 * Initialize RevenueCat SDK
 * Should be called once at app startup
 */
let isInitialized = false;

export async function initializeRevenueCat(userId?: string): Promise<void> {
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

  if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY === 'your_revenuecat_api_key_here') {
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
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId, // Optional: Supabase user ID for cross-platform sync
    });

    isInitialized = true;
    console.log('[BillingStore] RevenueCat initialized successfully');
  } catch (error) {
    console.error('[BillingStore] Error initializing RevenueCat:', error);
    throw error;
  }
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
  
  // Additional internal actions
  initialize: (userId?: string) => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  hidePaywall: () => void;
  logout: () => Promise<void>;
  checkProAccess: () => boolean;
}

/**
 * Billing Store
 * 
 * Manages all subscription and in-app purchase functionality:
 * - RevenueCat SDK initialization
 * - Entitlement fetching and caching
 * - Paywall display for gated features
 * - Purchase flow handling
 * - Subscription restoration
 */
export const useBillingStore = create<BillingStoreInternal>((set, get) => ({
  // State
  entitlements: null,
  isProUser: false,
  isLoading: false,
  offerings: null,
  currentPackage: null,
  paywallFeature: null,
  isPaywallVisible: false,
  error: null,

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
      });

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
      });

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
   * Quick check if user has Pro access
   * Useful for feature gating without async calls
   */
  checkProAccess: () => {
    return get().isProUser;
  },
}));

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
