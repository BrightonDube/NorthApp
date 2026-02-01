/**
 * Home Screen Tests
 * 
 * Basic unit tests for the Home screen (The Board)
 * 
 * Validates: Requirements 13.1-13.7
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../index';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
  }),
}));

jest.mock('@/stores/coachStore', () => ({
  useCoachStore: () => ({
    coaches: [],
    isLoading: false,
    error: null,
    fetchCoaches: jest.fn(),
    getDefaultCoaches: () => [],
    getUserCoaches: () => [],
    createCoach: jest.fn(),
    updateCoach: jest.fn(),
    deleteCoach: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/stores/billingStore', () => ({
  useBillingStore: () => ({
    isProUser: false,
    isPaywallVisible: false,
    paywallFeature: null,
    hidePaywall: jest.fn(),
  }),
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

describe('HomeScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome back,')).toBeTruthy();
  });

  it('displays user name in header', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Test User')).toBeTruthy();
  });

  it('displays create coach button', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Create Custom Coach')).toBeTruthy();
    expect(getByText('Pro Feature')).toBeTruthy();
  });

  it('calls fetchCoaches on mount', async () => {
    const mockFetchCoaches = jest.fn();
    jest.spyOn(require('@/stores/coachStore'), 'useCoachStore').mockReturnValue({
      coaches: [],
      isLoading: false,
      error: null,
      fetchCoaches: mockFetchCoaches,
      getDefaultCoaches: () => [],
      getUserCoaches: () => [],
      createCoach: jest.fn(),
      updateCoach: jest.fn(),
      deleteCoach: jest.fn(),
      clearError: jest.fn(),
    });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockFetchCoaches).toHaveBeenCalled();
    });
  });
});
