/**
 * Unit Tests for Gradient Utility Functions
 * 
 * Tests gradient generation, validation, and color manipulation
 * Requirements: 5.2, 5.3, 5.4
 */

import {
  adjustLuminosity,
  hslToHex,
  generateGradient,
  generateLightGradient,
  generateDarkGradient,
  generateGradientPair,
  validateGradientSubtlety,
  validateGradientDirection,
  validateDarkGradientDarkness,
  generateGradientTokens,
} from '../utils/gradient-utils';
import { hexToHsl } from '../utils/color-utils';

describe('Gradient Utility Functions', () => {
  describe('adjustLuminosity', () => {
    it('should increase luminosity by specified percentage', () => {
      const baseColor = '#808080'; // 50% lightness
      const adjusted = adjustLuminosity(baseColor, 5);
      const adjustedHsl = hexToHsl(adjusted);
      const baseHsl = hexToHsl(baseColor);
      
      expect(adjustedHsl.l).toBeGreaterThan(baseHsl.l);
      expect(adjustedHsl.l - baseHsl.l).toBeCloseTo(5, 0);
    });
    
    it('should decrease luminosity by specified percentage', () => {
      const baseColor = '#808080'; // 50% lightness
      const adjusted = adjustLuminosity(baseColor, -5);
      const adjustedHsl = hexToHsl(adjusted);
      const baseHsl = hexToHsl(baseColor);
      
      expect(adjustedHsl.l).toBeLessThan(baseHsl.l);
      expect(baseHsl.l - adjustedHsl.l).toBeCloseTo(5, 0);
    });
    
    it('should clamp luminosity at 0', () => {
      const baseColor = '#000000'; // 0% lightness
      const adjusted = adjustLuminosity(baseColor, -10);
      const adjustedHsl = hexToHsl(adjusted);
      
      expect(adjustedHsl.l).toBe(0);
    });
    
    it('should clamp luminosity at 100', () => {
      const baseColor = '#FFFFFF'; // 100% lightness
      const adjusted = adjustLuminosity(baseColor, 10);
      const adjustedHsl = hexToHsl(adjusted);
      
      expect(adjustedHsl.l).toBe(100);
    });
  });
  
  describe('hslToHex', () => {
    it('should convert HSL to hex correctly', () => {
      const hsl = { h: 0, s: 0, l: 50 };
      const hex = hslToHex(hsl);
      
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
    });
    
    it('should handle achromatic colors', () => {
      const hsl = { h: 0, s: 0, l: 0 };
      const hex = hslToHex(hsl);
      
      expect(hex.toLowerCase()).toBe('#000000');
    });
    
    it('should handle white', () => {
      const hsl = { h: 0, s: 0, l: 100 };
      const hex = hslToHex(hsl);
      
      expect(hex.toLowerCase()).toBe('#ffffff');
    });
  });
  
  describe('generateGradient', () => {
    it('should generate linear gradient with 5% luminosity difference', () => {
      const result = generateGradient({
        baseColor: '#FAFAF9',
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      expect(result.gradient).toContain('linear-gradient');
      expect(result.gradient).toContain('180deg');
      expect(result.gradient).toContain(result.startColor);
      expect(result.gradient).toContain(result.endColor);
      expect(result.luminosityDifference).toBeCloseTo(5, 0);
    });
    
    it('should generate radial gradient', () => {
      const result = generateGradient({
        baseColor: '#FAFAF9',
        direction: 'radial',
        luminosityDifference: 5,
      });
      
      expect(result.gradient).toContain('radial-gradient');
      expect(result.gradient).toContain('circle');
    });
    
    it('should go darker for light colors', () => {
      const result = generateGradient({
        baseColor: '#FAFAF9', // Very light
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      const startHsl = hexToHsl(result.startColor);
      const endHsl = hexToHsl(result.endColor);
      
      expect(endHsl.l).toBeLessThan(startHsl.l);
    });
    
    it('should go lighter for dark colors', () => {
      const result = generateGradient({
        baseColor: '#0C0A09', // Very dark
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      const startHsl = hexToHsl(result.startColor);
      const endHsl = hexToHsl(result.endColor);
      
      expect(endHsl.l).toBeGreaterThan(startHsl.l);
    });
    
    it('should throw error for luminosity difference > 5%', () => {
      expect(() => {
        generateGradient({
          baseColor: '#FAFAF9',
          direction: 'linear',
          luminosityDifference: 6,
        });
      }).toThrow('Luminosity difference must be between 0 and 5%');
    });
    
    it('should throw error for negative luminosity difference', () => {
      expect(() => {
        generateGradient({
          baseColor: '#FAFAF9',
          direction: 'linear',
          luminosityDifference: -1,
        });
      }).toThrow('Luminosity difference must be between 0 and 5%');
    });
  });
  
  describe('generateLightGradient', () => {
    it('should generate gradient for light mode', () => {
      const result = generateLightGradient('#FAFAF9');
      
      expect(result.gradient).toContain('linear-gradient');
      expect(result.luminosityDifference).toBeCloseTo(5, 0);
    });
    
    it('should support radial direction', () => {
      const result = generateLightGradient('#FAFAF9', 'radial');
      
      expect(result.gradient).toContain('radial-gradient');
    });
  });
  
  describe('generateDarkGradient', () => {
    it('should generate gradient for dark mode', () => {
      const result = generateDarkGradient('#0C0A09');
      
      expect(result.gradient).toContain('linear-gradient');
      expect(result.luminosityDifference).toBeCloseTo(5, 0);
    });
    
    it('should support radial direction', () => {
      const result = generateDarkGradient('#0C0A09', 'radial');
      
      expect(result.gradient).toContain('radial-gradient');
    });
  });
  
  describe('generateGradientPair', () => {
    it('should generate both light and dark gradients', () => {
      const result = generateGradientPair('#FAFAF9', '#0C0A09');
      
      expect(result.light).toBeDefined();
      expect(result.dark).toBeDefined();
      expect(result.light.gradient).toContain('linear-gradient');
      expect(result.dark.gradient).toContain('linear-gradient');
    });
    
    it('should support radial direction for both', () => {
      const result = generateGradientPair('#FAFAF9', '#0C0A09', 'radial');
      
      expect(result.light.gradient).toContain('radial-gradient');
      expect(result.dark.gradient).toContain('radial-gradient');
    });
  });
  
  describe('validateGradientSubtlety', () => {
    it('should validate gradient with 5% luminosity difference', () => {
      const gradient = 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)';
      
      expect(validateGradientSubtlety(gradient)).toBe(true);
    });
    
    it('should reject gradient with > 5% luminosity difference', () => {
      const gradient = 'linear-gradient(180deg, #FFFFFF 0%, #000000 100%)';
      
      expect(validateGradientSubtlety(gradient)).toBe(false);
    });
    
    it('should return false for gradient with no colors', () => {
      const gradient = 'linear-gradient(180deg)';
      
      expect(validateGradientSubtlety(gradient)).toBe(false);
    });
    
    it('should return false for gradient with only one color', () => {
      const gradient = 'linear-gradient(180deg, #FAFAF9)';
      
      expect(validateGradientSubtlety(gradient)).toBe(false);
    });
  });
  
  describe('validateGradientDirection', () => {
    it('should validate linear gradient with 180deg', () => {
      const gradient = 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)';
      
      expect(validateGradientDirection(gradient)).toBe(true);
    });
    
    it('should validate radial gradient', () => {
      const gradient = 'radial-gradient(circle, #FAFAF9 0%, #F5F5F4 100%)';
      
      expect(validateGradientDirection(gradient)).toBe(true);
    });
    
    it('should reject gradient with other angles', () => {
      const gradient = 'linear-gradient(90deg, #FAFAF9 0%, #F5F5F4 100%)';
      
      expect(validateGradientDirection(gradient)).toBe(false);
    });
  });
  
  describe('validateDarkGradientDarkness', () => {
    it('should validate that dark gradient is darker than light', () => {
      const lightGradient = 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)';
      const darkGradient = 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)';
      
      expect(validateDarkGradientDarkness(lightGradient, darkGradient)).toBe(true);
    });
    
    it('should reject when dark gradient is lighter than light', () => {
      const lightGradient = 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)';
      const darkGradient = 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)';
      
      expect(validateDarkGradientDarkness(lightGradient, darkGradient)).toBe(false);
    });
    
    it('should return false for gradients with no colors', () => {
      const lightGradient = 'linear-gradient(180deg)';
      const darkGradient = 'linear-gradient(180deg)';
      
      expect(validateDarkGradientDarkness(lightGradient, darkGradient)).toBe(false);
    });
  });
  
  describe('generateGradientTokens', () => {
    it('should generate light and dark gradient tokens', () => {
      const tokens = generateGradientTokens();
      
      expect(tokens.light).toBeDefined();
      expect(tokens.dark).toBeDefined();
      expect(tokens.light['gradient-calm']).toBeDefined();
      expect(tokens.light['gradient-surface']).toBeDefined();
      expect(tokens.dark['gradient-calm-dark']).toBeDefined();
      expect(tokens.dark['gradient-surface-dark']).toBeDefined();
    });
    
    it('should generate valid gradients', () => {
      const tokens = generateGradientTokens();
      
      expect(validateGradientSubtlety(tokens.light['gradient-calm'])).toBe(true);
      expect(validateGradientSubtlety(tokens.light['gradient-surface'])).toBe(true);
      expect(validateGradientSubtlety(tokens.dark['gradient-calm-dark'])).toBe(true);
      expect(validateGradientSubtlety(tokens.dark['gradient-surface-dark'])).toBe(true);
    });
    
    it('should generate gradients with natural directions', () => {
      const tokens = generateGradientTokens();
      
      expect(validateGradientDirection(tokens.light['gradient-calm'])).toBe(true);
      expect(validateGradientDirection(tokens.light['gradient-surface'])).toBe(true);
      expect(validateGradientDirection(tokens.dark['gradient-calm-dark'])).toBe(true);
      expect(validateGradientDirection(tokens.dark['gradient-surface-dark'])).toBe(true);
    });
    
    it('should generate dark gradients darker than light gradients', () => {
      const tokens = generateGradientTokens();
      
      expect(
        validateDarkGradientDarkness(
          tokens.light['gradient-calm'],
          tokens.dark['gradient-calm-dark']
        )
      ).toBe(true);
      
      expect(
        validateDarkGradientDarkness(
          tokens.light['gradient-surface'],
          tokens.dark['gradient-surface-dark']
        )
      ).toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle very light colors', () => {
      const result = generateGradient({
        baseColor: '#FFFFFF',
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      expect(result.gradient).toBeDefined();
      expect(result.luminosityDifference).toBeLessThanOrEqual(5);
    });
    
    it('should handle very dark colors', () => {
      const result = generateGradient({
        baseColor: '#000000',
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      expect(result.gradient).toBeDefined();
      expect(result.luminosityDifference).toBeLessThanOrEqual(5);
    });
    
    it('should handle mid-tone colors', () => {
      const result = generateGradient({
        baseColor: '#808080',
        direction: 'linear',
        luminosityDifference: 5,
      });
      
      expect(result.gradient).toBeDefined();
      expect(result.luminosityDifference).toBeCloseTo(5, 0);
    });
  });
});
