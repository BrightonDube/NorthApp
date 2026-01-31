/**
 * Context Store Tests
 * 
 * Basic unit tests for the context store to verify core functionality.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useContextStore } from '../contextStore';
import type { ContextCategory } from '@/types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-id',
              userId: 'user-123',
              category: 'values' as ContextCategory,
              content: 'Test value',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('contextStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useContextStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have empty items array', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.items).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.error).toBeNull();
    });

    it('should have no lastSynced timestamp initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.lastSynced).toBeNull();
    });
  });

  describe('canAddMore', () => {
    it('should allow Pro users to add unlimited items', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Add 5 items (more than free tier limit)
      act(() => {
        result.current.items = Array(5).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(true)).toBe(true);
    });

    it('should limit free users to 3 items', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Add 2 items
      act(() => {
        result.current.items = Array(2).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(false)).toBe(true);

      // Add 3rd item
      act(() => {
        result.current.items = Array(3).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(false)).toBe(false);
    });
  });

  describe('getByCategory', () => {
    it('should filter items by category', () => {
      const { result } = renderHook(() => useContextStore());
      
      act(() => {
        result.current.items = [
          {
            id: '1',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            userId: 'user-123',
            category: 'goals' as ContextCategory,
            content: 'Goal 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 2',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      const values = result.current.getByCategory('values');
      expect(values).toHaveLength(2);
      expect(values[0].content).toBe('Value 1');
      expect(values[1].content).toBe('Value 2');

      const goals = result.current.getByCategory('goals');
      expect(goals).toHaveLength(1);
      expect(goals[0].content).toBe('Goal 1');
    });

    it('should return empty array for category with no items', () => {
      const { result } = renderHook(() => useContextStore());
      
      const projects = result.current.getByCategory('projects');
      expect(projects).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Set an error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Set some state
      act(() => {
        result.current.items = [
          {
            id: '1',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        result.current.error = 'Test error';
        result.current.lastSynced = Date.now();
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSynced).toBeNull();
    });
  });
});
