/**
 * Marketplace Screen Unit Tests
 * 
 * Tests specific examples, edge cases, and error conditions for the marketplace screen.
 * 
 * Validates: Requirements 1.5, 9.4
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MarketplaceScreen from '../marketplace';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('@/lib/searchEngine', () => ({
  searchEngine: {
    search: jest.fn((coaches, query) => {
      if (!query) return coaches;
      return coaches.filter((c: any) => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.systemPrompt.toLowerCase().includes(query.toLowerCase()) ||
        c.creatorName.toLowerCase().includes(query.toLowerCase())
      );
    }),
  },
}));

jest.mock('@/lib/coachDeepLinkGenerator', () => ({
  coachDeepLinkGenerator: {
    generateCoachLink: jest.fn((id) => `northapp://coach/install/${id}`),
    openShareDialog: jest.fn(),
  },
}));

describe('MarketplaceScreen', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ user: mockUser });
  });

  /**
   * Test: Empty state display
   * Validates: Requirements 1.5
   */
  describe('Empty State', () => {
    it('should display empty state when no public coaches exist', async () => {
      // Mock empty response for coaches
      const mockSelect = jest.fn();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });
      const mockIn = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      
      // First call for coaches
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        order: mockOrder,
      });
      
      // Second call for profiles
      mockSelect.mockReturnValueOnce({
        in: mockIn,
      });

      const { getByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('No public coaches available')).toBeTruthy();
        expect(getByText('Check back later for new coaches')).toBeTruthy();
      });
    });

    it('should display empty state for search with no results', async () => {
      // Mock response with coaches
      const mockCoaches = [
        {
          id: '1',
          name: 'Productivity Coach',
          icon: '⚡',
          system_prompt: 'Help with productivity',
          creator_id: 'creator-1',
          is_public: true,
          category: 'Productivity',
          is_featured: false,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      // Mock profiles response
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      }).mockReturnValueOnce({
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'creator-1', name: 'Creator' }],
          error: null,
        }),
      });

      const { getByPlaceholderText, getByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Productivity Coach')).toBeTruthy();
      });

      // Search for something that doesn't exist
      const searchInput = getByPlaceholderText('Search coaches...');
      fireEvent.changeText(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(getByText('No coaches found for "nonexistent"')).toBeTruthy();
        expect(getByText('Try a different search term')).toBeTruthy();
      });
    });

    it('should display empty state for category with no coaches', async () => {
      // Mock response with coaches in different category
      const mockCoaches = [
        {
          id: '1',
          name: 'Productivity Coach',
          icon: '⚡',
          system_prompt: 'Help with productivity',
          creator_id: 'creator-1',
          is_public: true,
          category: 'Productivity',
          is_featured: false,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });
      const mockIn = jest.fn().mockResolvedValue({
        data: [{ id: 'creator-1', name: 'Creator' }],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      
      // First call for coaches
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        order: mockOrder,
      });
      
      // Second call for profiles
      mockSelect.mockReturnValueOnce({
        in: mockIn,
      });

      const { getByText, getByTestId } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Productivity Coach')).toBeTruthy();
      });

      // Select a category with no coaches using testID
      const healthCategory = getByTestId('category-filter-Health');
      fireEvent.press(healthCategory);

      await waitFor(() => {
        expect(getByText('No coaches in Health category')).toBeTruthy();
      });
    });
  });

  /**
   * Test: Skeleton loading states
   * Validates: Requirements 9.4
   */
  describe('Loading States', () => {
    it('should display skeleton loading state on initial load', () => {
      // Mock pending response
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnValue(
        new Promise(() => {}) // Never resolves to keep loading state
      );

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { getByLabelText } = render(<MarketplaceScreen />);

      // Should show skeleton loader with accessibility label
      expect(getByLabelText('Loading coaches')).toBeTruthy();
    });

    it('should hide skeleton after data loads', async () => {
      const mockCoaches = [
        {
          id: '1',
          name: 'Test Coach',
          icon: '🎯',
          system_prompt: 'Test prompt',
          creator_id: 'creator-1',
          is_public: true,
          category: 'General',
          is_featured: false,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      // Mock profiles response
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      }).mockReturnValueOnce({
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'creator-1', name: 'Creator' }],
          error: null,
        }),
      });

      const { queryByTestId, getByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Test Coach')).toBeTruthy();
        expect(queryByTestId('coach-grid-skeleton')).toBeNull();
      });
    });
  });

  /**
   * Test: Error handling
   * Validates: Requirements 1.5
   */
  describe('Error Handling', () => {
    it('should display error state when fetch fails', async () => {
      const mockSelect = jest.fn();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Network error' },
      });
      const mockIn = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      
      // First call for coaches
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        order: mockOrder,
      });
      
      // Second call for profiles
      mockSelect.mockReturnValueOnce({
        in: mockIn,
      });

      const { getByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
        expect(getByText('Try Again')).toBeTruthy();
      });
    });

    it('should retry fetch when retry button is pressed', async () => {
      let callCount = 0;
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            data: null,
            error: { message: 'Network error' },
          });
        }
        return Promise.resolve({
          data: [],
          error: null,
        });
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const { getByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
      });

      // Press retry button
      const retryButton = getByText('Try Again');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(getByText('No public coaches available')).toBeTruthy();
      });

      expect(callCount).toBe(2);
    });
  });

  /**
   * Test: Featured section visibility
   * Validates: Requirements 6.1, 6.4
   */
  describe('Featured Section', () => {
    it('should hide featured section when no featured coaches exist', async () => {
      const mockCoaches = [
        {
          id: '1',
          name: 'Regular Coach',
          icon: '🎯',
          system_prompt: 'Test prompt',
          creator_id: 'creator-1',
          is_public: true,
          category: 'General',
          is_featured: false,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      // Mock profiles response
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      }).mockReturnValueOnce({
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'creator-1', name: 'Creator' }],
          error: null,
        }),
      });

      const { queryByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(queryByText('Featured Coaches')).toBeNull();
      });
    });

    it('should show featured section when featured coaches exist', async () => {
      const mockCoaches = [
        {
          id: '1',
          name: 'Featured Coach',
          icon: '⭐',
          system_prompt: 'Featured prompt',
          creator_id: 'creator-1',
          is_public: true,
          category: 'General',
          is_featured: true,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });
      const mockIn = jest.fn().mockResolvedValue({
        data: [{ id: 'creator-1', name: 'Creator' }],
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      
      // First call for coaches
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      });
      mockEq.mockReturnValueOnce({
        order: mockOrder,
      });
      
      // Second call for profiles
      mockSelect.mockReturnValueOnce({
        in: mockIn,
      });

      const { getByText, getAllByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(getByText('Featured Coaches')).toBeTruthy();
        // Coach appears in both featured section and all coaches section
        expect(getAllByText('Featured Coach').length).toBeGreaterThan(0);
      });
    });

    it('should hide featured section when search is active', async () => {
      jest.useFakeTimers();

      const mockCoaches = [
        {
          id: '1',
          name: 'Featured Coach',
          icon: '⭐',
          system_prompt: 'Featured prompt',
          creator_id: 'creator-1',
          is_public: true,
          category: 'General',
          is_featured: true,
          source_coach_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockResolvedValue({
        data: mockCoaches,
        error: null,
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      // Mock profiles response
      mockSelect.mockReturnValueOnce({
        eq: mockEq,
      }).mockReturnValueOnce({
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'creator-1', name: 'Creator' }],
          error: null,
        }),
      });

      const { getByPlaceholderText, queryByText } = render(<MarketplaceScreen />);

      await waitFor(() => {
        expect(queryByText('Featured Coaches')).toBeTruthy();
      });

      // Start searching
      const searchInput = getByPlaceholderText('Search coaches...');
      fireEvent.changeText(searchInput, 'Featured');

      // Advance timers to trigger debounce (300ms)
      jest.advanceTimersByTime(300);

      // Wait for the component to update after debounce
      await waitFor(() => {
        expect(queryByText('Featured Coaches')).toBeNull();
      });

      jest.useRealTimers();
    });
  });
});
