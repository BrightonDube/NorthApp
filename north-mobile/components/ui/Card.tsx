/**
 * Card Component
 * 
 * A base card component following the Calm Design System Refresh.
 * Provides a consistent surface for content with optional gradient background.
 * 
 * Features:
 * - New color tokens (warm, muted palette)
 * - New spacing (20-24px padding)
 * - New border radius (16px)
 * - New soft shadow
 * - Optional gradient background
 * - Respects reduced motion preferences
 * - Keyboard focus indicators for accessibility
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 4.3, 5.1, 8.1, 8.2, 8.4
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ViewStyle, PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Optional press handler - makes card interactive */
  onPress?: () => void;
  /** Optional long press handler */
  onLongPress?: () => void;
  /** Use gradient background instead of solid color */
  gradient?: boolean;
  /** Padding size - 'default' (20px) or 'large' (24px) */
  padding?: 'default' | 'large';
  /** Shadow size - 'none', 'sm', 'md' (default), 'lg' */
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional style overrides */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Accessibility hint */
  accessibilityHint?: string;
}

/**
 * Card Component
 * 
 * A versatile card component that follows the Calm Design System.
 * Can be used as a static container or an interactive element.
 * 
 * @example
 * ```tsx
 * // Static card
 * <Card>
 *   <Text>Card content</Text>
 * </Card>
 * 
 * // Interactive card with gradient
 * <Card 
 *   gradient 
 *   onPress={() => console.log('pressed')}
 *   padding="large"
 *   shadow="lg"
 * >
 *   <Text>Interactive card</Text>
 * </Card>
 * ```
 */
export function Card({
  children,
  onPress,
  onLongPress,
  gradient = false,
  padding = 'default',
  shadow = 'md',
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  // Focus indicator color (WCAG AA compliant)
  const focusColor = colors.primary;

  // Determine padding value
  const paddingValue = padding === 'large' ? 24 : 20;

  // Determine shadow style
  const shadowStyle = shadow !== 'none' ? styles[`shadow${shadow.charAt(0).toUpperCase() + shadow.slice(1)}${isDark ? 'Dark' : ''}`] : undefined;

  // Base card style
  const baseCardStyle = [
    styles.card,
    { padding: paddingValue, backgroundColor: colors.card },
    shadowStyle,
    style,
  ];

  // If card is interactive (has onPress), render as Pressable
  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={({ pressed, focused }) => [
          ...baseCardStyle,
          pressed && styles.pressed,
          focused && {
            borderWidth: 2,
            borderColor: focusColor,
          },
        ]}
      >
        {gradient ? (
          <LinearGradient
            colors={isDark ? [colors.background, colors.backgroundSecondary] : [colors.card, colors.backgroundTertiary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientContainer}
          >
            {children}
          </LinearGradient>
        ) : (
          children
        )}
      </Pressable>
    );
  }

  // Static card (no interaction)
  if (gradient) {
    return (
      <View style={baseCardStyle} testID={testID}>
        <LinearGradient
          colors={isDark ? [colors.background, colors.backgroundSecondary] : [colors.card, colors.backgroundTertiary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradientContainer}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={baseCardStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, // Calm Design System: lg border radius for cards
    overflow: 'hidden', // Ensure gradient respects border radius
  },
  pressed: {
    opacity: 0.8,
  },
  gradientContainer: {
    // Negative margin to counteract card padding for full gradient coverage
    margin: -20, // Will be adjusted by parent padding
    padding: 20, // Restore padding inside gradient
  },
  // Light mode shadows - Soft, subtle (max 0.07 opacity)
  shadowSm: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  // Dark mode shadows - Subtle glow (max 0.06 opacity)
  shadowSmDark: {
    shadowColor: '#FAFAF9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMdDark: {
    shadowColor: '#FAFAF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLgDark: {
    shadowColor: '#FAFAF9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 8,
  },
});

export default Card;
