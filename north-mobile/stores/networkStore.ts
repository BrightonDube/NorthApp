/**
 * Network Store
 * 
 * Manages network connectivity state using NetInfo.
 * Provides real-time network status updates for offline resilience.
 * 
 * Validates: Requirements 16.1, 16.2
 */

import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Network store state
 */
interface NetworkState {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Network store actions
 */
interface NetworkActions {
  initialize: () => void;
  cleanup: () => void;
}

/**
 * Complete network store type
 */
type NetworkStore = NetworkState & NetworkActions;

/**
 * Network status listener unsubscribe function
 */
let unsubscribe: (() => void) | null = null;

/**
 * Network Store
 * 
 * Provides network connectivity monitoring with the following features:
 * - Real-time network status updates
 * - Online/offline detection
 * - Internet reachability checking
 * - Connection type information
 * 
 * @example
 * ```typescript
 * import { useNetworkStore } from '@/stores/networkStore';
 * 
 * function MyComponent() {
 *   const { isOnline, initialize } = useNetworkStore();
 *   
 *   useEffect(() => {
 *     initialize();
 *   }, []);
 *   
 *   if (!isOnline) {
 *     return <Text>You are offline</Text>;
 *   }
 *   
 *   return <Text>You are online</Text>;
 * }
 * ```
 */
export const useNetworkStore = create<NetworkStore>((set) => ({
  // ============================================================================
  // State
  // ============================================================================
  
  isOnline: true, // Assume online initially
  isInternetReachable: null, // null = unknown
  type: null,

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Initialize network status monitoring
   * 
   * Validates: Requirements 16.1
   * 
   * Sets up a listener for network state changes and fetches initial state.
   * Should be called once when the app starts.
   * 
   * @example
   * ```typescript
   * // In App.tsx or root component
   * useEffect(() => {
   *   const { initialize } = useNetworkStore.getState();
   *   initialize();
   * }, []);
   * ```
   */
  initialize: () => {
    // Prevent multiple subscriptions
    if (unsubscribe) {
      return;
    }

    // Subscribe to network state changes
    unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      set({
        isOnline: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Fetch initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      set({
        isOnline: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });
  },

  /**
   * Cleanup network status monitoring
   * 
   * Removes the network state listener.
   * Should be called when the app unmounts or during cleanup.
   * 
   * @example
   * ```typescript
   * // In App.tsx cleanup
   * useEffect(() => {
   *   const { initialize, cleanup } = useNetworkStore.getState();
   *   initialize();
   *   
   *   return () => {
   *     cleanup();
   *   };
   * }, []);
   * ```
   */
  cleanup: () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  },
}));

/**
 * Helper hook to check if device is online
 * 
 * @returns true if device is connected to network, false otherwise
 * 
 * @example
 * ```typescript
 * function SendButton() {
 *   const isOnline = useIsOnline();
 *   
 *   return (
 *     <Button 
 *       disabled={!isOnline}
 *       onPress={sendMessage}
 *     >
 *       {isOnline ? 'Send' : 'Offline'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useIsOnline(): boolean {
  return useNetworkStore((state) => state.isOnline);
}

/**
 * Helper hook to check if internet is reachable
 * 
 * @returns true if internet is reachable, false if not, null if unknown
 * 
 * @example
 * ```typescript
 * function DataSyncIndicator() {
 *   const isInternetReachable = useIsInternetReachable();
 *   
 *   if (isInternetReachable === false) {
 *     return <Text>No internet connection</Text>;
 *   }
 *   
 *   return <Text>Connected</Text>;
 * }
 * ```
 */
export function useIsInternetReachable(): boolean | null {
  return useNetworkStore((state) => state.isInternetReachable);
}

/**
 * Helper hook to get connection type
 * 
 * @returns Connection type (wifi, cellular, etc.) or null if unknown
 * 
 * @example
 * ```typescript
 * function ConnectionInfo() {
 *   const connectionType = useConnectionType();
 *   
 *   return <Text>Connection: {connectionType || 'Unknown'}</Text>;
 * }
 * ```
 */
export function useConnectionType(): string | null {
  return useNetworkStore((state) => state.type);
}
