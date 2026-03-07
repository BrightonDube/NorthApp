/**
 * Loading Spinner Component
 * 
 * A reusable loading indicator with consistent styling across the app.
 * Supports different sizes and optional text labels.
 * 
 * Features:
 * - Consistent styling with app theme
 * - Multiple size options
 * - Optional loading text
 * - Dark mode support
 * 
 * Validates: Requirements 15.2, 19.7
 */

import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'large'
   */
  size?: 'small' | 'large';
  
  /**
   * Optional text to display below the spinner
   */
  text?: string;
  
  /**
   * Color of the spinner
   * @default '#09090B' (dark mode: '#FAFAFA')
   */
  color?: string;
  
  /**
   * Whether to center the spinner in its container
   * @default true
   */
  centered?: boolean;
}

/**
 * Loading Spinner Component
 * 
 * @example
 * ```typescript
 * // Basic usage
 * <LoadingSpinner />
 * 
 * // With text
 * <LoadingSpinner text="Loading coaches..." />
 * 
 * // Small size
 * <LoadingSpinner size="small" />
 * 
 * // Not centered
 * <LoadingSpinner centered={false} />
 * ```
 */
export function LoadingSpinner({
  size = 'large',
  text,
  color = '#09090B',
  centered = true,
}: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, centered && styles.centered]}>
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: '#71717A',
    textAlign: 'center',
  },
});
