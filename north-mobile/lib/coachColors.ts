/**
 * Coach Color Utilities
 * 
 * This file contains utility functions for managing coach theme colors,
 * ensuring accessibility through proper contrast ratios, and providing
 * fallback colors based on coach categories.
 * 
 * Validates: Requirements 2.1, 2.4, 2.5
 */

import { Coach, CoachCategory } from '../types';
import { getCategoryColor } from './marketplace.types';

/**
 * Get the theme color for a coach
 * Falls back to category color if coach doesn't have a custom color
 * 
 * Validates: Requirements 2.1, 2.4
 */
export function getCoachThemeColor(coach: Coach): string {
  return coach.themeColor || getCategoryColor(coach.category);
}

/**
 * Convert hex color to RGB
 * 
 * @param hex - Hex color string (e.g., "#3B82F6" or "3B82F6")
 * @returns RGB object with r, g, b values (0-255)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');
  
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate relative luminance of a color
 * Uses the WCAG formula for relative luminance
 * 
 * @param rgb - RGB color object
 * @returns Relative luminance value (0-1)
 */
function calculateLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two luminance values
 * Uses the WCAG formula for contrast ratio
 * 
 * @param l1 - First luminance value
 * @param l2 - Second luminance value
 * @returns Contrast ratio (1-21)
 */
function calculateContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color provides sufficient contrast for white text
 * Uses WCAG AA standard (4.5:1 for normal text)
 * 
 * Validates: Requirements 2.5
 * 
 * @param hexColor - Hex color string
 * @returns True if contrast ratio meets WCAG AA standard
 */
export function hasGoodContrast(hexColor: string): boolean {
  const rgb = hexToRgb(hexColor);
  const luminance = calculateLuminance(rgb);
  const whiteLuminance = 1.0; // White has luminance of 1.0
  const contrastRatio = calculateContrastRatio(luminance, whiteLuminance);
  
  return contrastRatio >= 4.5;
}

/**
 * Get a contrasting text color (white or black) for a background color
 * 
 * Validates: Requirements 2.5
 * 
 * @param hexColor - Background hex color string
 * @returns "#FFFFFF" for dark backgrounds, "#000000" for light backgrounds
 */
export function getContrastingTextColor(hexColor: string): string {
  return hasGoodContrast(hexColor) ? '#FFFFFF' : '#000000';
}
