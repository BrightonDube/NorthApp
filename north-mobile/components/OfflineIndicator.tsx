/**
 * Offline Indicator Component
 * 
 * Displays a banner at the top of the screen when the device is offline.
 * Uses the networkStore to monitor connectivity status.
 * 
 * Design: Minimal, non-intrusive banner with clear messaging
 * 
 * Validates: Requirements 16.1, 16.2
 */

import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useIsOnline } from '@/stores/networkStore';

/**
 * Offline Indicator Component
 * 
 * Automatically shows/hides based on network connectivity.
 * Displays at the top of the screen with a subtle animation.
 * 
 * @example
 * ```tsx
 * import { OfflineIndicator } from '@/components/OfflineIndicator';
 * 
 * export default function MyScreen() {
 *   return (
 *     <SafeAreaView>
 *       <OfflineIndicator />
 *       {/* Rest of screen content *\/}
 *     </SafeAreaView>
 *   );
 * }
 * ```
 */
export function OfflineIndicator() {
  const isOnline = useIsOnline();

  // Don't render anything if online
  if (isOnline) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel="You are offline"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>You're offline</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B', // Amber-500
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D97706', // Amber-600
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
