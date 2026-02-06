/**
 * useReducedMotion Hook Tests
 * 
 * Tests the reduced motion preference detection hook.
 * Validates: Requirements 15.2, 23.1-23.10
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from '../useReducedMotion';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(),
    addEventListener: jest.fn(),
  },
}));

describe('useReducedMotion', () => {
  let mockEventListener: ((isEnabled: boolean) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventListener = null;

    // Setup addEventListener mock to capture the listener
    (AccessibilityInfo.addEventListener as jest.Mock).mockImplementation(
      (eventName: string, listener: (isEnabled: boolean) => void) => {
        mockEventListener = listener;
        return {
          remove: jest.fn(),
        };
      }
    );
  });

  it('should return false when reduced motion is disabled', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should return true when reduced motion is enabled', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useReducedMotion());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should update when reduced motion setting changes', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useReducedMotion());

    // Wait for initial value
    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Simulate setting change
    if (mockEventListener) {
      mockEventListener(true);
    }

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should register event listener on mount', () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

    renderHook(() => useReducedMotion());

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function)
    );
  });

  it('should cleanup event listener on unmount', () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);

    const mockRemove = jest.fn();
    (AccessibilityInfo.addEventListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });

    const { unmount } = renderHook(() => useReducedMotion());

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('should handle errors gracefully when checking initial state', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(
      new Error('AccessibilityInfo error')
    );

    const { result } = renderHook(() => useReducedMotion());

    // Should default to false on error
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
