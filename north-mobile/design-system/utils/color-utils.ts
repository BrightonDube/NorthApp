/**
 * Color Utility Functions
 * 
 * Utilities for color manipulation, conversion, and validation
 * Used for property-based testing and design token validation
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb);
}

/**
 * Calculate relative luminance (WCAG formula)
 */
export function getRelativeLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color has warm undertones (red/yellow >= blue)
 */
export function hasWarmUndertones(hex: string): boolean {
  const rgb = hexToRgb(hex);
  return (rgb.r + rgb.g) / 2 >= rgb.b;
}

/**
 * Check if a color is darker than another (by luminance)
 */
export function isDarker(color1: string, color2: string): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);
  
  return lum1 < lum2;
}

/**
 * Get average luminance of a color
 */
export function getAverageLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  return getRelativeLuminance(rgb);
}

/**
 * Calculate luminosity difference between two colors (percentage)
 */
export function getLuminosityDifference(color1: string, color2: string): number {
  const hsl1 = hexToHsl(color1);
  const hsl2 = hexToHsl(color2);
  
  return Math.abs(hsl1.l - hsl2.l);
}

/**
 * Parse gradient string and extract color stops
 */
export function parseGradient(gradient: string): string[] {
  const colorRegex = /#[0-9A-Fa-f]{6}/g;
  const matches = gradient.match(colorRegex);
  return matches || [];
}

/**
 * Check if gradient is subtle (max 5% luminosity difference)
 */
export function isGradientSubtle(gradient: string, maxDifference: number = 5): boolean {
  const colors = parseGradient(gradient);
  if (colors.length < 2) return true;
  
  for (let i = 0; i < colors.length - 1; i++) {
    const diff = getLuminosityDifference(colors[i], colors[i + 1]);
    if (diff > maxDifference) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if gradient direction is natural (180deg or radial)
 */
export function hasNaturalGradientDirection(gradient: string): boolean {
  return gradient.includes('180deg') || gradient.includes('radial');
}
