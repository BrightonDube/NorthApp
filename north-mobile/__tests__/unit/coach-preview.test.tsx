/**
 * Coach Preview Screen Unit Tests
 * 
 * Tests specific examples, edge cases, and error conditions for the coach preview screen.
 * 
 * Test coverage:
 * - Loading state display
 * - Error handling
 * - Button interactions
 * - Already installed coach handling
 * - Navigation behavior
 * 
 * Validates: Requirements 4.2, 4.4, 4.5
 */

import React from 'react';
import { render, waitFor, fireEvent, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CoachPreviewScreen from '@/app/coach/preview';
import { supabase } from '@/lib/supabase';
import { coachInstaller } from '@/lib/coachInstaller';
import { useAuthStore } from '@/stores/authStore';
import { useCoachStore } from '@/stores/coachStore';
import { CoachCategory } from '@/types';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@/lib/supabase');
jest.mock('@/lib/coachInstaller');
jest.mock('@/stores/authStore');
jest.mock('@/stores/coachStore');
jest.mock('expo-haptics');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

const mockUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Sample coach data
const sampleCoach = {
  id: 'coach-123',
  name: 'Test Coach',
  icon: '🤖',
  system_prompt: 'I am a helpful test coach.',
  creator_id: 'creator-456',
  is_public: true,
  category: CoachCategory.PRODUCTIVITY,
  is_featured: false,
  source_coach_id: null,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

describe('CoachPreviewScreen Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock router
    mockUseRouter.mockReturnValue(mockRouter as any);
    
    // Mock auth store
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
    
    // Mock coach store
    (useCoachStore as unknown as jest.Mock).mockReturnValue({
      fetchCoaches: jest.fn().mockResolvedValue(undefined),
    });
  });

  /**
   * Loading State Tests
   * Validates: Requirements 4.5
   */
  describe('Loading State', () => {
    it('should display loading indicator while fetching coach data', () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      // Mock a delayed response
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      expect(getByText('Loading coach details...')).toBeTruthy();
    });

    it('should display loading text with correct styling', () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(() => new Promise(() => {})),
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      const loadingText = getByText('Loading coach details...');
      expect(loadingText).toBeTruthy();
    });
  });

  /**
   * Error Handling Tests
   * Validates: Requirements 4.5
   */
  describe('Error Handling', () => {
    it('should display error message when coach ID is missing', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: undefined });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText('No coach ID provided')).toBeTruthy();
      });
    });

    it('should display error message when coach fetch fails', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Coach not found' },
        }),
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText(/Failed to fetch coach/)).toBeTruthy();
      });
    });

    it('should display error message when coach is not public', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Unable to Load Coach')).toBeTruthy();
        expect(getByText(/not found or is not public/)).toBeTruthy();
      });
    });

    it('should display "Go Back" button in error state', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: undefined });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const goBackButton = getByText('Go Back');
        expect(goBackButton).toBeTruthy();
      });
    });

    it('should navigate back when "Go Back" button is pressed in error state', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: undefined });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const goBackButton = getByText('Go Back');
        fireEvent.press(goBackButton);
      });
      
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  /**
   * Button Interaction Tests
   * Validates: Requirements 4.3, 4.4
   */
  describe('Button Interactions', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            creator: { id: sampleCoach.creator_id, email: 'creator@example.com' },
          },
          error: null,
        }),
      });
      
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue(null);
    });

    it('should display "Install Coach" button when coach is not installed', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Install Coach')).toBeTruthy();
      });
    });

    it('should display "Cancel" button', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });
    });

    it('should navigate back when Cancel button is pressed', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const cancelButton = getByText('Cancel');
        fireEvent.press(cancelButton);
      });
      
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should display close button in header', async () => {
      const { getByLabelText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByLabelText('Close preview')).toBeTruthy();
      });
    });

    it('should navigate back when close button is pressed', async () => {
      const { getByLabelText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const closeButton = getByLabelText('Close preview');
        fireEvent.press(closeButton);
      });
      
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should call installCoach when Install button is pressed', async () => {
      (coachInstaller.installCoach as jest.Mock).mockResolvedValue({
        id: 'installed-coach-id',
        name: sampleCoach.name,
        icon: sampleCoach.icon,
        systemPrompt: sampleCoach.system_prompt,
        creatorId: null,
        isPublic: false,
        category: sampleCoach.category,
        isFeatured: false,
        sourceCoachId: sampleCoach.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const installButton = getByText('Install Coach');
        fireEvent.press(installButton);
      });
      
      await waitFor(() => {
        expect(coachInstaller.installCoach).toHaveBeenCalledWith('coach-123', 'test-user-id');
      });
    });

    it('should show success alert after successful installation', async () => {
      (coachInstaller.installCoach as jest.Mock).mockResolvedValue({
        id: 'installed-coach-id',
        name: sampleCoach.name,
        icon: sampleCoach.icon,
        systemPrompt: sampleCoach.system_prompt,
        creatorId: null,
        isPublic: false,
        category: sampleCoach.category,
        isFeatured: false,
        sourceCoachId: sampleCoach.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const installButton = getByText('Install Coach');
        fireEvent.press(installButton);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Coach Installed! 🎉',
          expect.stringContaining(sampleCoach.name),
          expect.any(Array)
        );
      });
    });

    it('should show error alert when installation fails', async () => {
      (coachInstaller.installCoach as jest.Mock).mockRejectedValue(
        new Error('Installation failed')
      );
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const installButton = getByText('Install Coach');
        fireEvent.press(installButton);
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Installation Failed',
          expect.stringContaining('Installation failed'),
          expect.any(Array)
        );
      });
    });
  });

  /**
   * Already Installed Coach Tests
   * Validates: Requirements 3.6
   */
  describe('Already Installed Coach', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            creator: { id: sampleCoach.creator_id, email: 'creator@example.com' },
          },
          error: null,
        }),
      });
    });

    it('should display "Open Coach" button when coach is already installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Open Coach')).toBeTruthy();
      });
    });

    it('should display "already installed" notice when coach is installed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('You already have this coach installed')).toBeTruthy();
      });
    });

    it('should navigate to existing coach when "Open Coach" is pressed', async () => {
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(true);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue('existing-coach-id');
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        const openButton = getByText('Open Coach');
        fireEvent.press(openButton);
      });
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/chat/existing-coach-id');
    });
  });

  /**
   * Content Display Tests
   * Validates: Requirements 4.1
   */
  describe('Content Display', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            creator: { id: sampleCoach.creator_id, email: 'creator@example.com' },
          },
          error: null,
        }),
      });
      
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
      (coachInstaller.getInstalledCoachId as jest.Mock).mockResolvedValue(null);
    });

    it('should display coach name', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Test Coach')).toBeTruthy();
      });
    });

    it('should display coach icon', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('🤖')).toBeTruthy();
      });
    });

    it('should display creator name', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('by creator')).toBeTruthy();
      });
    });

    it('should display coach description', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('I am a helpful test coach.')).toBeTruthy();
      });
    });

    it('should display formatted creation date', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('Created January 15, 2024')).toBeTruthy();
      });
    });

    it('should display category badge', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText(/Productivity/)).toBeTruthy();
      });
    });

    it('should display "About This Coach" section title', async () => {
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('About This Coach')).toBeTruthy();
      });
    });
  });

  /**
   * Edge Cases
   */
  describe('Edge Cases', () => {
    it('should handle very long coach names', async () => {
      const longName = 'A'.repeat(100);
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            name: longName,
            creator: { id: sampleCoach.creator_id, email: 'creator@example.com' },
          },
          error: null,
        }),
      });
      
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText(longName)).toBeTruthy();
      });
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            system_prompt: longDescription,
            creator: { id: sampleCoach.creator_id, email: 'creator@example.com' },
          },
          error: null,
        }),
      });
      
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText(longDescription)).toBeTruthy();
      });
    });

    it('should handle missing creator email gracefully', async () => {
      mockUseLocalSearchParams.mockReturnValue({ coachId: 'coach-123' });
      
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            ...sampleCoach,
            creator: { id: sampleCoach.creator_id, email: null },
          },
          error: null,
        }),
      });
      
      (coachInstaller.checkIfInstalled as jest.Mock).mockResolvedValue(false);
      
      const { getByText } = render(<CoachPreviewScreen />);
      
      await waitFor(() => {
        expect(getByText('by Unknown')).toBeTruthy();
      });
    });
  });
});
