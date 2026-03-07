/**
 * Memory Management Screen Unit Tests
 * 
 * Tests the UI behavior of the memories screen including:
 * - Loading state
 * - Empty state
 * - Memory list display
 * - Search functionality
 * - Category filtering
 * - Delete confirmation
 * 
 * Validates: Requirements 2.2 (Long-Term Memory)
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MemoriesScreen from '../memories';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { ThemeProvider } from '@/contexts/ThemeContext';

// Mock navigation
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

// Mock stores
jest.mock('@/stores/memoriesStore');

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
  },
}));

// Helper to render with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe('Memories Screen', () => {
  const mockMemories = [
    {
      id: 'mem-1',
      content: 'Values honesty and transparency in relationships',
      category: 'values',
      importance: 'high' as const,
      created_at: '2026-02-24T10:30:00Z',
    },
    {
      id: 'mem-2',
      content: 'Goal: Launch a successful startup by end of year',
      category: 'goals',
      importance: 'high' as const,
      created_at: '2026-02-23T15:20:00Z',
    },
    {
      id: 'mem-3',
      content: 'Currently working on mobile app development',
      category: 'projects',
      importance: 'medium' as const,
      created_at: '2026-02-22T09:15:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementation
    (useMemoriesStore as any).mockReturnValue({
      memories: [],
      isLoading: false,
      error: null,
      fetchMemories: jest.fn(),
      deleteMemory: jest.fn(),
      clearError: jest.fn(),
    });
  });

  describe('Loading State', () => {
    it('should display loading indicator when fetching memories', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: [],
        isLoading: true,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByText } = renderWithTheme(<MemoriesScreen />);

      expect(getByText('Loading memories...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no memories exist', () => {
      const { getByText } = renderWithTheme(<MemoriesScreen />);

      expect(getByText('No memories yet')).toBeTruthy();
      expect(getByText('Start chatting with your coach to build your memory bank')).toBeTruthy();
    });

    it('should display search empty state when no matches found', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText, getByText } = renderWithTheme(<MemoriesScreen />);

      const searchInput = getByPlaceholderText('Search memories...');
      fireEvent.changeText(searchInput, 'nonexistent query');

      expect(getByText('No matches found')).toBeTruthy();
      expect(getByText('Try adjusting your search or filters')).toBeTruthy();
    });
  });

  describe('Memory List Display', () => {
    it('should display all memories', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByText } = renderWithTheme(<MemoriesScreen />);

      expect(getByText('Values honesty and transparency in relationships')).toBeTruthy();
      expect(getByText('Goal: Launch a successful startup by end of year')).toBeTruthy();
      expect(getByText('Currently working on mobile app development')).toBeTruthy();
    });

    it('should display memory count', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByText } = renderWithTheme(<MemoriesScreen />);

      expect(getByText('3 memories')).toBeTruthy();
    });

    it('should display category badges', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getAllByText } = renderWithTheme(<MemoriesScreen />);

      // Category labels appear in both filter chips and memory cards
      expect(getAllByText('Values').length).toBeGreaterThan(0);
      expect(getAllByText('Goals').length).toBeGreaterThan(0);
      expect(getAllByText('Projects').length).toBeGreaterThan(0);
    });
  });

  describe('Search Functionality', () => {
    it('should filter memories by search query', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText, getByText, queryByText } = renderWithTheme(<MemoriesScreen />);

      const searchInput = getByPlaceholderText('Search memories...');
      fireEvent.changeText(searchInput, 'startup');

      expect(getByText('Goal: Launch a successful startup by end of year')).toBeTruthy();
      expect(queryByText('Values honesty and transparency in relationships')).toBeNull();
    });

    it('should be case-insensitive', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText, getByText } = renderWithTheme(<MemoriesScreen />);

      const searchInput = getByPlaceholderText('Search memories...');
      fireEvent.changeText(searchInput, 'STARTUP');

      expect(getByText('Goal: Launch a successful startup by end of year')).toBeTruthy();
    });

    it('should clear search when X button is pressed', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText, getByLabelText, getByText } = renderWithTheme(<MemoriesScreen />);

      const searchInput = getByPlaceholderText('Search memories...');
      fireEvent.changeText(searchInput, 'startup');

      const clearButton = getByLabelText('Clear search');
      fireEvent.press(clearButton);

      // All memories should be visible again
      expect(getByText('3 memories')).toBeTruthy();
    });
  });

  describe('Category Filtering', () => {
    it('should filter memories by category', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByLabelText, getByText, queryByText } = renderWithTheme(<MemoriesScreen />);

      const valuesFilter = getByLabelText('Filter by Values');
      fireEvent.press(valuesFilter);

      expect(getByText('Values honesty and transparency in relationships')).toBeTruthy();
      expect(queryByText('Goal: Launch a successful startup by end of year')).toBeNull();
      expect(getByText('1 memory')).toBeTruthy();
    });

    it('should toggle category filter off when pressed again', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByLabelText, getByText } = renderWithTheme(<MemoriesScreen />);

      const valuesFilter = getByLabelText('Filter by Values');
      fireEvent.press(valuesFilter);
      fireEvent.press(valuesFilter);

      // All memories should be visible again
      expect(getByText('3 memories')).toBeTruthy();
    });

    it('should combine search and category filters', () => {
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      const { getByPlaceholderText, getByLabelText, queryByText } = renderWithTheme(<MemoriesScreen />);

      const searchInput = getByPlaceholderText('Search memories...');
      fireEvent.changeText(searchInput, 'working');

      const projectsFilter = getByLabelText('Filter by Projects');
      fireEvent.press(projectsFilter);

      expect(queryByText('Currently working on mobile app development')).toBeTruthy();
      expect(queryByText('Values honesty and transparency in relationships')).toBeNull();
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog when delete is pressed', () => {
      const mockDeleteMemory = jest.fn();
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: mockDeleteMemory,
        clearError: jest.fn(),
      });

      const { getAllByLabelText } = renderWithTheme(<MemoriesScreen />);

      const deleteButtons = getAllByLabelText('Delete memory');
      fireEvent.press(deleteButtons[0]);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Memory',
        expect.stringContaining('Values honesty and transparency'),
        expect.any(Array)
      );
    });

    it('should call deleteMemory when confirmed', async () => {
      const mockDeleteMemory = jest.fn().mockResolvedValue(true);
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: mockDeleteMemory,
        clearError: jest.fn(),
      });

      const { getAllByLabelText } = renderWithTheme(<MemoriesScreen />);

      const deleteButtons = getAllByLabelText('Delete memory');
      fireEvent.press(deleteButtons[0]);

      // Get the confirmation callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Delete');
      
      await confirmButton.onPress();

      expect(mockDeleteMemory).toHaveBeenCalledWith('mem-1');
    });

    it('should not delete when cancelled', () => {
      const mockDeleteMemory = jest.fn();
      (useMemoriesStore as any).mockReturnValue({
        memories: mockMemories,
        isLoading: false,
        error: null,
        fetchMemories: jest.fn(),
        deleteMemory: mockDeleteMemory,
        clearError: jest.fn(),
      });

      const { getAllByLabelText } = renderWithTheme(<MemoriesScreen />);

      const deleteButtons = getAllByLabelText('Delete memory');
      fireEvent.press(deleteButtons[0]);

      // Get the cancel callback
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const cancelButton = alertCall[2].find((btn: any) => btn.text === 'Cancel');
      
      if (cancelButton.onPress) {
        cancelButton.onPress();
      }

      expect(mockDeleteMemory).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('should navigate back when back button is pressed', () => {
      const { getByLabelText } = renderWithTheme(<MemoriesScreen />);

      const backButton = getByLabelText('Go back');
      fireEvent.press(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error alert when error occurs', () => {
      const mockClearError = jest.fn();
      (useMemoriesStore as any).mockReturnValue({
        memories: [],
        isLoading: false,
        error: 'Failed to fetch memories',
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: mockClearError,
      });

      renderWithTheme(<MemoriesScreen />);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Failed to fetch memories',
        expect.any(Array)
      );
    });

    it('should clear error when OK is pressed', () => {
      const mockClearError = jest.fn();
      (useMemoriesStore as any).mockReturnValue({
        memories: [],
        isLoading: false,
        error: 'Failed to fetch memories',
        fetchMemories: jest.fn(),
        deleteMemory: jest.fn(),
        clearError: mockClearError,
      });

      renderWithTheme(<MemoriesScreen />);

      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should fetch memories on mount', () => {
      const mockFetchMemories = jest.fn();
      (useMemoriesStore as any).mockReturnValue({
        memories: [],
        isLoading: false,
        error: null,
        fetchMemories: mockFetchMemories,
        deleteMemory: jest.fn(),
        clearError: jest.fn(),
      });

      renderWithTheme(<MemoriesScreen />);

      expect(mockFetchMemories).toHaveBeenCalled();
    });
  });
});
