/**
 * Context Screen Tier Check Integration Test
 * 
 * Tests that the context creation tier check properly enforces
 * the 3-item limit for free users and shows the paywall.
 * 
 * Validates: Requirements 4.1, 14.5
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ContextScreen from '../context';
import { useContextStore } from '@/stores/contextStore';
import { useBillingStore } from '@/stores/billingStore';
import { supabase } from '@/lib/supabase';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

jest.mock('@/stores/contextStore');
jest.mock('@/stores/billingStore');
jest.mock('@/components/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}));

describe('Context Screen - Tier Check Integration', () => {
  const mockFetchContexts = jest.fn();
  const mockCreateContext = jest.fn();
  const mockUpdateContext = jest.fn();
  const mockDeleteContext = jest.fn();
  const mockGetByCategory = jest.fn();
  const mockCanAddMore = jest.fn();
  const mockClearError = jest.fn();
  const mockShowPaywall = jest.fn();
  const mockHidePaywall = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock context store
    (useContextStore as unknown as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      error: null,
      fetchContexts: mockFetchContexts,
      createContext: mockCreateContext,
      updateContext: mockUpdateContext,
      deleteContext: mockDeleteContext,
      getByCategory: mockGetByCategory,
      canAddMore: mockCanAddMore,
      clearError: mockClearError,
    });

    // Mock billing store
    (useBillingStore as unknown as jest.Mock).mockReturnValue({
      isProUser: false,
      showPaywall: mockShowPaywall,
      isPaywallVisible: false,
      paywallFeature: null,
      hidePaywall: mockHidePaywall,
    });

    mockGetByCategory.mockReturnValue([]);
  });

  describe('Free User with 3 Items (At Limit)', () => {
    it('should show paywall when free user tries to add 4th context item', async () => {
      // Arrange: Free user with 3 items
      const threeItems = [
        {
          id: '1',
          userId: 'user-1',
          category: 'values' as const,
          content: 'Value 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          category: 'goals' as const,
          content: 'Goal 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '3',
          userId: 'user-1',
          category: 'projects' as const,
          content: 'Project 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (useContextStore as unknown as jest.Mock).mockReturnValue({
        items: threeItems,
        isLoading: false,
        error: null,
        fetchContexts: mockFetchContexts,
        createContext: mockCreateContext,
        updateContext: mockUpdateContext,
        deleteContext: mockDeleteContext,
        getByCategory: mockGetByCategory,
        canAddMore: mockCanAddMore,
        clearError: mockClearError,
      });

      // canAddMore returns false for free user with 3 items
      mockCanAddMore.mockReturnValue(false);

      // Act: Render screen and try to add item
      const { getByText } = render(<ContextScreen />);

      // Find and press the "Add" button for constraints
      const addButton = getByText('+ Add constraint');
      fireEvent.press(addButton);

      // Assert: Paywall should be shown
      await waitFor(() => {
        expect(mockShowPaywall).toHaveBeenCalledWith('context_creation');
      });

      // Assert: Modal should NOT be opened
      expect(mockCreateContext).not.toHaveBeenCalled();
    });

    it('should NOT show paywall when free user has less than 3 items', async () => {
      // Arrange: Free user with 2 items
      const twoItems = [
        {
          id: '1',
          userId: 'user-1',
          category: 'values' as const,
          content: 'Value 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-1',
          category: 'goals' as const,
          content: 'Goal 1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (useContextStore as unknown as jest.Mock).mockReturnValue({
        items: twoItems,
        isLoading: false,
        error: null,
        fetchContexts: mockFetchContexts,
        createContext: mockCreateContext,
        updateContext: mockUpdateContext,
        deleteContext: mockDeleteContext,
        getByCategory: mockGetByCategory,
        canAddMore: mockCanAddMore,
        clearError: mockClearError,
      });

      // canAddMore returns true for free user with 2 items
      mockCanAddMore.mockReturnValue(true);

      // Act: Render screen and try to add item
      const { getByText } = render(<ContextScreen />);

      // Find and press the "Add" button
      const addButton = getByText('+ Add constraint');
      fireEvent.press(addButton);

      // Assert: Paywall should NOT be shown
      expect(mockShowPaywall).not.toHaveBeenCalled();
    });
  });

  describe('Pro User (Unlimited)', () => {
    it('should allow Pro user to add items beyond 3-item limit', async () => {
      // Arrange: Pro user with 5 items
      const fiveItems = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        userId: 'user-1',
        category: 'values' as const,
        content: `Value ${i + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      (useContextStore as unknown as jest.Mock).mockReturnValue({
        items: fiveItems,
        isLoading: false,
        error: null,
        fetchContexts: mockFetchContexts,
        createContext: mockCreateContext,
        updateContext: mockUpdateContext,
        deleteContext: mockDeleteContext,
        getByCategory: mockGetByCategory,
        canAddMore: mockCanAddMore,
        clearError: mockClearError,
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true, // Pro user
        showPaywall: mockShowPaywall,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: mockHidePaywall,
      });

      // canAddMore returns true for Pro user regardless of count
      mockCanAddMore.mockReturnValue(true);

      // Act: Render screen and try to add item
      const { getByText } = render(<ContextScreen />);

      // Find and press the "Add" button
      const addButton = getByText('+ Add constraint');
      fireEvent.press(addButton);

      // Assert: Paywall should NOT be shown
      expect(mockShowPaywall).not.toHaveBeenCalled();
    });
  });

  describe('Tier Check Logic', () => {
    it('should call canAddMore with correct isProUser value', async () => {
      // Arrange: Free user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        showPaywall: mockShowPaywall,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: mockHidePaywall,
      });

      mockCanAddMore.mockReturnValue(true);

      // Act: Render screen and try to add item
      const { getByText } = render(<ContextScreen />);
      const addButton = getByText('+ Add value');
      fireEvent.press(addButton);

      // Assert: canAddMore should be called with false (free user)
      await waitFor(() => {
        expect(mockCanAddMore).toHaveBeenCalledWith(false);
      });
    });

    it('should call canAddMore with true for Pro user', async () => {
      // Arrange: Pro user
      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true,
        showPaywall: mockShowPaywall,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: mockHidePaywall,
      });

      mockCanAddMore.mockReturnValue(true);

      // Act: Render screen and try to add item
      const { getByText } = render(<ContextScreen />);
      const addButton = getByText('+ Add value');
      fireEvent.press(addButton);

      // Assert: canAddMore should be called with true (Pro user)
      await waitFor(() => {
        expect(mockCanAddMore).toHaveBeenCalledWith(true);
      });
    });
  });
});
