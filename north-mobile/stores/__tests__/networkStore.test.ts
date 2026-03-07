/**
 * Network Store Tests
 * 
 * Unit tests for the network status store.
 */

import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore, useIsOnline, useIsInternetReachable, useConnectionType } from '../networkStore';

// NetInfo is already mocked in jest.setup.js

describe('networkStore', () => {
  beforeEach(() => {
    // Reset store state
    useNetworkStore.setState({
      isOnline: true,
      isInternetReachable: null,
      type: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should set up network listener', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        result.current.initialize();
      });

      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(NetInfo.fetch).toHaveBeenCalled();
    });

    it('should prevent multiple subscriptions', () => {
      const { result } = renderHook(() => useNetworkStore());

      // First initialization
      act(() => {
        result.current.initialize();
      });

      const firstCallCount = (NetInfo.addEventListener as jest.Mock).mock.calls.length;

      // Second initialization should not create new subscription
      act(() => {
        result.current.initialize();
      });

      const secondCallCount = (NetInfo.addEventListener as jest.Mock).mock.calls.length;

      // Should be the same - no new subscription created
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('cleanup', () => {
    it('should handle cleanup when not initialized', () => {
      const { result } = renderHook(() => useNetworkStore());

      expect(() => {
        act(() => {
          result.current.cleanup();
        });
      }).not.toThrow();
    });
  });

  describe('useIsOnline hook', () => {
    it('should return online status', () => {
      const { result } = renderHook(() => useIsOnline());

      expect(result.current).toBe(true);
    });

    it('should update when network status changes', () => {
      const { result } = renderHook(() => useIsOnline());

      act(() => {
        useNetworkStore.setState({ isOnline: false });
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useIsInternetReachable hook', () => {
    it('should return internet reachability status', () => {
      const { result } = renderHook(() => useIsInternetReachable());

      expect(result.current).toBe(null);
    });

    it('should update when internet reachability changes', () => {
      const { result } = renderHook(() => useIsInternetReachable());

      act(() => {
        useNetworkStore.setState({ isInternetReachable: true });
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useConnectionType hook', () => {
    it('should return connection type', () => {
      const { result } = renderHook(() => useConnectionType());

      expect(result.current).toBe(null);
    });

    it('should update when connection type changes', () => {
      const { result } = renderHook(() => useConnectionType());

      act(() => {
        useNetworkStore.setState({ type: 'wifi' });
      });

      expect(result.current).toBe('wifi');
    });
  });

  describe('initial state', () => {
    it('should start with online state', () => {
      const { result } = renderHook(() => useNetworkStore());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isInternetReachable).toBe(null);
      expect(result.current.type).toBe(null);
    });
  });

  describe('state management', () => {
    it('should handle offline state', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        useNetworkStore.setState({
          isOnline: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isInternetReachable).toBe(false);
      expect(result.current.type).toBe('none');
    });

    it('should handle cellular connection', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        useNetworkStore.setState({
          isOnline: true,
          isInternetReachable: true,
          type: 'cellular',
        });
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isInternetReachable).toBe(true);
      expect(result.current.type).toBe('cellular');
    });

    it('should handle wifi connection', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        useNetworkStore.setState({
          isOnline: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isInternetReachable).toBe(true);
      expect(result.current.type).toBe('wifi');
    });

    it('should handle unknown internet reachability', () => {
      const { result } = renderHook(() => useNetworkStore());

      act(() => {
        useNetworkStore.setState({
          isOnline: true,
          isInternetReachable: null,
          type: 'wifi',
        });
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isInternetReachable).toBe(null);
      expect(result.current.type).toBe('wifi');
    });
  });
});
