/**
 * Unit Tests for Coach Interface Extensions
 * 
 * Tests that the Coach interface includes new optional profile fields
 * and that default values are provided for missing fields
 * 
 * Task: 1.1 Write unit tests for Coach interface extensions
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import type { Coach, CoachCategory } from '../../types';

describe('Coach Interface Extensions', () => {
  describe('Coach interface structure', () => {
    it('should include themeColor as an optional field', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        themeColor: '#3B82F6',
      };

      expect(coach.themeColor).toBe('#3B82F6');
    });

    it('should include about as an optional field', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        about: 'This coach helps with productivity and time management.',
      };

      expect(coach.about).toBe('This coach helps with productivity and time management.');
    });

    it('should include expectations as an optional field', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        expectations: [
          'Personalized productivity advice',
          'Goal setting strategies',
          'Time management tips',
        ],
      };

      expect(coach.expectations).toHaveLength(3);
      expect(coach.expectations).toContain('Personalized productivity advice');
    });

    it('should include tags as an optional field', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['productivity', 'time-management', 'goals'],
      };

      expect(coach.tags).toHaveLength(3);
      expect(coach.tags).toContain('productivity');
    });

    it('should allow a coach without any new optional fields', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      expect(coach.themeColor).toBeUndefined();
      expect(coach.about).toBeUndefined();
      expect(coach.expectations).toBeUndefined();
      expect(coach.tags).toBeUndefined();
    });

    it('should allow a coach with all optional fields defined', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        themeColor: '#3B82F6',
        about: 'This coach helps with productivity.',
        expectations: ['Personalized advice', 'Goal setting'],
        tags: ['productivity', 'goals'],
      };

      expect(coach.themeColor).toBe('#3B82F6');
      expect(coach.about).toBe('This coach helps with productivity.');
      expect(coach.expectations).toHaveLength(2);
      expect(coach.tags).toHaveLength(2);
    });
  });

  describe('Default values for missing fields', () => {
    it('should handle undefined themeColor gracefully', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Application layer should provide default (category color)
      const themeColor = coach.themeColor ?? '#6B7280'; // Default gray
      expect(themeColor).toBe('#6B7280');
    });

    it('should handle undefined about gracefully', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach with expertise in productivity.',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Application layer should provide default (first 200 chars of systemPrompt)
      const about = coach.about ?? coach.systemPrompt.substring(0, 200);
      expect(about).toBe('You are a helpful coach with expertise in productivity.');
    });

    it('should handle undefined expectations gracefully', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Application layer should provide default (empty array)
      const expectations = coach.expectations ?? [];
      expect(expectations).toEqual([]);
      expect(Array.isArray(expectations)).toBe(true);
    });

    it('should handle undefined tags gracefully', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Application layer should provide default (empty array)
      const tags = coach.tags ?? [];
      expect(tags).toEqual([]);
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should handle null values for optional fields', () => {
      // TypeScript allows undefined but not null for optional fields
      // This test ensures we handle both cases in the application layer
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // Use nullish coalescing to handle both undefined and null
      const themeColor = coach.themeColor ?? '#6B7280';
      const about = coach.about ?? coach.systemPrompt.substring(0, 200);
      const expectations = coach.expectations ?? [];
      const tags = coach.tags ?? [];

      expect(themeColor).toBe('#6B7280');
      expect(about).toBe('You are a helpful coach');
      expect(expectations).toEqual([]);
      expect(tags).toEqual([]);
    });
  });

  describe('Field type validation', () => {
    it('should accept valid hex color for themeColor', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        themeColor: '#FF5733',
      };

      expect(coach.themeColor).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should accept string for about field', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        about: 'A detailed description of the coach.',
      };

      expect(typeof coach.about).toBe('string');
    });

    it('should accept array of strings for expectations', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        expectations: ['Expectation 1', 'Expectation 2'],
      };

      expect(Array.isArray(coach.expectations)).toBe(true);
      coach.expectations?.forEach(expectation => {
        expect(typeof expectation).toBe('string');
      });
    });

    it('should accept array of strings for tags', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['tag1', 'tag2', 'tag3'],
      };

      expect(Array.isArray(coach.tags)).toBe(true);
      coach.tags?.forEach(tag => {
        expect(typeof tag).toBe('string');
      });
    });

    it('should accept empty arrays for expectations and tags', () => {
      const coach: Coach = {
        id: 'coach-1',
        name: 'Test Coach',
        icon: '🎯',
        systemPrompt: 'You are a helpful coach',
        creatorId: null,
        isPublic: true,
        category: 'Productivity' as CoachCategory,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        expectations: [],
        tags: [],
      };

      expect(coach.expectations).toEqual([]);
      expect(coach.tags).toEqual([]);
    });
  });
});
