/**
 * Spacing Constants
 * 
 * Centralized spacing definitions following the North Design System.
 * Based on 4px grid system.
 * 
 * Usage:
 * ```tsx
 * import { Spacing } from '@/constants/spacing';
 * 
 * <View style={{ padding: Spacing.md }} />
 * ```
 */

export const Spacing = {
  // Base spacing units (4px grid)
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  lg: 16,   // 16px
  xl: 20,   // 20px
  '2xl': 24,  // 24px
  '3xl': 28,  // 28px
  '4xl': 32,  // 32px
  '5xl': 40,  // 40px
  '6xl': 48,  // 48px
  '7xl': 64,  // 64px
};

/**
 * Screen-specific spacing
 */
export const ScreenSpacing = {
  // Horizontal padding for screens
  horizontal: 20,
  
  // Vertical padding for screens
  vertical: 16,
  
  // Section spacing
  section: 24,
  
  // Between items in a list
  listItem: 12,
};

/**
 * Component-specific spacing
 */
export const ComponentSpacing = {
  // Card padding
  card: 16,
  
  // Button padding
  buttonHorizontal: 24,
  buttonVertical: 14,
  
  // Input padding
  inputHorizontal: 16,
  inputVertical: 14,
  
  // Modal padding
  modal: 20,
};

/**
 * Border radius values
 */
export const BorderRadius = {
  // Small elements (badges, tags)
  sm: 8,
  
  // Medium elements (cards, inputs)
  md: 12,
  
  // Large elements (cards)
  lg: 16,
  
  // Extra large (modals, sheets)
  xl: 24,
  
  // Pills (buttons, nav)
  full: 9999,
};

export default Spacing;
