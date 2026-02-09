/**
 * Tier Status Display Tests
 * 
 * Tests that UI components properly display and update tier status
 * when entitlements change.
 * 
 * Validates: Property 61 - Entitlement UI Updates
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useBillingStore } from '@/stores/billingStore';
import SettingsScreen from '../settings';
import ContextScreen from '../context';
import HomeScreen from '../index';

// Mock dependencies
jest.mock('@/stores/authStore');
jest.mock('@/stores/contextStore');
jest.mock('@/stores/coachStore');
jest.mock('@/stores/billingStore');
jest.mock('@/stores/networkStore');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSegments: () => [],
}));
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.0.0',
      ios: { buildNumber: '1' },
      android: { versionCode: 1 },
    },
  },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));
jest.mock('@/components/billing/PaywallModal', () => ({
  PaywallModal: () => null,
}));
jest.mock('@/components/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}));
jest.mock('@/components/coach', () => ({
  CoachGrid: () => null,
  CoachCreateModal: () => null,
  CoachEditModal: () => null,
}));

describe('Tier Status Display - UI Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Settings Screen', () => {
    beforeEach(() => {
      // Mock auth store
      const mockAuthStore = require('@/stores/authStore');
      mockAuthStore.useAuthStore.mockReturnValue({
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
        logout: jest.fn(),
      });
    });

    it('should display "North Free" badge for free users', () => {
      // Arrange: Mock free user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        entitlements: null,
        isLoading: false,
        showPaywall: jest.fn(),
        restorePurchases: jest.fn(),
        isPaywallVisible: false,
        hidePaywall: jest.fn(),
      });

      // Act: Render settings screen
      const { getByText } = render(<SettingsScreen />);

      // Assert: Should show Free tier badge
      expect(getByText('North Free')).toBeTruthy();
      expect(getByText(/Upgrade to unlock unlimited context/)).toBeTruthy();
    });

    it('should display "North Pro" badge for pro users', () => {
      // Arrange: Mock pro user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true,
        entitlements: {
          pro: {
            isActive: true,
            expirationDate: '2026-03-01T00:00:00Z',
          },
        },
        isLoading: false,
        showPaywall: jest.fn(),
        restorePurchases: jest.fn(),
        isPaywallVisible: false,
        hidePaywall: jest.fn(),
      });

      // Act: Render settings screen
      const { getByText } = render(<SettingsScreen />);

      // Assert: Should show Pro tier badge
      expect(getByText('North Pro')).toBeTruthy();
      expect(getByText(/Renews on/)).toBeTruthy();
    });

    it('should display subscription status as "Free" for free users', () => {
      // Arrange: Mock free user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        entitlements: null,
        isLoading: false,
        showPaywall: jest.fn(),
        restorePurchases: jest.fn(),
        isPaywallVisible: false,
        hidePaywall: jest.fn(),
      });

      // Act: Render settings screen
      const { getByText } = render(<SettingsScreen />);

      // Assert: Should show Free status
      expect(getByText('Free')).toBeTruthy();
    });

    it('should display subscription status as "Pro" for pro users', () => {
      // Arrange: Mock pro user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true,
        entitlements: {
          pro: {
            isActive: true,
            expirationDate: null,
          },
        },
        isLoading: false,
        showPaywall: jest.fn(),
        restorePurchases: jest.fn(),
        isPaywallVisible: false,
        hidePaywall: jest.fn(),
      });

      // Act: Render settings screen
      const { getByText } = render(<SettingsScreen />);

      // Assert: Should show Pro status
      expect(getByText('Pro')).toBeTruthy();
    });
  });

  describe('Context Screen', () => {
    beforeEach(() => {
      // Mock context store
      const mockContextStore = require('@/stores/contextStore');
      mockContextStore.useContextStore.mockReturnValue({
        items: [
          { id: '1', category: 'values', content: 'Test value', userId: 'user1', createdAt: new Date(), updatedAt: new Date() },
          { id: '2', category: 'goals', content: 'Test goal', userId: 'user1', createdAt: new Date(), updatedAt: new Date() },
        ],
        isLoading: false,
        error: null,
        fetchContexts: jest.fn(),
        createContext: jest.fn(),
        updateContext: jest.fn(),
        deleteContext: jest.fn(),
        getByCategory: jest.fn((cat) => []),
        canAddMore: jest.fn(),
        clearError: jest.fn(),
      });
    });

    it('should display context item count', () => {
      // Arrange: Mock free user with 2 items
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        showPaywall: jest.fn(),
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act: Render context screen
      const { getByText } = render(<ContextScreen />);

      // Assert: Should show item count
      expect(getByText(/2 context items defined/)).toBeTruthy();
    });
  });

  describe('Home Screen', () => {
    beforeEach(() => {
      // Mock auth store
      const mockAuthStore = require('@/stores/authStore');
      mockAuthStore.useAuthStore.mockReturnValue({
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
      });

      // Mock coach store
      const mockCoachStore = require('@/stores/coachStore');
      mockCoachStore.useCoachStore.mockReturnValue({
        coaches: [],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: jest.fn(() => []),
        getUserCoaches: jest.fn(() => []),
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });
    });

    it('should display locked status for free users on create coach button', () => {
      // Arrange: Mock free user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act: Render home screen
      const { getByText } = render(<HomeScreen />);

      // Assert: Should show locked indicator
      expect(getByText(/Requires Pro/)).toBeTruthy();
    });

    it('should display unlocked status for pro users on create coach button', () => {
      // Arrange: Mock pro user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act: Render home screen
      const { getByText } = render(<HomeScreen />);

      // Assert: Should show unlocked indicator
      expect(getByText(/Pro Feature/)).toBeTruthy();
    });
  });

  describe('Tier Status Updates', () => {
    beforeEach(() => {
      // Mock auth store
      const mockAuthStore = require('@/stores/authStore');
      mockAuthStore.useAuthStore.mockReturnValue({
        user: { id: 'user1', name: 'Test User', email: 'test@example.com' },
        logout: jest.fn(),
      });
    });

    it('should update UI when tier status changes from Free to Pro', async () => {
      // Arrange: Start with free user
      const mockBillingStore = {
        isProUser: false,
        entitlements: null,
        isLoading: false,
        showPaywall: jest.fn(),
        restorePurchases: jest.fn(),
        isPaywallVisible: false,
        hidePaywall: jest.fn(),
      };

      (useBillingStore as unknown as jest.Mock).mockReturnValue(mockBillingStore);

      // Act: Render settings screen
      const { getByText, rerender } = render(<SettingsScreen />);

      // Assert: Initially shows Free
      expect(getByText('North Free')).toBeTruthy();

      // Simulate tier upgrade
      mockBillingStore.isProUser = true;
      mockBillingStore.entitlements = {
        pro: {
          isActive: true,
          expirationDate: null,
        },
      };

      // Re-render with updated store
      rerender(<SettingsScreen />);

      // Assert: Now shows Pro
      await waitFor(() => {
        expect(getByText('North Pro')).toBeTruthy();
      });
    });
  });
});
