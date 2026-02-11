/**
 * CoachPreviewScreen Unit Tests
 * 
 * Tests for the CoachPreviewScreen component.
 * Validates: Requirements 4.2, 4.5
 * 
 * Tests:
 * - Loading state display
 * - Error handling
 * - Button interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CoachPreviewScreen from '../preview';
import { supabase } from '@/lib/supabase';
import { coachInstaller } from '@/lib/coachInstaller';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import type { PublicCoach } from '@/types';

// Mock dependencies
const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
};

const mockParams = {
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

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/lib/coachInstaller', () => ({
  coachInstaller: {
    checkIfInstalled: jest.fn(),
    getInstalledCoachId: jest.fn(),
    installCoach: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('@/stores/coachStore', () => ({
  useCoachStore: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CoachPreviewScreen', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockCoachData = {
    id: 'test-coach-id',
    name: 'Strategy Coach',
    icon: '🎯',
    system_prompt: 'You are a strategic thinking coach who helps founders make better decisions.',
    creator_id: 'creator-123',
    is_public: true,
    category: 'Productivity',
    is_featured: false,
    source_coach_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    creator: {
      id: 'creator-123',
      email: 'creator@example.com',
    },
  };

  const mockPublicCoach: PublicCoach = {
    id: 'test-coach-id',
    name: 'Strategy Coach',
    icon: '🎯',
    systemPrompt: 'You are a strategic thinking coach who helps founders make better decisions.',
    creatorId: 'creator-123',
    creatorName: 'creator',
    isPublic: true,
    category: 'Productivity' as any,
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
    mockRouter.replace.mockClear();

    // Setup default mocks
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    (useCoachStore as unknown as jest.Mock).mockReturnValue({
      fetchCoaches: mockFetchCoaches,
    });

    // Setup successful Supabase query by default
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockCoachData,
      error: null,
    });
    
    const mockEq2 = jest.fn().mockReturnValue({
      single: mockSingle,
    });
    
    const mockEq1 = jest.fn().mockReturnValue({
      eq: mockEq2,
    });
    
    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq1,
    });

    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect,
    });

    // Setup coach installer mocks
    (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
    (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue(null);
  });

  describe('Loading State', () => {
    it('displays loading indicator while fetching coach data', () => {
      // Make the query hang to keep loading state
      const mockSingle = jest.fn().mockImplementation(() => new Promise(() => {}));
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { getByText } = render(<CoachPreviewScreen />);

      expect(getByText('Loading coach details...')).toBeTruthy();
    });

    it('displays ActivityIndicator in loading state', () => {
      // Make the query hang to keep loading state
      const mockSingle = jest.fn().mockImplementation(() => new Promise(() => {}));
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { UNSAFE_getByType } = render(<CoachPreviewScreen />);
      const { ActivityIndicator } = require('react-native');

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when coach fetch fails', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText(/Failed to fetch coach/)).toBeTruthy();
      });
    });

    it('displays error when coach is not found', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText('Coach not found or is not public')).toBeTruthy();
      });
    });

    it('displays error when coach is not public', async () => {
      // The component filters by is_public in the query, so a non-public coach
      // would not be returned by the query. This test verifies that behavior.
      const mockSingle = jest.fn().mockResolvedValue({
        data: null, // No data returned because is_public filter excludes it
        error: null,
      });
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText('Coach not found or is not public')).toBeTruthy();
      });
    });

    it('shows Go Back button in error state', async () => {
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });
      const mockEq2 = jest.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Go Back')).toBeTruthy();
      });
    });

    it('displays error alert when installation fails', async () => {
      (coachInstaller.installCoach as jest.Mock).mockRejectedValue(
        new Error('Installation failed')
      );

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
      });

      const installButton = getByText('Install Coach');
      fireEvent.press(installButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Installation Failed',
          'Installation failed',
          [{ text: 'OK' }]
        );
      });
    });
  });

  describe('Button Interactions', () => {
    it('calls router.back when Cancel button is pressed', async () => {
      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
      });

      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('calls router.back when close button is pressed', async () => {
      const { getByLabelText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByLabelText('Close preview')).toBeTruthy();
      });

      const closeButton = getByLabelText('Close preview');
      fireEvent.press(closeButton);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('installs coach and shows success alert when Install button is pressed', async () => {
      const installedCoach = {
        ...mockPublicCoach,
        id: 'installed-coach-id',
      };

      (coachInstaller.installCoach as jest.Mock).mockResolvedValue(installedCoach);

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
      });

      const installButton = getByText('Install Coach');
      fireEvent.press(installButton);

      await waitFor(() => {
        expect(coachInstaller.installCoach).toHaveBeenCalledWith('test-coach-id', 'user-123');
        expect(mockFetchCoaches).toHaveBeenCalledWith(true);
        expect(Alert.alert).toHaveBeenCalledWith(
          'Coach Installed! 🎉',
          'Strategy Coach has been added to your coaches.',
          expect.any(Array)
        );
      });
    });

    it('disables Install button while installing', async () => {
      (coachInstaller.installCoach as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const { getByText, getByLabelText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
      });

      const installButton = getByLabelText('Install coach');
      fireEvent.press(installButton);

      // Button should be disabled during installation
      expect(installButton.props.accessibilityState.disabled).toBe(true);
    });

    it('navigates to existing coach when already installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
        expect(getByText('You already have this coach installed')).toBeTruthy();
      });

      const openButton = getByText('Open Coach');
      fireEvent.press(openButton);

      expect(mockRouter.replace).toHaveBeenCalledWith('/chat/existing-coach-id');
    });

    it('shows "Open Coach" button text when already installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Open Coach')).toBeTruthy();
      });
    });

    it('shows "Install Coach" button text when not installed', async () => {
      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Install Coach')).toBeTruthy();
      });
    });
  });

  describe('Coach Details Display', () => {
    it('displays all coach information after loading', async () => {
      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('Strategy Coach')).toBeTruthy();
        expect(getByText('🎯')).toBeTruthy();
        expect(getByText('by creator')).toBeTruthy();
        expect(getByText(/Productivity/)).toBeTruthy(); // Category may have emoji prefix
        expect(getByText('You are a strategic thinking coach who helps founders make better decisions.')).toBeTruthy();
      });
    });

    it('displays formatted creation date', async () => {
      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText(/Created January/)).toBeTruthy();
      });
    });

    it('displays "Already Installed" notice when coach is installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');

      const { getByText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByText('You already have this coach installed')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('has correct accessibility labels for buttons', async () => {
      const { getByLabelText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByLabelText('Close preview')).toBeTruthy();
        expect(getByLabelText('Cancel')).toBeTruthy();
        expect(getByLabelText('Install coach')).toBeTruthy();
      });
    });

    it('updates accessibility label when coach is already installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');

      const { getByLabelText } = render(<CoachPreviewScreen />);

      await waitFor(() => {
        expect(getByLabelText('Open coach')).toBeTruthy();
      });
    });
  });
});
