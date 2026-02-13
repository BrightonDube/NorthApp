/**
 * Home Screen FAB Behavior Tests
 * 
 * Unit tests for the Floating Action Button (FAB) behavior on the Home screen.
 * Tests different behavior for free vs Pro users.
 * 
 * **Validates: Requirements 7.1, 13.3, 13.4**
 * 
 * Requirement 7.1: Coach creation feature gating (Pro users only)
 * Requirement 13.3: Floating action button for creating new coaches
 * Requirement 13.4: Free tier users see Pro upgrade prompt, Pro users navigate to creation
 */

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../index';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import { useBillingStore } from '@/stores/billingStore';
import type { Coach, User } from '@/types';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/stores/authStore');
jest.mock('@/stores/coachStore');
jest.mock('@/stores/billingStore');

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

jest.mock('@/components/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}));

describe('Home Screen - FAB Behavior', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockDefaultCoach: Coach = {
    id: 'coach-1',
    name: 'Strategy Coach',
    icon: '🎯',
    systemPrompt: 'You are a strategic thinking coach',
    creatorId: null,
    isPublic: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  describe('FAB Visibility and Accessibility', () => {
    it('should display the Create Coach button (FAB)', () => {
      // Arrange: Setup mocks for free user
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act: Render the screen
      const { getByText, getByLabelText } = render(<HomeScreen />);

      // Assert: FAB should be visible
      expect(getByText('Create Custom Coach')).toBeTruthy();
      expect(getByText(/Upgrade to Pro to unlock/)).toBeTruthy();
      
      // Assert: FAB should have proper accessibility
      const fabButton = getByLabelText('Create custom coach');
      expect(fabButton).toBeTruthy();
    });

    it('should have correct accessibility hint for FAB', () => {
      // Arrange
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act
      const { getByA11yHint } = render(<HomeScreen />);

      // Assert: Should have accessibility hint
      const fabButton = getByA11yHint('Opens coach creation modal (Pro feature)');
      expect(fabButton).toBeTruthy();
    });
  });

  describe('Free User FAB Behavior (Requirement 13.4)', () => {
    it('should show Pro upgrade prompt when free user taps FAB', async () => {
      // Arrange: Setup mocks for free user
      const mockShowPaywall = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Mock the store's getState to return showPaywall
      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: mockShowPaywall,
      });

      // Act: Render and tap FAB
      const { getByLabelText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      fireEvent.press(fabButton);

      // Assert: Should show paywall for coach_creation feature
      await waitFor(() => {
        expect(mockShowPaywall).toHaveBeenCalledWith('coach_creation');
      });
    });

    it('should NOT open coach creation modal for free users', async () => {
      // Arrange: Setup mocks for free user
      const mockShowPaywall = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: mockShowPaywall,
      });

      // Act: Render and tap FAB
      const { getByLabelText, queryByText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      fireEvent.press(fabButton);

      // Assert: Coach creation modal should NOT be visible
      await waitFor(() => {
        // The modal title would be visible if it opened
        expect(queryByText('Create Coach')).toBeNull();
      });
    });
  });

  describe('Pro User FAB Behavior (Requirement 13.4)', () => {
    it('should open coach creation modal when Pro user taps FAB', async () => {
      // Arrange: Setup mocks for Pro user
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true, // Pro user
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      // Act: Render and tap FAB
      const { getByLabelText, getByText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      fireEvent.press(fabButton);

      // Assert: Coach creation modal should be visible
      await waitFor(() => {
        expect(getByText('Create Coach')).toBeTruthy();
      });
    });

    it('should NOT show paywall for Pro users', async () => {
      // Arrange: Setup mocks for Pro user
      const mockShowPaywall = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: true, // Pro user
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: mockShowPaywall,
      });

      // Act: Render and tap FAB
      const { getByLabelText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      fireEvent.press(fabButton);

      // Assert: Paywall should NOT be shown
      await waitFor(() => {
        expect(mockShowPaywall).not.toHaveBeenCalled();
      });
    });
  });

  describe('FAB Interaction Feedback', () => {
    it('should provide haptic feedback when FAB is pressed', async () => {
      // Arrange
      const Haptics = require('expo-haptics');
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: jest.fn(),
      });

      // Act: Render and tap FAB
      const { getByLabelText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      fireEvent.press(fabButton);

      // Assert: Haptic feedback should be triggered
      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(
          Haptics.ImpactFeedbackStyle.Light
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle FAB press when user is null', async () => {
      // Arrange: No user logged in (edge case)
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      const mockShowPaywall = jest.fn();
      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: mockShowPaywall,
      });

      // Act: Render and tap FAB
      const { getByLabelText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      
      // Should not crash
      expect(() => fireEvent.press(fabButton)).not.toThrow();
    });

    it('should handle rapid FAB taps gracefully', async () => {
      // Arrange
      const mockShowPaywall = jest.fn();
      
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
      });

      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [mockDefaultCoach],
        isLoading: false,
        error: null,
        fetchCoaches: jest.fn(),
        getDefaultCoaches: () => [mockDefaultCoach],
        getUserCoaches: () => [],
        createCoach: jest.fn(),
        updateCoach: jest.fn(),
        deleteCoach: jest.fn(),
        clearError: jest.fn(),
      });

      (useBillingStore as unknown as jest.Mock).mockReturnValue({
        isProUser: false,
        isPaywallVisible: false,
        paywallFeature: null,
        hidePaywall: jest.fn(),
      });

      useBillingStore.getState = jest.fn().mockReturnValue({
        showPaywall: mockShowPaywall,
      });

      // Act: Render and tap FAB multiple times rapidly
      const { getByLabelText } = render(<HomeScreen />);
      const fabButton = getByLabelText('Create custom coach');
      
      fireEvent.press(fabButton);
      fireEvent.press(fabButton);
      fireEvent.press(fabButton);

      // Assert: Should handle multiple taps without crashing
      await waitFor(() => {
        expect(mockShowPaywall).toHaveBeenCalled();
      });
    });
  });
});
