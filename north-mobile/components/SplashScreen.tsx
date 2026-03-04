/**
 * SplashScreen Component
 * 
 * Custom splash screen with gradient background for the North mobile app.
 * Features a blue-to-purple gradient with centered logo and footer branding.
 * 
 * @module components/SplashScreen
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';

/**
 * Props for the SplashScreen component
 */
export interface SplashScreenProps {
  /**
   * Callback fired when the splash screen is ready to be hidden
   */
  onReady?: () => void;
  
  /**
   * Whether to show the splash screen
   * @default true
   */
  visible?: boolean;
}

/**
 * Custom splash screen component with gradient background
 * 
 * Displays a linear gradient from blue (#4A90E2) at the top to 
 * purple/lavender (#B8A4E8) at the bottom, covering the entire screen.
 * 
 * @example
 * ```tsx
 * <SplashScreen 
 *   visible={isLoading}
 *   onReady={() => setIsLoading(false)}
 * />
 * ```
 * 
 * @param props - Component props
 * @returns SplashScreen component
 */
export function SplashScreen({ onReady, visible = true }: SplashScreenProps): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Call onReady callback when component is mounted and ready
  useEffect(() => {
    if (visible && onReady) {
      onReady();
    }
  }, [visible, onReady]);
  
  // Animate fade-out when visibility changes to false
  useEffect(() => {
    if (!visible) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset opacity when becoming visible again
      fadeAnim.setValue(1);
    }
  }, [visible, fadeAnim]);
  
  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#4A90E2', '#B8A4E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.container}>
          {/* Logo container with rounded background */}
          <View style={styles.logoContainer}>
            <Logo size={90} style={{ tintColor: '#FFFFFF' }} />
          </View>
        </View>

        {/* Footer branding */}
        <View style={[styles.footer, { marginBottom: 32 + insets.bottom }]}>
          <Text style={styles.brandText}>Lovi</Text>
          <Text style={styles.attributionText}>curated by Mobbin</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    backgroundColor: 'rgba(184, 164, 232, 0.25)',
    borderRadius: 20,
    width: 140,
    height: 140,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    alignSelf: 'center',
  },
  brandText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attributionText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});
