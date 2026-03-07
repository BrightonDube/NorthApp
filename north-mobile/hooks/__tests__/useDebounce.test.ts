/**
 * Unit Tests for useDebounce Hook
 * 
 * Tests the debounce functionality for delaying value updates.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value updates', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 300 });

    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time by 300ms
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Value should now be updated
    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should reset timer on rapid value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Rapid updates
    rerender({ value: 'update1' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'update2' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'update3' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should still be initial value (only 300ms total, but timer reset each time)
    expect(result.current).toBe('initial');

    // Wait for full delay after last update
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should now be the last value
    await waitFor(() => {
      expect(result.current).toBe('update3');
    });
  });

  it('should use default delay of 300ms when not specified', async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should handle different delay values', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should work with different value types', async () => {
    // Test with number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(numberResult.current).toBe(42);
    });

    // Test with object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }: { value: { name: string } }) => useDebounce(value, 300),
      { initialProps: { value: { name: 'initial' } } }
    );

    const newObj = { name: 'updated' };
    objectRerender({ value: newObj });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(objectResult.current).toBe(newObj);
    });
  });

  it('should cleanup timer on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 300));
    
    // Should not throw error on unmount
    expect(() => unmount()).not.toThrow();
  });
});
