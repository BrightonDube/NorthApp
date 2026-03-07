/**
 * Unit Tests for Coach Color Utilities
 * 
 * Tests the color utility functions for coach theme colors,
 * contrast checking, and text color selection.
 * 
 * Validates: Requirements 2.1, 2.4, 2.5
 */

import { getCoachThemeColor, hasGoodContrast, getContrastingTextColor } from '../../lib/coachColors';
import { getCategoryColor } from '../../lib/marketplace.types';
import { Coach, CoachCategory } from '../../types';

describe('Coach Color Utilities', () => {
  describe('getCoachThemeColor', () => {
    /**
     * Test that getCoachThemeColor returns the coach's theme color when defined
     * Validates: Requirements 2.1
     */
    it('should return coach\'s theme color when defined', () => {
      const coach: Coach = {
        id: '1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'Test prompt',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.PRODUCTIVITY,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        themeColor: '#FF5733',
      };

      const result = getCoachThemeColor(coach);
      expect(result).toBe('#FF5733');
    });

    /**
     * Test that getCoachThemeColor returns category color when theme color is undefined
     * Validates: Requirements 2.4
     */
    it('should return category color when theme color is undefined', () => {
      const coach: Coach = {
        id: '1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'Test prompt',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.PRODUCTIVITY,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        // themeColor is undefined
      };

      const result = getCoachThemeColor(coach);
      const expectedColor = getCategoryColor(CoachCategory.PRODUCTIVITY);
      expect(result).toBe(expectedColor);
    });
  });

  describe('hasGoodContrast', () => {
    /**
     * Test that hasGoodContrast returns true for dark colors
     * Dark colors should have good contrast with white text
     * Validates: Requirements 2.5
     */
    it('should return true for dark colors', () => {
      const darkColors = [
        '#000000', // black
        '#1a1a1a', // very dark gray
        '#0000FF', // blue
        '#008000', // green
        '#800080', // purple
        '#8B0000', // dark red
      ];

      darkColors.forEach(color => {
        const result = hasGoodContrast(color);
        expect(result).toBe(true);
      });
    });

    /**
     * Test that hasGoodContrast returns false for light colors
     * Light colors should not have good contrast with white text
     * Validates: Requirements 2.5
     */
    it('should return false for light colors', () => {
      const lightColors = [
        '#FFFFFF', // white
        '#F0F0F0', // very light gray
        '#FFFF00', // yellow
        '#00FFFF', // cyan
        '#FFB6C1', // light pink
        '#90EE90', // light green
      ];

      lightColors.forEach(color => {
        const result = hasGoodContrast(color);
        expect(result).toBe(false);
      });
    });
  });

  describe('getContrastingTextColor', () => {
    /**
     * Test that getContrastingTextColor returns white for dark backgrounds
     * Validates: Requirements 2.5
     */
    it('should return white for dark backgrounds', () => {
      const darkBackgrounds = [
        '#000000', // black
        '#1a1a1a', // very dark gray
        '#0000FF', // blue
        '#008000', // green
        '#800080', // purple
      ];

      darkBackgrounds.forEach(bgColor => {
        const result = getContrastingTextColor(bgColor);
        expect(result).toBe('#FFFFFF');
      });
    });

    /**
     * Test that getContrastingTextColor returns black for light backgrounds
     * Validates: Requirements 2.5
     */
    it('should return black for light backgrounds', () => {
      const lightBackgrounds = [
        '#FFFFFF', // white
        '#F0F0F0', // very light gray
        '#FFFF00', // yellow
        '#00FFFF', // cyan
        '#FFB6C1', // light pink
      ];

      lightBackgrounds.forEach(bgColor => {
        const result = getContrastingTextColor(bgColor);
        expect(result).toBe('#000000');
      });
    });
  });
});
