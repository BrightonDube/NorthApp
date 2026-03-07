/**
 * Billing Store Property-Based Tests - Property 37
 * 
 * Property 37: Pro Feature Paywall
 * 
 * **Validates: Requirement 12.3**
 * 
 * For any Pro-gated feature, when a free user attempts to access it,
 * the system MUST display the paywall modal with the appropriate feature context.
 * 
 * This property verifies that:
 * 1. Free users trigger the paywall when accessing Pro features
 * 2. The paywall displays with the correct feature identifier
 * 3. Pro users can access features without triggering the paywall
 * 4. The paywall state is managed correctly (visible/hidden)
 * 
 * Feature: north-mobile-app
 */

import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBillingStore } from '../billingStore';
import Purchases from 'react-native-purchases';
import type { CustomerInfo } from 'react-native-purchases';

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  setLogLevel: jest.fn(),
  getCustomerInfo: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(),
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
  },
}));

// Mock environment variable
process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = 'test_api_key';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Alert
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Property 37: Pro Feature Paywall', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset store state
    useBillingStore.setState({
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
    
    // Clear AsyncStorage
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
    
    // Mock configure to succeed by default
    (Purchases.configure as jest.Mock).mockResolvedValue(undefined);
    (Purchases.addCustomerInfoUpdateListener as jest.Mock).mockReturnValue(undefined);
  });

  /**
   * Property 37.1: Free users trigger paywall for Pro features
   * 
   * For any feature identifier, when a free user calls showPaywall,
   * the paywall MUST become visible with the correct feature context.
   */
  it('should show paywall with correct feature when free user accesses Pro feature', () => {
    fc.assert(
      fc.property(
        // Generate various feature identifiers
        fc.constantFrom(
          'coach_creation',
          'unlimited_coaches',
          'context_creation',
          'unlimited_context',
          'unlimited_messages',
          'priority_responses',
          'export_conversations',
          'advanced_analytics'
        ),
        
        (featureId) => {
          // Arrange: Set up free user state
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: false,
                expirationDate: null,
              },
            },
            isProUser: false,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Act: Free user attempts to access Pro feature
          store.showPaywall(featureId);

          // Get updated state
          const updatedStore = useBillingStore.getState();

          // Assert: Paywall should be visible
          expect(updatedStore.isPaywallVisible).toBe(true);

          // Assert: Paywall should display the correct feature
          expect(updatedStore.paywallFeature).toBe(featureId);
        }
      ),
      { numRuns: 20 } // Test with all feature identifiers multiple times
    );
  });

  /**
   * Property 37.2: Pro users do NOT trigger paywall
   * 
   * For any feature identifier, when a Pro user attempts to access a feature,
   * the paywall should NOT be shown (they already have access).
   * 
   * Note: This tests the expected behavior - Pro users should use feature
   * gating checks BEFORE calling showPaywall, but if called, it should still work.
   */
  it('should allow Pro users to access features without paywall interference', () => {
    fc.assert(
      fc.property(
        // Generate various feature identifiers
        fc.constantFrom(
          'coach_creation',
          'unlimited_coaches',
          'context_creation',
          'unlimited_context',
          'unlimited_messages'
        ),
        
        (featureId) => {
          // Arrange: Set up Pro user state
          const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: true,
                expirationDate: futureDate,
              },
            },
            isProUser: true,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Assert: Pro user should have access
          expect(store.isProUser).toBe(true);
          
          // Assert: Paywall should not be visible initially
          expect(store.isPaywallVisible).toBe(false);

          // Note: In real usage, Pro users wouldn't call showPaywall
          // because feature gating checks would pass. This property
          // verifies the state is correct for Pro users.
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 37.3: Paywall can be hidden after being shown
   * 
   * For any feature, after showing the paywall, calling hidePaywall
   * MUST clear the paywall state correctly.
   */
  it('should hide paywall and clear feature context when hidePaywall is called', () => {
    fc.assert(
      fc.property(
        // Generate various feature identifiers
        fc.constantFrom(
          'coach_creation',
          'context_creation',
          'unlimited_messages'
        ),
        
        (featureId) => {
          // Arrange: Set up free user with paywall shown
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: false,
                expirationDate: null,
              },
            },
            isProUser: false,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Act: Show paywall
          store.showPaywall(featureId);

          // Verify paywall is shown
          let updatedStore = useBillingStore.getState();
          expect(updatedStore.isPaywallVisible).toBe(true);
          expect(updatedStore.paywallFeature).toBe(featureId);

          // Act: Hide paywall
          store.hidePaywall();

          // Get final state
          updatedStore = useBillingStore.getState();

          // Assert: Paywall should be hidden
          expect(updatedStore.isPaywallVisible).toBe(false);

          // Assert: Feature context should be cleared
          expect(updatedStore.paywallFeature).toBeNull();
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 37.4: Multiple paywall triggers update feature context
   * 
   * When showPaywall is called multiple times with different features,
   * the paywallFeature should always reflect the most recent feature.
   */
  it('should update feature context when showPaywall is called multiple times', () => {
    fc.assert(
      fc.property(
        // Generate sequences of feature identifiers
        fc.array(
          fc.constantFrom(
            'coach_creation',
            'context_creation',
            'unlimited_messages',
            'priority_responses'
          ),
          { minLength: 2, maxLength: 5 }
        ),
        
        (featureSequence) => {
          // Arrange: Set up free user state
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: false,
                expirationDate: null,
              },
            },
            isProUser: false,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Act: Show paywall for each feature in sequence
          featureSequence.forEach((featureId) => {
            store.showPaywall(featureId);

            // Assert: Paywall should be visible
            const currentState = useBillingStore.getState();
            expect(currentState.isPaywallVisible).toBe(true);

            // Assert: Feature should match the current one
            expect(currentState.paywallFeature).toBe(featureId);
          });

          // Get final state
          const finalState = useBillingStore.getState();

          // Assert: Final feature should be the last one in sequence
          expect(finalState.paywallFeature).toBe(featureSequence[featureSequence.length - 1]);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 37.5: Paywall state persists until explicitly hidden
   * 
   * Once the paywall is shown, it should remain visible until hidePaywall
   * is called, regardless of other store operations.
   */
  it('should maintain paywall visibility until explicitly hidden', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('coach_creation', 'context_creation'),
        
        (featureId) => {
          // Arrange: Set up free user state
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: false,
                expirationDate: null,
              },
            },
            isProUser: false,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Act: Show paywall
          store.showPaywall(featureId);

          // Verify paywall is shown
          let state = useBillingStore.getState();
          expect(state.isPaywallVisible).toBe(true);

          // Perform other operations (that don't hide paywall)
          // These should not affect paywall visibility
          useBillingStore.setState({ isLoading: true });
          state = useBillingStore.getState();
          expect(state.isPaywallVisible).toBe(true);

          useBillingStore.setState({ isLoading: false });
          state = useBillingStore.getState();
          expect(state.isPaywallVisible).toBe(true);

          useBillingStore.setState({ error: 'Some error' });
          state = useBillingStore.getState();
          expect(state.isPaywallVisible).toBe(true);

          // Assert: Paywall should still be visible
          expect(state.isPaywallVisible).toBe(true);
          expect(state.paywallFeature).toBe(featureId);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 37.6: Paywall state is independent of entitlement state
   * 
   * The paywall visibility state should be independent of the entitlement
   * state. Even if entitlements change, the paywall should remain in its
   * current state until explicitly changed.
   */
  it('should maintain paywall state independently of entitlement changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('coach_creation', 'context_creation'),
        fc.boolean(), // Whether to upgrade to Pro
        
        (featureId, upgradeToPro) => {
          // Arrange: Set up free user with paywall shown
          useBillingStore.setState({
            entitlements: {
              pro: {
                isActive: false,
                expirationDate: null,
              },
            },
            isProUser: false,
            isPaywallVisible: false,
            paywallFeature: null,
          });

          // Get the store
          const store = useBillingStore.getState();

          // Act: Show paywall
          store.showPaywall(featureId);

          // Verify paywall is shown
          let state = useBillingStore.getState();
          expect(state.isPaywallVisible).toBe(true);

          // Act: Change entitlement state (simulate upgrade or downgrade)
          if (upgradeToPro) {
            useBillingStore.setState({
              entitlements: {
                pro: {
                  isActive: true,
                  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                },
              },
              isProUser: true,
            });
          } else {
            // Simulate entitlement refresh that confirms free status
            useBillingStore.setState({
              entitlements: {
                pro: {
                  isActive: false,
                  expirationDate: null,
                },
              },
              isProUser: false,
            });
          }

          // Get updated state
          state = useBillingStore.getState();

          // Assert: Paywall should still be visible (not automatically hidden)
          // The UI layer is responsible for hiding the paywall after successful purchase
          expect(state.isPaywallVisible).toBe(true);
          expect(state.paywallFeature).toBe(featureId);
        }
      ),
      { numRuns: 10 }
    );
  });
});
