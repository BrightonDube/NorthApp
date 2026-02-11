/**
 * Default Category Unit Tests
 * Feature: coach-marketplace-sharing
 * 
 * Unit tests for default category behavior.
 * Tests specific examples and edge cases for category normalization.
 * 
 * Task: 7.3 Write property test for default category
 * Validates: Requirements 5.5
 */

import { CoachCategory } from '@/types';
import { normalizeCategory, getDefaultCategory } from '@/lib/marketplace.types';

describe('Default Category Unit Tests', () => {
  describe('normalizeCategory', () => {
    it('should return General when category is null', () => {
      const result = normalizeCategory(null);
      expect(result).toBe(CoachCategory.GENERAL);
    });

    it('should return General when category is undefined', () => {
      const result = normalizeCategory(undefined);
      expect(result).toBe(CoachCategory.GENERAL);
    });

    it('should preserve Productivity category', () => {
      const result = normalizeCategory(CoachCategory.PRODUCTIVITY);
      expect(result).toBe(CoachCategory.PRODUCTIVITY);
    });

    it('should preserve Learning category', () => {
      const result = normalizeCategory(CoachCategory.LEARNING);
      expect(result).toBe(CoachCategory.LEARNING);
    });

    it('should preserve Health category', () => {
      const result = normalizeCategory(CoachCategory.HEALTH);
      expect(result).toBe(CoachCategory.HEALTH);
    });

    it('should preserve Entertainment category', () => {
      const result = normalizeCategory(CoachCategory.ENTERTAINMENT);
      expect(result).toBe(CoachCategory.ENTERTAINMENT);
    });

    it('should preserve Business category', () => {
      const result = normalizeCategory(CoachCategory.BUSINESS);
      expect(result).toBe(CoachCategory.BUSINESS);
    });

    it('should preserve Creative category', () => {
      const result = normalizeCategory(CoachCategory.CREATIVE);
      expect(result).toBe(CoachCategory.CREATIVE);
    });

    it('should preserve General category', () => {
      const result = normalizeCategory(CoachCategory.GENERAL);
      expect(result).toBe(CoachCategory.GENERAL);
    });

    it('should be idempotent for null values', () => {
      const result1 = normalizeCategory(null);
      const result2 = normalizeCategory(result1);
      expect(result2).toBe(result1);
      expect(result2).toBe(CoachCategory.GENERAL);
    });

    it('should be idempotent for valid categories', () => {
      const result1 = normalizeCategory(CoachCategory.PRODUCTIVITY);
      const result2 = normalizeCategory(result1);
      expect(result2).toBe(result1);
      expect(result2).toBe(CoachCategory.PRODUCTIVITY);
    });
  });

  describe('getDefaultCategory', () => {
    it('should return General category', () => {
      const result = getDefaultCategory();
      expect(result).toBe(CoachCategory.GENERAL);
    });

    it('should return the same value as normalizeCategory(null)', () => {
      const defaultCategory = getDefaultCategory();
      const normalizedNull = normalizeCategory(null);
      expect(normalizedNull).toBe(defaultCategory);
    });

    it('should return the same value as normalizeCategory(undefined)', () => {
      const defaultCategory = getDefaultCategory();
      const normalizedUndefined = normalizeCategory(undefined);
      expect(normalizedUndefined).toBe(defaultCategory);
    });
  });

  describe('Integration with Coach objects', () => {
    it('should normalize coach with null category', () => {
      const coach = {
        id: '123',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'Test prompt',
        creatorId: null,
        isPublic: true,
        category: null as any,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const normalizedCoach = {
        ...coach,
        category: normalizeCategory(coach.category),
      };

      expect(normalizedCoach.category).toBe(CoachCategory.GENERAL);
    });

    it('should preserve coach with valid category', () => {
      const coach = {
        id: '123',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'Test prompt',
        creatorId: null,
        isPublic: true,
        category: CoachCategory.PRODUCTIVITY,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      const normalizedCoach = {
        ...coach,
        category: normalizeCategory(coach.category),
      };

      expect(normalizedCoach.category).toBe(CoachCategory.PRODUCTIVITY);
    });

    it('should normalize multiple coaches with mixed categories', () => {
      const coaches = [
        { category: null },
        { category: CoachCategory.LEARNING },
        { category: undefined },
        { category: CoachCategory.HEALTH },
      ];

      const normalized = coaches.map(c => normalizeCategory(c.category as any));

      expect(normalized[0]).toBe(CoachCategory.GENERAL);
      expect(normalized[1]).toBe(CoachCategory.LEARNING);
      expect(normalized[2]).toBe(CoachCategory.GENERAL);
      expect(normalized[3]).toBe(CoachCategory.HEALTH);
    });
  });
});
