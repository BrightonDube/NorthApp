/**
 * Property-Based Tests for Coach Color Utilities
 * 
 * Tests correctness properties for contrast ratio calculations
 * to ensure accessibility standards are met.
 * 
 * Property tested:
 * - Property 5: Contrast ratio meets accessibility standards
 * 
 * Validates: Requirements 2.5
 */

import fc from 'fast-check';
import { hasGoodContrast } from '../../lib/coachColors';

/**
 * Arbitrary for generating valid hex color strings
 * Generates colors in format #RRGGBB where each component is 00-FF
 */
const hexColorArb = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([r, g, b]) => {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
});

/**
 * Calculate relative luminance using WCAG formula
 * This is a reference implementation to verify the library function
 */
function calculateReferenceLuminance(hexColor: string): number {
  const hex = hexColor.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const [rNorm, gNorm, bNorm] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
}

/**
 * Calculate contrast ratio using WCAG formula
 */
function calculateReferenceContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Coach Color Property-Based Tests', () => {
  /**
   * Property 5: Contrast ratio meets accessibility standards
   * 
   * For any color, if hasGoodContrast returns true, the contrast ratio
   * with white text must meet or exceed WCAG AA standards (4.5:1).
   * 
   * **Validates: Requirements 2.5**
   * 
   * This property ensures:
   * 1. Colors marked as having good contrast actually meet WCAG AA standards
   * 2. The contrast calculation is mathematically correct
   * 3. No color passes the check incorrectly
   */
  describe('Property 5: Contrast ratio meets accessibility standards', () => {
    it('should meet WCAG AA standards (4.5:1) for any color marked as having good contrast', () => {
      fc.assert(
        fc.property(
          hexColorArb,
          (color) => {
            const hasContrast = hasGoodContrast(color);
            
            // Calculate the actual contrast ratio
            const luminance = calculateReferenceLuminance(color);
            const whiteLuminance = 1.0;
            const contrastRatio = calculateReferenceContrastRatio(luminance, whiteLuminance);
            
            // If hasGoodContrast returns true, contrast ratio must be >= 4.5
            if (hasContrast) {
              expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
            } else {
              // If hasGoodContrast returns false, contrast ratio must be < 4.5
              expect(contrastRatio).toBeLessThan(4.5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly classify dark colors as having good contrast', () => {
      // Generate colors with low luminance (dark colors)
      const darkColorArb = fc.tuple(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 })
      ).map(([r, g, b]) => {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      });

      fc.assert(
        fc.property(
          darkColorArb,
          (color) => {
            const hasContrast = hasGoodContrast(color);
            const luminance = calculateReferenceLuminance(color);
            const contrastRatio = calculateReferenceContrastRatio(luminance, 1.0);
            
            // Dark colors should generally have good contrast with white
            // Verify the function's result matches the actual contrast ratio
            if (contrastRatio >= 4.5) {
              expect(hasContrast).toBe(true);
            } else {
              expect(hasContrast).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly classify light colors as not having good contrast', () => {
      // Generate colors with high luminance (light colors)
      const lightColorArb = fc.tuple(
        fc.integer({ min: 155, max: 255 }),
        fc.integer({ min: 155, max: 255 }),
        fc.integer({ min: 155, max: 255 })
      ).map(([r, g, b]) => {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      });

      fc.assert(
        fc.property(
          lightColorArb,
          (color) => {
            const hasContrast = hasGoodContrast(color);
            const luminance = calculateReferenceLuminance(color);
            const contrastRatio = calculateReferenceContrastRatio(luminance, 1.0);
            
            // Light colors should generally not have good contrast with white
            // Verify the function's result matches the actual contrast ratio
            if (contrastRatio >= 4.5) {
              expect(hasContrast).toBe(true);
            } else {
              expect(hasContrast).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: pure black and pure white', () => {
      // Pure black should have maximum contrast with white
      const blackContrast = hasGoodContrast('#000000');
      expect(blackContrast).toBe(true);
      
      const blackLuminance = calculateReferenceLuminance('#000000');
      const blackContrastRatio = calculateReferenceContrastRatio(blackLuminance, 1.0);
      expect(blackContrastRatio).toBeCloseTo(21, 1); // Maximum contrast ratio
      
      // Pure white should have minimum contrast with white (1:1)
      const whiteContrast = hasGoodContrast('#FFFFFF');
      expect(whiteContrast).toBe(false);
      
      const whiteLuminance = calculateReferenceLuminance('#FFFFFF');
      const whiteContrastRatio = calculateReferenceContrastRatio(whiteLuminance, 1.0);
      expect(whiteContrastRatio).toBeCloseTo(1, 1); // Minimum contrast ratio
    });

    it('should be consistent for the same color', () => {
      fc.assert(
        fc.property(
          hexColorArb,
          (color) => {
            // Calling hasGoodContrast multiple times with the same color
            // should always return the same result
            const result1 = hasGoodContrast(color);
            const result2 = hasGoodContrast(color);
            const result3 = hasGoodContrast(color);
            
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle colors with and without # prefix', () => {
      fc.assert(
        fc.property(
          hexColorArb,
          (colorWithHash) => {
            const colorWithoutHash = colorWithHash.substring(1);
            
            // Both formats should work and return the same result
            const resultWithHash = hasGoodContrast(colorWithHash);
            const resultWithoutHash = hasGoodContrast(colorWithoutHash);
            
            expect(resultWithHash).toBe(resultWithoutHash);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
