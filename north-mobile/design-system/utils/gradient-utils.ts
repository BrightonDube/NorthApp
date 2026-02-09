/**
 * Gradient Utility Functions
 * 
 * Utilities for generating subtle gradients with 5% luminosity difference
 * Supports linear (180deg) and radial gradients for light and dark modes
 * 
 * Requirements: 5.2, 5.3, 5.4
 */

import { hexToHsl, hexToRgb, getRelativeLuminance } from './color-utils';

export interface GradientConfig {
  baseColor: string;
  direction: 'linear' | 'radial';
  luminosityDifference?: number; // Default: 5%
}

export interface GradientResult {
  gradient: string;
  startColor: string;
  endColor: string;
  luminosityDifference: number;
}

/**
 * Adjust color luminosity by a percentage
 * @param hex - Base color in hex format
 * @param adjustment - Percentage to adjust (-100 to 100)
 * @returns Adjusted color in hex format
 */
export function adjustLuminosity(hex: string, adjustment: number): string {
  const hsl = hexToHsl(hex);
  
  // Adjust lightness by percentage
  let newLightness = hsl.l + adjustment;
  
  // Clamp between 0 and 100
  newLightness = Math.max(0, Math.min(100, newLightness));
  
  // Convert back to hex
  return hslToHex({ h: hsl.h, s: hsl.s, l: newLightness });
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a subtle gradient with specified luminosity difference
 * @param config - Gradient configuration
 * @returns Gradient CSS string and metadata
 */
export function generateGradient(config: GradientConfig): GradientResult {
  const { baseColor, direction, luminosityDifference = 5 } = config;
  
  // Validate luminosity difference is within bounds
  if (luminosityDifference < 0 || luminosityDifference > 5) {
    throw new Error('Luminosity difference must be between 0 and 5%');
  }
  
  // Get base color HSL
  const baseHsl = hexToHsl(baseColor);
  
  // Determine if we should go lighter or darker
  // For light colors (l > 50), go darker
  // For dark colors (l <= 50), go lighter
  const shouldGoLighter = baseHsl.l <= 50;
  const adjustment = shouldGoLighter ? luminosityDifference : -luminosityDifference;
  
  // Generate end color
  const endColor = adjustLuminosity(baseColor, adjustment);
  
  // Calculate actual luminosity difference
  const actualDifference = Math.abs(hexToHsl(endColor).l - baseHsl.l);
  
  // Generate gradient string
  let gradient: string;
  if (direction === 'linear') {
    gradient = `linear-gradient(180deg, ${baseColor} 0%, ${endColor} 100%)`;
  } else {
    gradient = `radial-gradient(circle, ${baseColor} 0%, ${endColor} 100%)`;
  }
  
  return {
    gradient,
    startColor: baseColor,
    endColor,
    luminosityDifference: actualDifference,
  };
}

/**
 * Generate light mode gradient variant
 * @param baseColor - Base color for light mode
 * @param direction - Gradient direction
 * @returns Gradient result
 */
export function generateLightGradient(
  baseColor: string,
  direction: 'linear' | 'radial' = 'linear'
): GradientResult {
  return generateGradient({
    baseColor,
    direction,
    luminosityDifference: 5,
  });
}

/**
 * Generate dark mode gradient variant
 * @param baseColor - Base color for dark mode
 * @param direction - Gradient direction
 * @returns Gradient result
 */
export function generateDarkGradient(
  baseColor: string,
  direction: 'linear' | 'radial' = 'linear'
): GradientResult {
  return generateGradient({
    baseColor,
    direction,
    luminosityDifference: 5,
  });
}

/**
 * Generate both light and dark mode gradient variants
 * @param lightBase - Base color for light mode
 * @param darkBase - Base color for dark mode
 * @param direction - Gradient direction
 * @returns Object with light and dark gradient results
 */
export function generateGradientPair(
  lightBase: string,
  darkBase: string,
  direction: 'linear' | 'radial' = 'linear'
): {
  light: GradientResult;
  dark: GradientResult;
} {
  return {
    light: generateLightGradient(lightBase, direction),
    dark: generateDarkGradient(darkBase, direction),
  };
}

/**
 * Validate that a gradient meets the 5% luminosity difference requirement
 * @param gradient - Gradient CSS string
 * @returns True if gradient is valid
 */
export function validateGradientSubtlety(gradient: string): boolean {
  // Extract colors from gradient string
  const colorRegex = /#[0-9A-Fa-f]{6}/g;
  const colors = gradient.match(colorRegex);
  
  if (!colors || colors.length < 2) {
    return false;
  }
  
  // Check luminosity difference between consecutive colors
  for (let i = 0; i < colors.length - 1; i++) {
    const hsl1 = hexToHsl(colors[i]);
    const hsl2 = hexToHsl(colors[i + 1]);
    const difference = Math.abs(hsl1.l - hsl2.l);
    
    if (difference > 5) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate that a gradient uses natural direction (180deg or radial)
 * @param gradient - Gradient CSS string
 * @returns True if gradient uses natural direction
 */
export function validateGradientDirection(gradient: string): boolean {
  return gradient.includes('180deg') || gradient.includes('radial');
}

/**
 * Validate that dark mode gradient is darker than light mode gradient
 * @param lightGradient - Light mode gradient CSS string
 * @param darkGradient - Dark mode gradient CSS string
 * @returns True if dark gradient is darker
 */
export function validateDarkGradientDarkness(
  lightGradient: string,
  darkGradient: string
): boolean {
  // Extract colors from both gradients
  const colorRegex = /#[0-9A-Fa-f]{6}/g;
  const lightColors = lightGradient.match(colorRegex);
  const darkColors = darkGradient.match(colorRegex);
  
  if (!lightColors || !darkColors || lightColors.length === 0 || darkColors.length === 0) {
    return false;
  }
  
  // Calculate average luminance for each gradient
  const lightAvgLuminance = lightColors.reduce((sum, color) => {
    const rgb = hexToRgb(color);
    return sum + getRelativeLuminance(rgb);
  }, 0) / lightColors.length;
  
  const darkAvgLuminance = darkColors.reduce((sum, color) => {
    const rgb = hexToRgb(color);
    return sum + getRelativeLuminance(rgb);
  }, 0) / darkColors.length;
  
  return darkAvgLuminance < lightAvgLuminance;
}

/**
 * Generate gradient tokens for design system
 * @returns Object with gradient tokens for light and dark modes
 */
export function generateGradientTokens(): {
  light: Record<string, string>;
  dark: Record<string, string>;
} {
  // Light mode gradients
  const calmLight = generateLightGradient('#FAFAF9', 'linear');
  const surfaceLight = generateLightGradient('#F5F5F4', 'linear');
  
  // Dark mode gradients
  const calmDark = generateDarkGradient('#0C0A09', 'linear');
  const surfaceDark = generateDarkGradient('#1C1917', 'linear');
  
  return {
    light: {
      'gradient-calm': calmLight.gradient,
      'gradient-surface': surfaceLight.gradient,
    },
    dark: {
      'gradient-calm-dark': calmDark.gradient,
      'gradient-surface-dark': surfaceDark.gradient,
    },
  };
}
