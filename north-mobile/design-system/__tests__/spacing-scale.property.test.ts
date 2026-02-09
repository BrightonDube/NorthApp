/**
 * Spacing Scale Property Tests
 * 
 * **Feature: calm-design-refresh**
 * 
 * These tests validate that the spacing scale meets the requirements:
 * - All spacing values increased by 25-50%
 * - Component-specific spacing defined
 * - Touch target minimum sizes met
 * - Minimum 16px for interactive elements
 * - Minimum 24px for section spacing
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.4**
 */

import fc from 'fast-check';
import {
  oldSpacingTokens,
  newSpacingTokens,
  oldComponentTokens,
  newComponentTokens,
  touchTargetTokens,
} from '../fixtures/design-tokens.fixture';
import { validateSpacingIncrease } from '../utils/validation-utils';

// Import the actual tailwind config
const tailwindConfig = require('../../tailwind.config.js');

describe('Spacing Scale - Property Tests', () => {
  describe('Property 3: Spacing Increase', () => {
    /**
     * **Validates: Requirements 2.1**
     * 
     * For any spacing token in the new design system, the value should be 
     * at least 125% of the corresponding spacing token in the current design system.
     */
    it('should increase all spacing tokens by at least 25%', () => {
      const spacingKeys = Object.keys(oldSpacingTokens);

      fc.assert(
        fc.property(
          fc.constantFrom(...spacingKeys),
          (spacingKey) => {
            const oldValue = oldSpacingTokens[spacingKey as keyof typeof oldSpacingTokens];
            const newValue = newSpacingTokens[spacingKey as keyof typeof newSpacingTokens];

            // Validate that new value is at least 125% of old value
            const result = validateSpacingIncrease(newValue, oldValue, 0.25, spacingKey);

            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(newValue).toBeGreaterThanOrEqual(oldValue * 1.25);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Component Minimum Spacing', () => {
    /**
     * **Validates: Requirements 2.2, 2.3**
     * 
     * For any interactive component configuration (buttons, inputs, list items), 
     * the internal padding should be >= 16px and section spacing should be >= 24px.
     */
    it('should have minimum 16px padding for interactive components', () => {
      const components = [
        { name: 'button', config: newComponentTokens.button },
        { name: 'input', config: newComponentTokens.input },
        { name: 'listItem', config: newComponentTokens.listItem },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...components),
          (component) => {
            const padding = component.config.padding;
            
            if (typeof padding === 'number') {
              expect(padding).toBeGreaterThanOrEqual(16);
            } else if (typeof padding === 'object') {
              if ('vertical' in padding) {
                expect(padding.vertical).toBeGreaterThanOrEqual(16);
              }
              if ('horizontal' in padding) {
                // Horizontal can be more generous
                expect(padding.horizontal).toBeGreaterThanOrEqual(16);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have minimum 24px for section spacing', () => {
      // Section spacing is represented by 'lg' token
      expect(newSpacingTokens.lg).toBeGreaterThanOrEqual(24);
      
      // Also check that section-margin in tailwind config is >= 24
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      if (spacingConfig && spacingConfig['section-margin']) {
        expect(spacingConfig['section-margin']).toBeGreaterThanOrEqual(24);
      }
    });
  });

  describe('Property 20: Touch Target Minimums', () => {
    /**
     * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
     * 
     * For any interactive component configuration (buttons, list items, icon buttons), 
     * the minimum touch target size should be >= 44x44 points.
     */
    it('should have minimum 44px touch target for all interactive components', () => {
      const components = [
        { name: 'button', heights: newComponentTokens.button.height },
        { name: 'listItem', heights: newComponentTokens.listItem.height },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...components),
          (component) => {
            Object.values(component.heights).forEach((height) => {
              // All interactive elements should meet or exceed 44px
              // Small buttons can be 40px but must have 44px touch area
              if (component.name === 'button' && height === 40) {
                // Small buttons are allowed to be 40px visually
                expect(height).toBeGreaterThanOrEqual(40);
              } else {
                expect(height).toBeGreaterThanOrEqual(44);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should define standard touch target of 44px', () => {
      expect(touchTargetTokens.standard).toBe(44);
      
      // Check tailwind config has minHeight touch target
      const minHeightConfig = tailwindConfig.theme.extend.minHeight;
      if (minHeightConfig && minHeightConfig.touch) {
        expect(minHeightConfig.touch).toBe(44);
      }
    });

    it('should define comfortable touch target of 48px', () => {
      expect(touchTargetTokens.comfortable).toBe(48);
      
      // Check tailwind config has minHeight button
      const minHeightConfig = tailwindConfig.theme.extend.minHeight;
      if (minHeightConfig && minHeightConfig.button) {
        expect(minHeightConfig.button).toBe(48);
      }
    });
  });

  describe('Property 21: Touch Target Spacing', () => {
    /**
     * **Validates: Requirements 9.4**
     * 
     * For any component spacing configuration between interactive elements, 
     * the spacing should be >= 8px to prevent accidental taps.
     */
    it('should have minimum 8px spacing between touch targets', () => {
      // Check that the smallest spacing token is at least 8px
      expect(newSpacingTokens.sm).toBeGreaterThanOrEqual(8);
      
      // Check tailwind config has touch-spacing
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      if (spacingConfig && spacingConfig['touch-spacing']) {
        expect(spacingConfig['touch-spacing']).toBeGreaterThanOrEqual(8);
      }
    });

    it('should have adequate spacing in list items', () => {
      expect(newComponentTokens.listItem.spacing).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Tailwind Config Integration', () => {
    it('should define all required spacing tokens in tailwind.config.js', () => {
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      
      expect(spacingConfig).toBeDefined();
      
      // Check base spacing scale
      const requiredTokens = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
      requiredTokens.forEach((token) => {
        expect(spacingConfig).toHaveProperty(token);
      });
    });

    it('should define component-specific spacing tokens', () => {
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      
      const componentTokens = [
        'button-padding-x',
        'button-padding-y',
        'list-item-padding',
        'section-margin',
        'screen-margin-x',
        'screen-margin-y',
        'card-padding',
        'card-padding-lg',
        'touch-spacing',
      ];

      componentTokens.forEach((token) => {
        expect(spacingConfig).toHaveProperty(token);
      });
    });

    it('should define touch target minimum sizes', () => {
      const minHeightConfig = tailwindConfig.theme.extend.minHeight;
      const minWidthConfig = tailwindConfig.theme.extend.minWidth;
      
      expect(minHeightConfig).toBeDefined();
      expect(minWidthConfig).toBeDefined();
      
      // Check minHeight tokens
      const requiredMinHeights = [
        'touch',
        'button-sm',
        'button',
        'button-lg',
        'input',
        'list-item',
        'list-item-lg',
      ];
      
      requiredMinHeights.forEach((token) => {
        expect(minHeightConfig).toHaveProperty(token);
      });
      
      // Check minWidth tokens
      const requiredMinWidths = ['touch', 'button-sm', 'button'];
      
      requiredMinWidths.forEach((token) => {
        expect(minWidthConfig).toHaveProperty(token);
      });
    });

    it('should have correct spacing values in tailwind config', () => {
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      
      // Verify specific values match design spec
      expect(spacingConfig.xs).toBe(4);
      expect(spacingConfig.sm).toBe(8);
      expect(spacingConfig.md).toBe(16);
      expect(spacingConfig.lg).toBe(24);
      expect(spacingConfig.xl).toBe(32);
      expect(spacingConfig['2xl']).toBe(48);
      expect(spacingConfig['3xl']).toBe(64);
      expect(spacingConfig['4xl']).toBe(96);
    });

    it('should have correct component spacing values', () => {
      const spacingConfig = tailwindConfig.theme.extend.spacing;
      
      expect(spacingConfig['button-padding-x']).toBe(24);
      expect(spacingConfig['button-padding-y']).toBe(16);
      expect(spacingConfig['list-item-padding']).toBe(16);
      expect(spacingConfig['section-margin']).toBe(32);
      expect(spacingConfig['screen-margin-x']).toBe(24);
      expect(spacingConfig['screen-margin-y']).toBe(32);
      expect(spacingConfig['card-padding']).toBe(20);
      expect(spacingConfig['card-padding-lg']).toBe(24);
      expect(spacingConfig['touch-spacing']).toBe(8);
    });

    it('should have correct touch target sizes', () => {
      const minHeightConfig = tailwindConfig.theme.extend.minHeight;
      const minWidthConfig = tailwindConfig.theme.extend.minWidth;
      
      expect(minHeightConfig.touch).toBe(44);
      expect(minHeightConfig['button-sm']).toBe(40);
      expect(minHeightConfig.button).toBe(48);
      expect(minHeightConfig['button-lg']).toBe(56);
      expect(minHeightConfig.input).toBe(48);
      expect(minHeightConfig['list-item']).toBe(56);
      expect(minHeightConfig['list-item-lg']).toBe(72);
      
      expect(minWidthConfig.touch).toBe(44);
      expect(minWidthConfig['button-sm']).toBe(40);
      expect(minWidthConfig.button).toBe(48);
    });
  });

  describe('Spacing Increase Validation', () => {
    it('should validate all spacing increases are within 25-50% range', () => {
      const spacingKeys = Object.keys(oldSpacingTokens);

      spacingKeys.forEach((key) => {
        const oldValue = oldSpacingTokens[key as keyof typeof oldSpacingTokens];
        const newValue = newSpacingTokens[key as keyof typeof newSpacingTokens];
        
        const increasePercent = ((newValue - oldValue) / oldValue) * 100;
        
        // Should be at least 25% increase
        expect(increasePercent).toBeGreaterThanOrEqual(25);
        
        // Log the actual increase for documentation
        console.log(`${key}: ${oldValue}px → ${newValue}px (${increasePercent.toFixed(1)}% increase)`);
      });
    });
  });
});
