/**
 * CoachProfileScreen Unit Tests
 * 
 * Tests for the CoachProfileScreen component.
 * Validates: Requirements 1.1, 5.1, 8.1, 8.2, 8.3, 8.4
 * 
 * Tests:
 * - Loading state display
 * - Error handling for invalid/missing coach
 * - Coach information display
 * - Navigation functionality
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CoachProfileScreen from '../profile';
import { useCoachStore } from '@/stores/coachStore';
import type { Coach, CoachCategory } from '@/types';

// Mock dependencies
const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

let mockParams = {
  coachId: 'test-coach-id',
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

jest.mock('@/stores/coachStore', () => ({
  useCoachStore: jest.fn(),
}));

describe('CoachProfileScreen', () => {
  const mockCoach: Coach = {
    id: 'test-coach-id',
    name: 'Strategy Coach',
    icon: '🎯',
    systemPrompt: 'You are a strategic thinking coach who helps founders make better decisions.',
    creatorId: null,
    isPublic: true,
    category: 'Productivity' as CoachCategory,
    isFeatured: false,
    sourceCoachId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockFetchCoaches = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset router mocks
    mockRouter.back.mockClear();
    mockRouter.push.mockClear();

    // Reset params to default
    mockParams = { coachId: 'test-coach-id' };

    // Setup default mocks
    (useCoachStore as unknown as jest.Mock).mockReturnValue({
      coaches: [mockCoach],
      fetchCoaches: mockFetchCoaches,
      isLoading: false,
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when coach is not loaded', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: true,
      });

      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Loading coach profile...')).toBeTruthy();
    });

    it('displays ActivityIndicator in loading state', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: true,
      });

      const { UNSAFE_getByType } = render(<CoachProfileScreen />);
      const { ActivityIndicator } = require('react-native');

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('fetches coaches if not loaded', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      render(<CoachProfileScreen />);

      expect(mockFetchCoaches).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when coach is not found', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Coach Not Found')).toBeTruthy();
      expect(getByText('This coach is no longer available.')).toBeTruthy();
    });

    it('displays error message when coach ID is missing', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      // Mock missing coachId
      mockParams = { coachId: undefined as any };

      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Coach Not Found')).toBeTruthy();
      expect(getByText('No coach ID provided.')).toBeTruthy();
    });

    it('shows Go Back button in error state', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Go Back')).toBeTruthy();
    });

    it('navigates back when Go Back button is pressed in error state', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      const { getByText } = render(<CoachProfileScreen />);

      const goBackButton = getByText('Go Back');
      fireEvent.press(goBackButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });
  });

  describe('Coach Information Display', () => {
    it('displays coach icon', () => {
      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('🎯')).toBeTruthy();
    });

    it('displays coach name', () => {
      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Strategy Coach')).toBeTruthy();
    });

    it('displays coach category', () => {
      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Productivity')).toBeTruthy();
    });

    it('displays header title', () => {
      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Coach Profile')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates back when back button is pressed', () => {
      const { getByLabelText } = render(<CoachProfileScreen />);

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('navigates to chat screen when Start Coaching Session button is pressed', () => {
      const { getByText } = render(<CoachProfileScreen />);

      const startButton = getByText('Start Coaching Session');
      fireEvent.press(startButton);

      expect(mockRouter.push).toHaveBeenCalledWith('/chat/test-coach-id');
    });

    it('does not navigate to chat if coach is not found', () => {
      (useCoachStore as unknown as jest.Mock).mockReturnValue({
        coaches: [],
        fetchCoaches: mockFetchCoaches,
        isLoading: false,
      });

      const { queryByText } = render(<CoachProfileScreen />);

      // Start button should not be present in error state
      expect(queryByText('Start Coaching Session')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility labels for buttons', () => {
      const { getByLabelText } = render(<CoachProfileScreen />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByLabelText('Start coaching session')).toBeTruthy();
    });

    it('has correct accessibility role for buttons', () => {
      const { getByLabelText } = render(<CoachProfileScreen />);

      const backButton = getByLabelText('Go back');
      const startButton = getByLabelText('Start coaching session');

      expect(backButton.props.accessibilityRole).toBe('button');
      expect(startButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Layout', () => {
    it('renders SafeAreaView container', () => {
      const { UNSAFE_getByType } = render(<CoachProfileScreen />);
      const { SafeAreaView } = require('react-native-safe-area-context');

      expect(UNSAFE_getByType(SafeAreaView)).toBeTruthy();
    });

    it('renders ScrollView for content', () => {
      const { UNSAFE_getAllByType } = render(<CoachProfileScreen />);
      const { ScrollView } = require('react-native');

      const scrollViews = UNSAFE_getAllByType(ScrollView);
      expect(scrollViews.length).toBeGreaterThan(0);
    });

    it('renders header with back button', () => {
      const { getByLabelText, getByText } = render(<CoachProfileScreen />);

      expect(getByLabelText('Go back')).toBeTruthy();
      expect(getByText('Coach Profile')).toBeTruthy();
    });

    it('renders footer with Start Session button', () => {
      const { getByText } = render(<CoachProfileScreen />);

      expect(getByText('Start Coaching Session')).toBeTruthy();
    });
  });
});
