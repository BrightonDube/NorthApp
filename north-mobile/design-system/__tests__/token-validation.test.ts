/**
 * Design Token Validation Test
 * 
 * This test validates all design tokens against the calm design system requirements.
 * It can be run as part of the test suite or standalone for build-time validation.
 * 
 * Usage:
 *   npm run validate:tokens
 *   npm run validate:tokens:strict
 */

import {
  validateAllTokens,
  formatValidationResults,
  type TokenValidationConfig,
} from '../utils/validation-utils';
import {
  oldColorTokens,
  newColorTokens,
  oldSpacingTokens,
  newSpacingTokens,
  oldBorderRadiusTokens,
  newBorderRadiusTokens,
  oldAnimationTokens,
  newAnimationTokens,
  oldShadowTokens,
  newShadowTokens,
  newComponentTokens,
  newEasingTokens,
  touchTargetTokens,
} from '../fixtures/design-tokens.fixture';

describe('Design Token Validation', () => {
  const validationConfig: TokenValidationConfig = {
    // Color validation
    colors: {
      old: {
        // Light mode colors
        'light.background': oldColorTokens.light.background,
        'light.foreground': oldColorTokens.light.foreground,
        'light.surface': oldColorTokens.light.surface,
        'light.surfaceHighlight': oldColorTokens.light.surfaceHighlight,
        'light.brandPrimary': oldColorTokens.light.brandPrimary,
        'light.textPrimary': oldColorTokens.light.textPrimary,
        'light.textSecondary': oldColorTokens.light.textSecondary,
        'light.textTertiary': oldColorTokens.light.textTertiary,
        'light.borderSubtle': oldColorTokens.light.borderSubtle,
        // Dark mode colors
        'dark.background': oldColorTokens.dark.background,
        'dark.foreground': oldColorTokens.dark.foreground,
        'dark.surface': oldColorTokens.dark.surface,
        'dark.surfaceHighlight': oldColorTokens.dark.surfaceHighlight,
        'dark.brandPrimary': oldColorTokens.dark.brandPrimary,
        'dark.textPrimary': oldColorTokens.dark.textPrimary,
        'dark.textSecondary': oldColorTokens.dark.textSecondary,
        'dark.textTertiary': oldColorTokens.dark.textTertiary,
        'dark.borderSubtle': oldColorTokens.dark.borderSubtle,
      },
      new: {
        // Light mode colors
        'light.background': newColorTokens.light.background,
        'light.foreground': newColorTokens.light.foreground,
        'light.surface': newColorTokens.light.surface,
        'light.surfaceHighlight': newColorTokens.light.surfaceHighlight,
        'light.brandPrimary': newColorTokens.light.brandPrimary,
        'light.textPrimary': newColorTokens.light.textPrimary,
        'light.textSecondary': newColorTokens.light.textSecondary,
        'light.textTertiary': newColorTokens.light.textTertiary,
        'light.borderSubtle': newColorTokens.light.borderSubtle,
        // Dark mode colors
        'dark.background': newColorTokens.dark.background,
        'dark.foreground': newColorTokens.dark.foreground,
        'dark.surface': newColorTokens.dark.surface,
        'dark.surfaceHighlight': newColorTokens.dark.surfaceHighlight,
        'dark.brandPrimary': newColorTokens.dark.brandPrimary,
        'dark.textPrimary': newColorTokens.dark.textPrimary,
        'dark.textSecondary': newColorTokens.dark.textSecondary,
        'dark.textTertiary': newColorTokens.dark.textTertiary,
        'dark.borderSubtle': newColorTokens.dark.borderSubtle,
      },
      // WCAG AA contrast requirements
      textBackgroundPairs: [
        // Light mode
        {
          text: newColorTokens.light.textPrimary,
          background: newColorTokens.light.background,
          minRatio: 4.5, // WCAG AA for normal text
        },
        {
          text: newColorTokens.light.textSecondary,
          background: newColorTokens.light.background,
          minRatio: 3.0, // WCAG AA for large text
        },
        {
          text: newColorTokens.light.textPrimary,
          background: newColorTokens.light.surface,
          minRatio: 4.5,
        },
        // Dark mode
        {
          text: newColorTokens.dark.textPrimary,
          background: newColorTokens.dark.background,
          minRatio: 4.5,
        },
        {
          text: newColorTokens.dark.textSecondary,
          background: newColorTokens.dark.background,
          minRatio: 3.0,
        },
        {
          text: newColorTokens.dark.textPrimary,
          background: newColorTokens.dark.surface,
          minRatio: 4.5,
        },
      ],
      // Colors that should have warm undertones
      warmthRequired: [
        'light.background',
        'light.foreground',
        'light.brandPrimary',
        'dark.background',
        'dark.foreground',
      ],
    },

    // Spacing validation
    spacing: {
      old: oldSpacingTokens,
      new: newSpacingTokens,
      minIncrease: 0.25, // 25% increase minimum
    },

    // Component spacing validation
    componentSpacing: {
      components: {
        'button.padding.vertical': { padding: newComponentTokens.button.padding.vertical },
        'button.padding.horizontal': { padding: newComponentTokens.button.padding.horizontal },
        'card.padding': { padding: newComponentTokens.card.padding },
        'input.padding': { padding: newComponentTokens.input.padding },
        'modal.padding': { padding: newComponentTokens.modal.padding },
        'listItem.padding': { padding: newComponentTokens.listItem.padding },
        'listItem.spacing': { margin: newComponentTokens.listItem.spacing },
      },
      minPadding: 16, // Minimum 16px padding for interactive elements
      minMargin: 8, // Minimum 8px margin between elements
    },

    // Animation validation
    animations: {
      durations: newAnimationTokens,
      min: 200, // Minimum 200ms (fast micro-interactions)
      max: 600, // Maximum 600ms (standard transitions)
      specialAnimations: ['breathing'], // Exceptions that can exceed max
    },

    // Easing curve validation
    easingCurves: newEasingTokens,

    // Stagger delay validation
    staggerDelays: {
      delays: {
        listItem: 50,
        card: 75,
        modal: 100,
      },
      min: 50,
      max: 100,
    },

    // Border radius validation
    borderRadius: {
      old: oldBorderRadiusTokens,
      new: {
        ...newBorderRadiusTokens,
        // Add component-specific tokens for validation
        'button': newComponentTokens.button.borderRadius,
        'card': newComponentTokens.card.borderRadius,
        'modal': newComponentTokens.modal.borderRadius,
      },
      componentMinimums: {
        'button': 12, // Minimum for buttons
        'card': 16, // Minimum for cards
        'modal': 24, // Minimum for modals
      },
    },

    // Shadow validation (light mode)
    shadows: {
      old: {
        xs: oldShadowTokens.light.xs,
        sm: oldShadowTokens.light.sm,
        md: oldShadowTokens.light.md,
        lg: oldShadowTokens.light.lg,
        xl: oldShadowTokens.light.xl,
      },
      new: {
        xs: newShadowTokens.light.xs,
        sm: newShadowTokens.light.sm,
        md: newShadowTokens.light.md,
        lg: newShadowTokens.light.lg,
        xl: newShadowTokens.light.xl,
      },
      maxOpacity: 0.07, // Maximum 7% opacity for light mode
      mode: 'light',
    },

    // Border subtlety validation
    borders: {
      colors: {
        'light.borderSubtle': newColorTokens.light.borderSubtle,
        'dark.borderSubtle': newColorTokens.dark.borderSubtle,
      },
      backgrounds: {
        'light.borderSubtle': newColorTokens.light.background,
        'dark.borderSubtle': newColorTokens.dark.background,
      },
      maxContrast: 1.3, // Maximum 1.3:1 contrast for subtle borders
    },

    // Touch target validation
    touchTargets: {
      components: {
        'button.sm': { width: newComponentTokens.button.height.sm, height: newComponentTokens.button.height.sm },
        'button.md': { width: newComponentTokens.button.height.md, height: newComponentTokens.button.height.md },
        'button.lg': { width: newComponentTokens.button.height.lg, height: newComponentTokens.button.height.lg },
        'input': { width: newComponentTokens.input.height, height: newComponentTokens.input.height },
        'listItem.standard': { width: touchTargetTokens.standard, height: newComponentTokens.listItem.height.standard },
        'listItem.large': { width: touchTargetTokens.standard, height: newComponentTokens.listItem.height.large },
      },
      minimum: 44, // iOS minimum touch target
      spacing: newComponentTokens.listItem.spacing,
    },

    // Gradient validation
    gradients: {
      light: {
        calm: newColorTokens.light.gradientCalm,
        surface: newColorTokens.light.gradientSurface,
      },
      dark: {
        calm: newColorTokens.dark.gradientCalm,
        surface: newColorTokens.dark.gradientSurface,
      },
      maxLuminosityDiff: 10, // Maximum 10% luminosity difference (increased for calm gradients)
    },
  };

  it('should validate all design tokens and pass all checks', () => {
    const result = validateAllTokens(validationConfig);

    // Print detailed results
    console.log('\n' + formatValidationResults(result));

    // Assert no errors
    expect(result.totalErrors).toBe(0);
    expect(result.isValid).toBe(true);

    // Log warnings if any
    if (result.totalWarnings > 0) {
      console.warn(`\n⚠️  Found ${result.totalWarnings} warning(s) that should be reviewed.`);
    }
  });

  it('should have no critical violations in color tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const colorErrors = result.results.colors?.filter(r => r.errors.length > 0) || [];
    
    if (colorErrors.length > 0) {
      console.error('\nColor token errors:');
      colorErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(colorErrors.length).toBe(0);
  });

  it('should have no critical violations in spacing tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const spacingErrors = [
      ...(result.results.spacing?.filter(r => r.errors.length > 0) || []),
      ...(result.results.componentSpacing?.filter(r => r.errors.length > 0) || []),
    ];
    
    if (spacingErrors.length > 0) {
      console.error('\nSpacing token errors:');
      spacingErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(spacingErrors.length).toBe(0);
  });

  it('should have no critical violations in animation tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const animationErrors = [
      ...(result.results.animations?.filter(r => r.errors.length > 0) || []),
      ...(result.results.easingCurves?.filter(r => r.errors.length > 0) || []),
      ...(result.results.staggerDelays?.filter(r => r.errors.length > 0) || []),
    ];
    
    if (animationErrors.length > 0) {
      console.error('\nAnimation token errors:');
      animationErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(animationErrors.length).toBe(0);
  });

  it('should have no critical violations in border radius tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const borderRadiusErrors = result.results.borderRadius?.filter(r => r.errors.length > 0) || [];
    
    if (borderRadiusErrors.length > 0) {
      console.error('\nBorder radius token errors:');
      borderRadiusErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(borderRadiusErrors.length).toBe(0);
  });

  it('should have no critical violations in shadow tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const shadowErrors = result.results.shadows?.filter(r => r.errors.length > 0) || [];
    
    if (shadowErrors.length > 0) {
      console.error('\nShadow token errors:');
      shadowErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(shadowErrors.length).toBe(0);
  });

  it('should have no critical violations in touch target tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const touchTargetErrors = result.results.touchTargets?.filter(r => r.errors.length > 0) || [];
    
    if (touchTargetErrors.length > 0) {
      console.error('\nTouch target token errors:');
      touchTargetErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(touchTargetErrors.length).toBe(0);
  });

  it('should have no critical violations in gradient tokens', () => {
    const result = validateAllTokens(validationConfig);
    
    const gradientErrors = result.results.gradients?.filter(r => r.errors.length > 0) || [];
    
    if (gradientErrors.length > 0) {
      console.error('\nGradient token errors:');
      gradientErrors.forEach(r => {
        r.errors.forEach(e => {
          console.error(`  - ${e.token}: ${e.message}`);
        });
      });
    }

    expect(gradientErrors.length).toBe(0);
  });
});
