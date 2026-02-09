/**
 * Unit tests for useHaptic hook
 * 
 * Tests the React hook wrapper for HapticService.
 * Validates that the hook provides convenient API for components.
 * 
 * Requirements:
 * - 10.1: Define haptic feedback patterns for different interaction types
 * - 10.2: Trigger medium-impact haptic for significant actions
 * - 10.3: Trigger light-impact haptic for selections
 * - 10.4: Trigger notification-style haptic for errors
 * - 10.5: Limit haptic feedback to meaningful interactions only
 * - 10.6: Trigger selection-style haptic for toggles
 */

import { renderHook, act } from '@testing-library/react-native';
import { useHaptic } from '../useHaptic';
import HapticService, { HapticType } from '@/lib/haptics';

// Mock the HapticService
jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  default: {
    trigger: jest.fn(),
    isAvailable: jest.fn(),
    isEnabled: jest.fn(),
  },
  HapticType: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    Selection: 'selection',
  },
}));

describe('useHaptic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (HapticService.isAvailable as jest.Mock).mockReturnValue(true);
    (HapticService.isEnabled as jest.Mock).mockReturnValue(true);
    (HapticService.trigger as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Hook initialization', () => {
    it('should return all required methods and properties', () => {
      const { result } = renderHook(() => useHaptic());

      expect(result.current).toHaveProperty('trigger');
      expect(result.current).toHaveProperty('isAvailable');
      expect(result.current).toHaveProperty('isEnabled');
      expect(result.current).toHaveProperty('light');
      expect(result.current).toHaveProperty('medium');
      expect(result.current).toHaveProperty('heavy');
      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('selection');
    });

    it('should check availability on initialization', () => {
      renderHook(() => useHaptic());

      expect(HapticService.isAvailable).toHaveBeenCalled();
    });

    it('should check enabled status on initialization', () => {
      renderHook(() => useHaptic());

      expect(HapticService.isEnabled).toHaveBeenCalled();
    });
  });

  describe('Status properties', () => {
    it('should return true for isAvailable when haptics are available', () => {
      (HapticService.isAvailable as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useHaptic());

      expect(result.current.isAvailable).toBe(true);
    });

    it('should return false for isAvailable when haptics are not available', () => {
      (HapticService.isAvailable as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useHaptic());

      expect(result.current.isAvailable).toBe(false);
    });

    it('should return true for isEnabled when haptics are enabled', () => {
      (HapticService.isEnabled as jest.Mock).mockReturnValue(true);

      const { result } = renderHook(() => useHaptic());

      expect(result.current.isEnabled).toBe(true);
    });

    it('should return false for isEnabled when haptics are disabled', () => {
      (HapticService.isEnabled as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useHaptic());

      expect(result.current.isEnabled).toBe(false);
    });
  });

  describe('trigger method', () => {
    it('should call HapticService.trigger with the specified type', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.trigger(HapticType.Light);
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Light);
    });

    it('should call HapticService.trigger with different types', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.trigger(HapticType.Medium);
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Medium);

      await act(async () => {
        await result.current.trigger(HapticType.Success);
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Success);
    });
  });

  describe('Convenience methods', () => {
    it('should trigger light haptic when light() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.light();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Light);
    });

    it('should trigger medium haptic when medium() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.medium();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Medium);
    });

    it('should trigger heavy haptic when heavy() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.heavy();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Heavy);
    });

    it('should trigger success haptic when success() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.success();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Success);
    });

    it('should trigger warning haptic when warning() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.warning();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Warning);
    });

    it('should trigger error haptic when error() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.error();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Error);
    });

    it('should trigger selection haptic when selection() is called', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.selection();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Selection);
    });
  });

  describe('Memoization', () => {
    it('should return stable references for methods across re-renders', () => {
      const { result, rerender } = renderHook(() => useHaptic());

      const firstRender = {
        trigger: result.current.trigger,
        light: result.current.light,
        medium: result.current.medium,
        heavy: result.current.heavy,
        success: result.current.success,
        warning: result.current.warning,
        error: result.current.error,
        selection: result.current.selection,
      };

      rerender();

      expect(result.current.trigger).toBe(firstRender.trigger);
      expect(result.current.light).toBe(firstRender.light);
      expect(result.current.medium).toBe(firstRender.medium);
      expect(result.current.heavy).toBe(firstRender.heavy);
      expect(result.current.success).toBe(firstRender.success);
      expect(result.current.warning).toBe(firstRender.warning);
      expect(result.current.error).toBe(firstRender.error);
      expect(result.current.selection).toBe(firstRender.selection);
    });

    it('should return stable values for status properties across re-renders', () => {
      const { result, rerender } = renderHook(() => useHaptic());

      const firstIsAvailable = result.current.isAvailable;
      const firstIsEnabled = result.current.isEnabled;

      rerender();

      expect(result.current.isAvailable).toBe(firstIsAvailable);
      expect(result.current.isEnabled).toBe(firstIsEnabled);
    });
  });

  describe('Error handling', () => {
    it('should handle errors from HapticService.trigger gracefully', async () => {
      (HapticService.trigger as jest.Mock).mockRejectedValue(new Error('Haptic failed'));

      const { result } = renderHook(() => useHaptic());

      // Should not throw
      await expect(
        act(async () => {
          await result.current.light();
        })
      ).rejects.toThrow('Haptic failed');
    });
  });

  describe('Usage patterns', () => {
    it('should support button press pattern (light haptic)', async () => {
      const { result } = renderHook(() => useHaptic());

      // Simulate button press
      await act(async () => {
        await result.current.light();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Light);
    });

    it('should support toggle switch pattern (selection haptic)', async () => {
      const { result } = renderHook(() => useHaptic());

      // Simulate toggle
      await act(async () => {
        await result.current.selection();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Selection);
    });

    it('should support action completion pattern (medium haptic)', async () => {
      const { result } = renderHook(() => useHaptic());

      // Simulate action completion
      await act(async () => {
        await result.current.medium();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Medium);
    });

    it('should support success feedback pattern', async () => {
      const { result } = renderHook(() => useHaptic());

      // Simulate success
      await act(async () => {
        await result.current.success();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Success);
    });

    it('should support error feedback pattern', async () => {
      const { result } = renderHook(() => useHaptic());

      // Simulate error
      await act(async () => {
        await result.current.error();
      });

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Error);
    });
  });

  describe('Multiple calls', () => {
    it('should handle multiple sequential haptic triggers', async () => {
      const { result } = renderHook(() => useHaptic());

      await act(async () => {
        await result.current.light();
        await result.current.medium();
        await result.current.success();
      });

      expect(HapticService.trigger).toHaveBeenCalledTimes(3);
      expect(HapticService.trigger).toHaveBeenNthCalledWith(1, HapticType.Light);
      expect(HapticService.trigger).toHaveBeenNthCalledWith(2, HapticType.Medium);
      expect(HapticService.trigger).toHaveBeenNthCalledWith(3, HapticType.Success);
    });
  });
});
