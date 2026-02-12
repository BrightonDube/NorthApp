/**
 * Centralized Theme System
 * 
 * Provides consistent colors across all screens based on system theme.
 * Uses React Native's useColorScheme() to detect light/dark mode.
 * 
 * Design principles:
 * - Light mode: Dark text on light backgrounds
 * - Dark mode: Light text on dark backgrounds
 * - Proper contrast ratios for accessibility
 * - Consistent color palette across the app
 */

export const colors = {
  light: {
    // Backgrounds
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F4F4F5',
    
    // Text
    text: '#09090B',           // Primary text (very dark, almost black)
    textSecondary: '#52525B',  // Secondary text (medium gray)
    textTertiary: '#71717A',   // Tertiary text (lighter gray)
    textMuted: '#A1A1AA',      // Muted text (very light gray)
    
    // Borders
    border: '#E5E7EB',
    borderSecondary: '#F4F4F5',
    
    // Interactive
    primary: '#2563EB',        // Blue
    primaryHover: '#1D4ED8',
    primaryText: '#FFFFFF',
    
    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.1)',
    
    // Card/Surface
    card: '#FFFFFF',
    cardHover: '#F9FAFB',
    
    // Input
    input: '#F4F4F5',
    inputBorder: '#E5E7EB',
    inputText: '#09090B',
    inputPlaceholder: '#A1A1AA',
  },
  dark: {
    // Backgrounds
    background: '#09090B',
    backgroundSecondary: '#18181B',
    backgroundTertiary: '#27272A',
    
    // Text
    text: '#FAFAFA',           // Primary text (very light, almost white)
    textSecondary: '#D4D4D8',  // Secondary text (light gray)
    textTertiary: '#A1A1AA',   // Tertiary text (medium gray)
    textMuted: '#71717A',      // Muted text (darker gray)
    
    // Borders
    border: '#27272A',
    borderSecondary: '#3F3F46',
    
    // Interactive
    primary: '#3B82F6',        // Lighter blue for dark mode
    primaryHover: '#60A5FA',
    primaryText: '#FFFFFF',
    
    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#60A5FA',
    
    // Overlays
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(255, 255, 255, 0.1)',
    
    // Card/Surface
    card: '#18181B',
    cardHover: '#27272A',
    
    // Input
    input: '#18181B',
    inputBorder: '#27272A',
    inputText: '#FAFAFA',
    inputPlaceholder: '#71717A',
  },
};

/**
 * Get theme colors based on color scheme
 */
export function getThemeColors(colorScheme: 'light' | 'dark' | null | undefined) {
  return colorScheme === 'dark' ? colors.dark : colors.light;
}

/**
 * Hook to get current theme colors
 * Use this in components instead of manually checking colorScheme
 */
import { useColorScheme } from 'react-native';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = getThemeColors(colorScheme);
  
  return {
    colors: theme,
    isDark,
    colorScheme,
  };
}

/**
 * Common spacing values
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Common border radius values
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

/**
 * Common font sizes
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

/**
 * Common font weights
 */
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
