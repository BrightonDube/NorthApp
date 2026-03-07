/**
 * Color Constants
 * 
 * Centralized color definitions following the North Design System.
 * All colors support light and dark mode.
 * 
 * Usage:
 * ```tsx
 * import { Colors } from '@/constants/colors';
 * 
 * <View style={{ backgroundColor: Colors.light.background }} />
 * ```
 */

export const Colors = {
  light: {
    // Background colors
    background: '#FFFFFF',
    foreground: '#09090B',
    
    // Surface colors (cards, inputs, modals)
    surface: '#F4F4F5',
    surfaceHighlight: '#E4E4E7',
    
    // Brand colors
    brandPrimary: '#09090B',
    brandInverse: '#FFFFFF',
    
    // Text colors
    textPrimary: '#09090B',
    textSecondary: '#71717A',
    textTertiary: '#D4D4D8',
    
    // Border colors
    borderSubtle: '#E4E4E7',
    
    // Semantic colors
    error: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    info: '#0A84FF',
  },
  dark: {
    // Background colors
    background: '#050505',
    foreground: '#FAFAFA',
    
    // Surface colors (cards, inputs, modals)
    surface: '#18181B',
    surfaceHighlight: '#27272A',
    
    // Brand colors
    brandPrimary: '#FAFAFA',
    brandInverse: '#09090B',
    
    // Text colors
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#52525B',
    
    // Border colors
    borderSubtle: '#27272A',
    
    // Semantic colors
    error: '#FF453A',
    success: '#30D158',
    warning: '#FFD60A',
    info: '#0A84FF',
  },
};

/**
 * Category-specific colors for context items
 */
export const CategoryColors = {
  light: {
    values: {
      background: '#E9D5FF',
      text: '#09090B',
    },
    goals: {
      background: '#BFDBFE',
      text: '#09090B',
    },
    projects: {
      background: '#BBF7D0',
      text: '#09090B',
    },
    constraints: {
      background: '#FED7AA',
      text: '#09090B',
    },
  },
  dark: {
    values: {
      background: '#581C87',
      text: '#FAFAFA',
    },
    goals: {
      background: '#1E3A8A',
      text: '#FAFAFA',
    },
    projects: {
      background: '#14532D',
      text: '#FAFAFA',
    },
    constraints: {
      background: '#7C2D12',
      text: '#FAFAFA',
    },
  },
};

/**
 * Tier badge colors
 */
export const TierColors = {
  pro: {
    background: '#09090B',
    text: '#FFFFFF',
  },
  free: {
    light: {
      background: '#F4F4F5',
      border: '#E4E4E7',
      text: '#09090B',
    },
    dark: {
      background: '#18181B',
      border: '#27272A',
      text: '#FAFAFA',
    },
  },
};

export default Colors;
