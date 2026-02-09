/**
 * Validation Utilities Test Suite
 * 
 * Comprehensive tests for all validation functions
 */

import {
  validateColorSaturation,
  validateContrastRatio,
  validateColorWarmth,
  validateSpacingIncrease,
  validateMinimumSpacing,
  validateAnimationDuration,
  validateEasingCurve,
  validateStaggerDelay,
  validateBorderRadiusIncrease,
  validateMinimumBorderRadius,
  validateShadowSoftness,
  validateDarkModeShadowGlow,
  validateBorderSubtlety,
  validateTouchTargetSize,
  validateTouchTargetSpacing,
  validateGradientSubtlety,
  validateDarkModeGradientDarkness,
  validateAllTokens,
  formatValidationResults,
} from '../utils/validation-utils';

describe('Validation Utilities', () => {
  // ============================================================================
  // COLOR VALIDATION
  // ============================================================================

  describe('validateColorSaturation', () => {
    it('should pass when saturation difference is acceptable', () => {
      // Calm Design allows slight saturation increases for warmth
      // Test with colors that have similar saturation levels
      const result = validateColorSaturation(
        '#78716C', // New brandPrimary - 9% saturation
        '#71717A', // Old brandPrimary - 0% saturation
        'brandPrimary'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when saturation increases dramatically', () => {
      const result = validateColorSaturation(
        '#FF0000', // Highly saturated red - 100% saturation
        '#A8A29E', // Low saturation gray - 5% saturation
        'testColor'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Color Saturation Reduction');
    });
  });

  describe('validateContrastRatio', () => {
    it('should pass when contrast meets minimum ratio', () => {
      const result = validateContrastRatio(
        '#1C1917', // Dark text
        '#FAFAF9', // Light background
        4.5,
        'textPrimary'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when contrast is below minimum ratio', () => {
      const result = validateContrastRatio(
        '#A8A29E', // Light gray text
        '#FAFAF9', // Light background
        4.5,
        'textTertiary'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('WCAG AA Contrast');
    });
  });

  describe('validateColorWarmth', () => {
    it('should pass when color has warm undertones', () => {
      const result = validateColorWarmth('#FAFAF9', 'background');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when color lacks warm undertones', () => {
      const result = validateColorWarmth('#0000FF', 'coolBlue');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Color Warmth');
    });
  });

  // ============================================================================
  // SPACING VALIDATION
  // ============================================================================

  describe('validateSpacingIncrease', () => {
    it('should pass when spacing increased by minimum percentage', () => {
      const result = validateSpacingIncrease(
        16, // new value
        12, // old value
        0.25, // 25% increase
        'md'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when spacing increase is insufficient', () => {
      const result = validateSpacingIncrease(
        13, // new value
        12, // old value
        0.25, // 25% increase required
        'md'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Spacing Increase');
    });
  });

  describe('validateMinimumSpacing', () => {
    it('should pass when spacing meets minimum', () => {
      const result = validateMinimumSpacing(16, 16, 'buttonPadding');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when spacing is below minimum', () => {
      const result = validateMinimumSpacing(12, 16, 'buttonPadding');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Minimum Spacing');
    });
  });

  // ============================================================================
  // ANIMATION VALIDATION
  // ============================================================================

  describe('validateAnimationDuration', () => {
    it('should pass when duration is within bounds', () => {
      const result = validateAnimationDuration(400, 300, 600, 'slow', false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when duration is below minimum', () => {
      const result = validateAnimationDuration(200, 300, 600, 'tooFast', false);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Animation Duration Bounds');
    });

    it('should fail when duration exceeds maximum', () => {
      const result = validateAnimationDuration(700, 300, 600, 'tooSlow', false);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should validate special animations differently', () => {
      const result = validateAnimationDuration(2500, 300, 600, 'breathing', true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when special animation is out of range', () => {
      const result = validateAnimationDuration(1500, 300, 600, 'breathing', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Special Animation Duration');
    });
  });

  describe('validateEasingCurve', () => {
    it('should pass for valid cubic-bezier curve', () => {
      const result = validateEasingCurve(
        'cubic-bezier(0.4, 0.0, 0.2, 1)',
        'gentle'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for non-cubic-bezier format', () => {
      const result = validateEasingCurve('ease-in', 'invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Easing Curve Format');
    });

    it('should warn for curves with y-values outside 0-1 range', () => {
      const result = validateEasingCurve(
        'cubic-bezier(0.4, -0.5, 0.2, 1.5)',
        'extreme'
      );
      // The function should still be valid (no errors) but have warnings
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateStaggerDelay', () => {
    it('should pass when delay is within range', () => {
      const result = validateStaggerDelay(75, 50, 100, 'listStagger');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when delay is below minimum', () => {
      const result = validateStaggerDelay(30, 50, 100, 'tooFast');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Stagger Delay Range');
    });

    it('should fail when delay exceeds maximum', () => {
      const result = validateStaggerDelay(150, 50, 100, 'tooSlow');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  // ============================================================================
  // BORDER RADIUS VALIDATION
  // ============================================================================

  describe('validateBorderRadiusIncrease', () => {
    it('should pass when border radius increased', () => {
      const result = validateBorderRadiusIncrease(12, 8, 'md');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when border radius did not increase', () => {
      const result = validateBorderRadiusIncrease(8, 8, 'md');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Border Radius Increase');
    });
  });

  describe('validateMinimumBorderRadius', () => {
    it('should pass when border radius meets minimum', () => {
      const result = validateMinimumBorderRadius(12, 12, 'button');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when border radius is below minimum', () => {
      const result = validateMinimumBorderRadius(8, 12, 'button');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Minimum Border Radius');
    });
  });

  // ============================================================================
  // SHADOW VALIDATION
  // ============================================================================

  describe('validateShadowSoftness', () => {
    it('should pass when shadow is softer', () => {
      const result = validateShadowSoftness(
        0.04, // new opacity (lower)
        0.06, // old opacity (higher)
        8, // new blur (larger)
        4, // old blur (smaller)
        0.07,
        'sm'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when opacity did not decrease', () => {
      const result = validateShadowSoftness(
        0.06, // new opacity (same)
        0.06, // old opacity
        8, // new blur
        4, // old blur
        0.07,
        'sm'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when opacity exceeds maximum', () => {
      const result = validateShadowSoftness(
        0.08, // new opacity (too high)
        0.10, // old opacity
        8, // new blur
        4, // old blur
        0.07, // max opacity
        'sm'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'Maximum Shadow Opacity')).toBe(true);
    });

    it('should fail when blur did not increase', () => {
      const result = validateShadowSoftness(
        0.04, // new opacity
        0.06, // old opacity
        4, // new blur (same)
        4, // old blur
        0.07,
        'sm'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.rule === 'Shadow Blur Increase')).toBe(true);
    });
  });

  describe('validateDarkModeShadowGlow', () => {
    it('should pass when shadow uses light color', () => {
      const result = validateDarkModeShadowGlow('#FAFAF9', 'darkShadow');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when shadow uses dark color', () => {
      const result = validateDarkModeShadowGlow('#1C1917', 'darkShadow');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Dark Mode Shadow Glow');
    });
  });

  describe('validateBorderSubtlety', () => {
    it('should pass when border has low contrast', () => {
      const result = validateBorderSubtlety(
        '#E7E5E4', // border
        '#FAFAF9', // background
        1.3,
        'borderSubtle'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when border contrast is too high', () => {
      const result = validateBorderSubtlety(
        '#1C1917', // dark border
        '#FAFAF9', // light background
        1.3,
        'borderStrong'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Border Color Subtlety');
    });
  });

  // ============================================================================
  // TOUCH TARGET VALIDATION
  // ============================================================================

  describe('validateTouchTargetSize', () => {
    it('should pass when touch target meets minimum', () => {
      const result = validateTouchTargetSize(48, 48, 44, 'button');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when width is below minimum', () => {
      const result = validateTouchTargetSize(40, 48, 44, 'button');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Minimum Touch Target');
    });

    it('should fail when height is below minimum', () => {
      const result = validateTouchTargetSize(48, 40, 44, 'button');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('validateTouchTargetSpacing', () => {
    it('should pass when spacing meets minimum', () => {
      const result = validateTouchTargetSpacing(8, 8, 'buttonSpacing');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when spacing is below minimum', () => {
      const result = validateTouchTargetSpacing(4, 8, 'buttonSpacing');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Touch Target Spacing');
    });
  });

  // ============================================================================
  // GRADIENT VALIDATION
  // ============================================================================

  describe('validateGradientSubtlety', () => {
    it('should pass for subtle gradient', () => {
      const result = validateGradientSubtlety(
        'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
        5,
        'calmGradient'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for gradient with large luminosity difference', () => {
      const result = validateGradientSubtlety(
        'linear-gradient(180deg, #FFFFFF 0%, #000000 100%)',
        5,
        'harshGradient'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Gradient Subtlety');
    });

    it('should warn for non-natural gradient direction', () => {
      const result = validateGradientSubtlety(
        'linear-gradient(45deg, #FAFAF9 0%, #F5F5F4 100%)',
        5,
        'diagonalGradient'
      );
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateDarkModeGradientDarkness', () => {
    it('should pass when dark gradient is darker', () => {
      const result = validateDarkModeGradientDarkness(
        'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
        'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
        'calmGradient'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when dark gradient is not darker', () => {
      const result = validateDarkModeGradientDarkness(
        'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
        'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
        'invertedGradient'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('Dark Mode Gradient Darkness');
    });
  });

  // ============================================================================
  // COMPREHENSIVE VALIDATION
  // ============================================================================

  describe('validateAllTokens', () => {
    it('should validate all token types comprehensively', () => {
      const config = {
        colors: {
          old: { primary: '#71717A' },
          new: { primary: '#78716C' },
          textBackgroundPairs: [
            { text: '#1C1917', background: '#FAFAF9', minRatio: 4.5 },
          ],
          warmthRequired: ['primary'],
        },
        spacing: {
          old: { md: 12 },
          new: { md: 16 },
          minIncrease: 0.25,
        },
        animations: {
          durations: { normal: 300, breathing: 2500 },
          min: 300,
          max: 600,
          specialAnimations: ['breathing'],
        },
        borderRadius: {
          old: { md: 8 },
          new: { md: 12 },
        },
        touchTargets: {
          components: { button: { width: 48, height: 48 } },
          minimum: 44,
          spacing: 8,
        },
      };

      const result = validateAllTokens(config);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalErrors');
      expect(result).toHaveProperty('totalWarnings');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('failed');
      expect(result.summary).toHaveProperty('warnings');
    });

    it('should report validation failures correctly', () => {
      const config = {
        spacing: {
          old: { md: 12 },
          new: { md: 13 }, // Insufficient increase
          minIncrease: 0.25,
        },
      };

      const result = validateAllTokens(config);

      expect(result.isValid).toBe(false);
      expect(result.totalErrors).toBeGreaterThan(0);
      expect(result.summary.failed.length).toBeGreaterThan(0);
    });
  });

  describe('formatValidationResults', () => {
    it('should format validation results as readable text', () => {
      const result = {
        isValid: true,
        totalErrors: 0,
        totalWarnings: 1,
        results: {},
        summary: {
          passed: ['Color saturation: primary'],
          failed: [],
          warnings: ['Gradient direction: calm'],
        },
      };

      const formatted = formatValidationResults(result);

      expect(formatted).toContain('DESIGN TOKEN VALIDATION REPORT');
      expect(formatted).toContain('✓ PASSED');
      expect(formatted).toContain('Total Errors: 0');
      expect(formatted).toContain('Total Warnings: 1');
      expect(formatted).toContain('✓ Color saturation: primary');
      expect(formatted).toContain('⚠ Gradient direction: calm');
    });

    it('should format failed validation with detailed errors', () => {
      const result = {
        isValid: false,
        totalErrors: 1,
        totalWarnings: 0,
        results: {
          spacing: [
            {
              isValid: false,
              errors: [
                {
                  token: 'md',
                  rule: 'Spacing Increase',
                  message: 'Spacing increase insufficient',
                  currentValue: 13,
                  expectedValue: '>= 15',
                },
              ],
              warnings: [],
            },
          ],
        },
        summary: {
          passed: [],
          failed: ['Spacing increase: md'],
          warnings: [],
        },
      };

      const formatted = formatValidationResults(result);

      expect(formatted).toContain('✗ FAILED');
      expect(formatted).toContain('DETAILED ERRORS');
      expect(formatted).toContain('Token: md');
      expect(formatted).toContain('Rule: Spacing Increase');
      expect(formatted).toContain('Message: Spacing increase insufficient');
    });
  });
});
