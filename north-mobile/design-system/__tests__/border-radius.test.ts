/**
 * Border Radius Unit Tests
 * 
 * **Feature: calm-design-refresh**
 * 
 * These tests validate that the border radius scale is correctly defined:
 * - All border radius values are defined (8px to 32px scale)
 * - Component-specific radius guidelines are documented
 * - Values match the design specification
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

import {
  oldBorderRadiusTokens,
  newBorderRadiusTokens,
  oldComponentTokens,
  newComponentTokens,
} from '../fixtures/design-tokens.fixture';

// Import the actual tailwind config
const tailwindConfig = require('../../tailwind.config.js');

describe('Border Radius - Unit Tests', () => {
  describe('Border Radius Scale Definition', () => {
    it('should define all required border radius tokens', () => {
      const requiredTokens = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];
      
      requiredTokens.forEach((token) => {
        expect(newBorderRadiusTokens).toHaveProperty(token);
      });
    });

    it('should have correct border radius values matching design spec', () => {
      expect(newBorderRadiusTokens.sm).toBe(8);   // Subtle rounding
      expect(newBorderRadiusTokens.md).toBe(12);  // Standard buttons
      expect(newBorderRadiusTokens.lg).toBe(16);  // Cards, inputs
      expect(newBorderRadiusTokens.xl).toBe(20);  // Large cards
      expect(newBorderRadiusTokens['2xl']).toBe(24); // Modals
      expect(newBorderRadiusTokens['3xl']).toBe(28); // Large modals
      expect(newBorderRadiusTokens['4xl']).toBe(32); // Full-screen modals
      expect(newBorderRadiusTokens.full).toBe(9999); // Pills, circular
    });

    it('should have increased border radius compared to old values', () => {
      expect(newBorderRadiusTokens.sm).toBeGreaterThan(oldBorderRadiusTokens.sm);
      expect(newBorderRadiusTokens.md).toBeGreaterThan(oldBorderRadiusTokens.md);
      expect(newBorderRadiusTokens.lg).toBeGreaterThan(oldBorderRadiusTokens.lg);
      expect(newBorderRadiusTokens.xl).toBeGreaterThan(oldBorderRadiusTokens.xl);
      expect(newBorderRadiusTokens['2xl']).toBeGreaterThan(oldBorderRadiusTokens['2xl']);
      expect(newBorderRadiusTokens['3xl']).toBeGreaterThan(oldBorderRadiusTokens['3xl']);
      // 4xl stays the same at 32px (already at maximum)
      expect(newBorderRadiusTokens['4xl']).toBe(32);
    });
  });

  describe('Component-Specific Border Radius', () => {
    it('should define button border radius of 12px (md)', () => {
      expect(newComponentTokens.button.borderRadius).toBe(12);
    });

    it('should define card border radius of 16px (lg)', () => {
      expect(newComponentTokens.card.borderRadius).toBe(16);
    });

    it('should define input border radius of 12px (md)', () => {
      expect(newComponentTokens.input.borderRadius).toBe(12);
    });

    it('should define modal border radius of 24px (2xl)', () => {
      expect(newComponentTokens.modal.borderRadius).toBe(24);
    });

    it('should have increased component border radius compared to old values', () => {
      expect(newComponentTokens.button.borderRadius).toBeGreaterThan(oldComponentTokens.button.borderRadius);
      expect(newComponentTokens.card.borderRadius).toBeGreaterThan(oldComponentTokens.card.borderRadius);
      expect(newComponentTokens.input.borderRadius).toBeGreaterThan(oldComponentTokens.input.borderRadius);
      expect(newComponentTokens.modal.borderRadius).toBeGreaterThan(oldComponentTokens.modal.borderRadius);
    });
  });

  describe('Tailwind Config Integration', () => {
    it('should define all border radius tokens in tailwind.config.js', () => {
      const borderRadiusConfig = tailwindConfig.theme.extend.borderRadius;
      
      expect(borderRadiusConfig).toBeDefined();
      
      const requiredTokens = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'full'];
      requiredTokens.forEach((token) => {
        expect(borderRadiusConfig).toHaveProperty(token);
      });
    });

    it('should have correct border radius values in tailwind config', () => {
      const borderRadiusConfig = tailwindConfig.theme.extend.borderRadius;
      
      expect(borderRadiusConfig.sm).toBe(8);
      expect(borderRadiusConfig.md).toBe(12);
      expect(borderRadiusConfig.lg).toBe(16);
      expect(borderRadiusConfig.xl).toBe(20);
      expect(borderRadiusConfig['2xl']).toBe(24);
      expect(borderRadiusConfig['3xl']).toBe(28);
      expect(borderRadiusConfig['4xl']).toBe(32);
      expect(borderRadiusConfig.full).toBe(9999);
    });

    it('should include component-specific border radius guidelines in comments', () => {
      // Read the tailwind config file to check for comments
      const fs = require('fs');
      const path = require('path');
      const configPath = path.join(__dirname, '../../tailwind.config.js');
      const configContent = fs.readFileSync(configPath, 'utf-8');
      
      // Check that component guidelines are documented
      expect(configContent).toContain('Buttons: 12px (md)');
      expect(configContent).toContain('Input fields: 12px (md)');
      expect(configContent).toContain('Cards: 16px (lg)');
      expect(configContent).toContain('Modals: 24px (2xl)');
      expect(configContent).toContain('Bottom sheets: 28px top corners (3xl)');
      expect(configContent).toContain('Avatar images: full (circular)');
    });
  });

  describe('Border Radius Scale Progression', () => {
    it('should have a logical progression from small to large', () => {
      const values = [
        newBorderRadiusTokens.sm,
        newBorderRadiusTokens.md,
        newBorderRadiusTokens.lg,
        newBorderRadiusTokens.xl,
        newBorderRadiusTokens['2xl'],
        newBorderRadiusTokens['3xl'],
        newBorderRadiusTokens['4xl'],
      ];
      
      // Each value should be greater than the previous
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('should have consistent increments in the scale', () => {
      // Check that increments are reasonable (4px steps)
      expect(newBorderRadiusTokens.md - newBorderRadiusTokens.sm).toBe(4);
      expect(newBorderRadiusTokens.lg - newBorderRadiusTokens.md).toBe(4);
      expect(newBorderRadiusTokens.xl - newBorderRadiusTokens.lg).toBe(4);
      expect(newBorderRadiusTokens['2xl'] - newBorderRadiusTokens.xl).toBe(4);
      expect(newBorderRadiusTokens['3xl'] - newBorderRadiusTokens['2xl']).toBe(4);
      expect(newBorderRadiusTokens['4xl'] - newBorderRadiusTokens['3xl']).toBe(4);
    });
  });

  describe('Organic Shape Language', () => {
    it('should have minimum 8px border radius for subtle rounding', () => {
      expect(newBorderRadiusTokens.sm).toBeGreaterThanOrEqual(8);
    });

    it('should have minimum 12px border radius for buttons', () => {
      expect(newComponentTokens.button.borderRadius).toBeGreaterThanOrEqual(12);
    });

    it('should have minimum 16px border radius for cards', () => {
      expect(newComponentTokens.card.borderRadius).toBeGreaterThanOrEqual(16);
    });

    it('should have minimum 24px border radius for modals', () => {
      expect(newComponentTokens.modal.borderRadius).toBeGreaterThanOrEqual(24);
    });

    it('should support full circular radius for pills and avatars', () => {
      expect(newBorderRadiusTokens.full).toBe(9999);
    });
  });

  describe('Border Radius Increase Validation', () => {
    it('should log all border radius increases for documentation', () => {
      const tokens = Object.keys(oldBorderRadiusTokens).filter(key => key !== 'full');
      
      tokens.forEach((key) => {
        const oldValue = oldBorderRadiusTokens[key as keyof typeof oldBorderRadiusTokens];
        const newValue = newBorderRadiusTokens[key as keyof typeof newBorderRadiusTokens];
        
        const increase = newValue - oldValue;
        const increasePercent = ((newValue - oldValue) / oldValue) * 100;
        
        console.log(`${key}: ${oldValue}px → ${newValue}px (+${increase}px, ${increasePercent.toFixed(1)}% increase)`);
      });
    });
  });

  describe('Design System Consistency', () => {
    it('should have border radius values that align with spacing scale', () => {
      // Border radius should use similar increments to spacing
      // This ensures visual consistency across the design system
      const radiusIncrement = newBorderRadiusTokens.md - newBorderRadiusTokens.sm;
      expect(radiusIncrement).toBe(4); // Consistent 4px increment
    });

    it('should have component border radius that matches token scale', () => {
      // Button uses 'md' (12px)
      expect(newComponentTokens.button.borderRadius).toBe(newBorderRadiusTokens.md);
      
      // Card uses 'lg' (16px)
      expect(newComponentTokens.card.borderRadius).toBe(newBorderRadiusTokens.lg);
      
      // Input uses 'md' (12px)
      expect(newComponentTokens.input.borderRadius).toBe(newBorderRadiusTokens.md);
      
      // Modal uses '2xl' (24px)
      expect(newComponentTokens.modal.borderRadius).toBe(newBorderRadiusTokens['2xl']);
    });
  });
});
