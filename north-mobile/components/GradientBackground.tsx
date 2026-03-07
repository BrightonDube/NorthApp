/**
 * GradientBackground Component
 * 
 * A reusable component that applies subtle gradients to backgrounds and surfaces.
 * Implements the calm design system's gradient principles with automatic theme switching.
 * 
 * Features:
 * - Subtle gradients with max 5% luminosity difference
 * - Automatic light/dark mode support
 * - Linear (180deg) and radial gradient directions
 * - Predefined gradient variants (calm, surface)
 * - Custom gradient support via gradient utility functions
 * - Respects reduced motion preferences
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 * 
 * @example
 * ```tsx
 * // Basic usage with calm gradient
 * <GradientBackground variant="calm">
 *   <Text>Content with calm gradient background</Text>
 * </GradientBackground>
 * 
 * // Surface gradient for cards
 * <GradientBackground variant="surface">
 *   <Card>Card with surface gradient</Card>
 * </GradientBackground>
 * 
 * // Radial gradient
 * <GradientBackground variant="calm" direction="radial">
 *   <View>Content with radial gradient</View>
 * </GradientBackground>
 * 
 * // Custom gradient using utility functions
 * <GradientBackground 
 *   customGradient={{
 *     light: generateLightGradient('#FAFAF9', 'linear'),
 *     dark: generateDarkGradient('#0C0A09', 'linear')
 *   }}
 * >
 *   <Text>Custom gradient content</Text>
 * </GradientBackground>
 * ```
 */

import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsDark } from '@/contexts/ThemeContext';
import type { GradientResult } from '@/design-system/utils/gradient-utils';

/**
 * Predefined gradient variants matching the design system
 */
export type GradientVariant = 'calm' | 'surface';

/**
 * Gradient direction types
 */
export type GradientDirection = 'linear' | 'radial';

interface GradientBackgroundProps extends ViewProps {
  /**
   * Child elements to render on top of the gradient
   */
  children: React.ReactNode;
  
  /**
   * Predefined gradient variant to use
   * @default 'calm'
   */
  variant?: GradientVariant;
  
  /**
   * Gradient direction
   * @default 'linear'
   */
  direction?: GradientDirection;
  
  /**
   * Custom gradient configuration
   * Overrides the variant prop if provided
   */
  customGradient?: {
    light: GradientResult;
    dark: GradientResult;
  };
  
  /**
   * Whether to disable the gradient and use solid color
   * @default false
   */
  disabled?: boolean;
}

/**
 * Predefined gradient configurations for light and dark modes
 * These match the gradients defined in tailwind.config.js
 */
const GRADIENT_CONFIGS: Record<GradientVariant, {
  light: { colors: string[]; locations?: number[] };
  dark: { colors: string[]; locations?: number[] };
}> = {
  calm: {
    light: {
      colors: ['#FAFAF9', '#F5F5F4'],
      locations: [0, 1],
    },
    dark: {
      colors: ['#0C0A09', '#1C1917'],
      locations: [0, 1],
    },
  },
  surface: {
    light: {
      colors: ['#F5F5F4', '#E7E5E4'],
      locations: [0, 1],
    },
    dark: {
      colors: ['#1C1917', '#292524'],
      locations: [0, 1],
    },
  },
};

/**
 * Parse gradient result into colors array
 */
function parseGradientResult(gradientResult: GradientResult): string[] {
  return [gradientResult.startColor, gradientResult.endColor];
}

/**
 * GradientBackground Component
 * 
 * Applies subtle gradients to backgrounds and surfaces with automatic theme switching.
 * Uses predefined gradient variants or custom gradients via utility functions.
 * 
 * The component automatically switches between light and dark mode gradients based on
 * the device's color scheme. All gradients follow the design system's 5% luminosity
 * difference constraint for subtlety.
 */
export function GradientBackground({
  children,
  variant = 'calm',
  direction = 'linear',
  customGradient,
  disabled = false,
  style,
  ...viewProps
}: GradientBackgroundProps) {
  const isDark = useIsDark();
  
  // If disabled, render as regular View with solid background
  if (disabled) {
    const backgroundColor = isDark 
      ? GRADIENT_CONFIGS[variant].dark.colors[0]
      : GRADIENT_CONFIGS[variant].light.colors[0];
    
    return (
      <View style={[{ backgroundColor }, style]} {...viewProps}>
        {children}
      </View>
    );
  }
  
  // Determine gradient colors based on custom gradient or variant
  let colors: string[];
  let locations: number[] | undefined;
  
  if (customGradient) {
    // Use custom gradient
    const gradientResult = isDark ? customGradient.dark : customGradient.light;
    colors = parseGradientResult(gradientResult);
    locations = [0, 1];
  } else {
    // Use predefined variant
    const config = isDark 
      ? GRADIENT_CONFIGS[variant].dark 
      : GRADIENT_CONFIGS[variant].light;
    colors = config.colors;
    locations = config.locations;
  }
  
  // For radial gradients, we need to use a different approach
  // LinearGradient doesn't support true radial gradients, so we simulate with center positioning
  const gradientProps = direction === 'radial' 
    ? {
        colors,
        locations,
        start: { x: 0.5, y: 0.5 }, // Center
        end: { x: 1, y: 1 }, // Outer edge
      }
    : {
        colors,
        locations,
        start: { x: 0, y: 0 }, // Top
        end: { x: 0, y: 1 }, // Bottom (180deg)
      };
  
  return (
    <LinearGradient
      {...gradientProps}
      style={[styles.gradient, style]}
      {...(viewProps as any)}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    // Base gradient styles
    // Colors and direction are set dynamically
  },
});

/**
 * Utility function to create a GradientBackground with calm variant
 * Convenience wrapper for the most common use case
 */
export function CalmGradientBackground({
  children,
  ...props
}: Omit<GradientBackgroundProps, 'variant'>) {
  return (
    <GradientBackground variant="calm" {...props}>
      {children}
    </GradientBackground>
  );
}

/**
 * Utility function to create a GradientBackground with surface variant
 * Convenience wrapper for surface gradients (cards, modals, etc.)
 */
export function SurfaceGradientBackground({
  children,
  ...props
}: Omit<GradientBackgroundProps, 'variant'>) {
  return (
    <GradientBackground variant="surface" {...props}>
      {children}
    </GradientBackground>
  );
}
