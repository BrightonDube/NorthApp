/**
 * Design Token Fixtures
 * 
 * This file contains both old (current) and new (calm design refresh) token values
 * for use in property-based testing and validation.
 */

export interface ColorToken {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

export interface SpacingToken {
  value: number;
  unit: 'px';
}

export interface BorderRadiusToken {
  value: number;
  unit: 'px';
}

export interface AnimationToken {
  duration: number;
  unit: 'ms';
}

export interface ShadowToken {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

// ============================================================================
// OLD DESIGN TOKENS (Current System)
// ============================================================================

export const oldColorTokens = {
  light: {
    background: '#FFFFFF',
    foreground: '#09090B',
    surface: '#F4F4F5',
    surfaceHighlight: '#E4E4E7',
    brandPrimary: '#09090B',
    brandInverse: '#FFFFFF',
    textPrimary: '#09090B',
    textSecondary: '#71717A',
    textTertiary: '#D4D4D8',
    borderSubtle: '#E4E4E7',
    focusRing: '#2563EB',
    focusRingOffset: '#FFFFFF',
  },
  dark: {
    background: '#050505',
    foreground: '#FAFAFA',
    surface: '#18181B',
    surfaceHighlight: '#27272A',
    brandPrimary: '#FAFAFA',
    brandInverse: '#09090B',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textTertiary: '#52525B',
    borderSubtle: '#27272A',
    focusRing: '#60A5FA',
    focusRingOffset: '#050505',
  },
};

export const oldSpacingTokens = {
  xs: 2,
  sm: 4,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const oldBorderRadiusTokens = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,
};

export const oldAnimationTokens = {
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
};

export const oldShadowTokens = {
  light: {
    xs: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#09090B', opacity: 0.05 },
    sm: { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#09090B', opacity: 0.06 },
    md: { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#09090B', opacity: 0.08 },
    lg: { offsetX: 0, offsetY: 8, blur: 16, spread: 0, color: '#09090B', opacity: 0.10 },
    xl: { offsetX: 0, offsetY: 12, blur: 24, spread: 0, color: '#09090B', opacity: 0.12 },
  },
  dark: {
    xs: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.20 },
    sm: { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#000000', opacity: 0.25 },
    md: { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#000000', opacity: 0.30 },
    lg: { offsetX: 0, offsetY: 8, blur: 16, spread: 0, color: '#000000', opacity: 0.35 },
    xl: { offsetX: 0, offsetY: 12, blur: 24, spread: 0, color: '#000000', opacity: 0.40 },
  },
};

// ============================================================================
// NEW DESIGN TOKENS (Calm Design Refresh)
// ============================================================================

export const newColorTokens = {
  light: {
    background: '#FAFAF9',
    foreground: '#1C1917',
    surface: '#F5F5F4',
    surfaceHighlight: '#E7E5E4',
    brandPrimary: '#292524',
    brandAccent: '#78716C',
    textPrimary: '#1C1917',
    textSecondary: '#78716C',
    textTertiary: '#A8A29E',
    borderSubtle: '#E7E5E4',
    shadowColor: '#1C1917',
    // Nature-inspired accents
    accentSky: '#BAE6FD',
    accentEarth: '#D6D3D1',
    accentSage: '#D9F0E3',
    accentLavender: '#E9D5FF',
    // Gradients
    gradientCalm: 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
    gradientSurface: 'linear-gradient(180deg, #F5F5F4 0%, #E7E5E4 100%)',
  },
  dark: {
    background: '#0C0A09',
    foreground: '#FAFAF9',
    surface: '#1C1917',
    surfaceHighlight: '#292524',
    brandPrimary: '#FAFAF9',
    brandAccent: '#A8A29E',
    textPrimary: '#FAFAF9',
    textSecondary: '#A8A29E',
    textTertiary: '#57534E',
    borderSubtle: '#252220',
    shadowColor: '#FAFAF9',
    // Nature-inspired accents (muted for dark mode)
    accentSky: '#0C4A6E',
    accentEarth: '#44403C',
    accentSage: '#14532D',
    accentLavender: '#581C87',
    // Gradients
    gradientCalm: 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
    gradientSurface: 'linear-gradient(180deg, #1C1917 0%, #292524 100%)',
  },
};

export const newSpacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

export const newBorderRadiusTokens = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  full: 9999,
};

export const newAnimationTokens = {
  fast: 200,
  normal: 300,
  slow: 400,
  slower: 600,
  breathing: 2500,
};

export const newShadowTokens = {
  light: {
    xs: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#1C1917', opacity: 0.03 },
    sm: { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#1C1917', opacity: 0.04 },
    md: { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#1C1917', opacity: 0.05 },
    lg: { offsetX: 0, offsetY: 8, blur: 16, spread: 0, color: '#1C1917', opacity: 0.06 },
    xl: { offsetX: 0, offsetY: 12, blur: 24, spread: 0, color: '#1C1917', opacity: 0.07 },
  },
  dark: {
    xs: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#FAFAF9', opacity: 0.02 },
    sm: { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#FAFAF9', opacity: 0.03 },
    md: { offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#FAFAF9', opacity: 0.04 },
    lg: { offsetX: 0, offsetY: 8, blur: 16, spread: 0, color: '#FAFAF9', opacity: 0.05 },
    xl: { offsetX: 0, offsetY: 12, blur: 24, spread: 0, color: '#FAFAF9', opacity: 0.06 },
  },
};

// ============================================================================
// COMPONENT CONFIGURATION TOKENS
// ============================================================================

export const oldComponentTokens = {
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    padding: {
      horizontal: 16,
      vertical: 12,
    },
    borderRadius: 8,
    minTouchTarget: 44,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    shadow: 'sm',
  },
  input: {
    height: 44,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modal: {
    borderRadius: 20,
    padding: 20,
    maxWidth: 400,
    shadow: 'lg',
  },
  listItem: {
    height: {
      standard: 48,
      large: 64,
    },
    padding: 12,
    spacing: 8,
  },
};

export const newComponentTokens = {
  button: {
    height: {
      sm: 44, // Increased from 40 to meet minimum touch target
      md: 48,
      lg: 56,
    },
    padding: {
      horizontal: 24,
      vertical: 16,
    },
    borderRadius: 12,
    minTouchTarget: 44,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    shadow: 'sm',
  },
  input: {
    height: 48,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    maxWidth: 400,
    shadow: 'md',
  },
  listItem: {
    height: {
      standard: 56,
      large: 72,
    },
    padding: 16,
    spacing: 8,
  },
};

// ============================================================================
// TOUCH TARGET TOKENS
// ============================================================================

export const touchTargetTokens = {
  standard: 44,
  comfortable: 48,
  generous: 56,
};

// ============================================================================
// EASING CURVE TOKENS
// ============================================================================

export const oldEasingTokens = {
  default: 'ease',
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
};

export const newEasingTokens = {
  gentle: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  calm: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  breathing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
};
