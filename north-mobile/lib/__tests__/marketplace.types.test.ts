/**
 * Unit Tests for Marketplace Type Utilities
 * 
 * Tests the type conversion, validation, and utility functions
 * for marketplace-related types.
 * 
 * Validates: Requirements 5.1, 5.4, 6.3, 10.3
 */

import {
  isPublicCoach,
  isInstalledCoach,
  dbCoachToCoach,
  coachToDbInsert,
  getAllCategories,
  isValidCategory,
  getDefaultCategory,
  createInstalledCoach,
  filterByCategory,
  filterPublicCoaches,
  filterFeaturedCoaches,
  sortByNewest,
  sortByName,
  isInstalled,
  getCategoryDisplay,
  getCategoryColor,
} from '../marketplace.types';
import { Coach, PublicCoach, InstalledCoach, CoachCategory } from '../../types';
import { Tables } from '../database.types';

describe('Marketplace Type Utilities', () => {
  // Sample test data
  const mockCoach: Coach = {
    id: '123',
    name: 'Test Coach',
    icon: '🎯',
    systemPrompt: 'You are a helpful coach',
    creatorId: 'user-1',
    isPublic: true,
    category: CoachCategory.PRODUCTIVITY,
    isFeatured: false,
    sourceCoachId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPublicCoach: PublicCoach = {
    ...mockCoach,
    creatorName: 'John Doe',
    model: 'gpt-4',
    temperature: 0.7,
  };

  const mockInstalledCoach: InstalledCoach = {
    ...mockCoach,
    userId: 'user-2',
    sourceCoachId: 'source-123',
    installedAt: '2024-01-02T00:00:00Z',
  };

  const mockDbCoach: Tables<'coaches'> = {
    id: '123',
    name: 'Test Coach',
    icon: '🎯',
    system_prompt: 'You are a helpful coach',
    creator_id: 'user-1',
    is_public: true,
    category: 'Productivity',
    is_featured: false,
    source_coach_id: null,
    about: null,
    expectations: null,
    tags: null,
    theme_color: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('Type Guards', () => {
    test('isPublicCoach identifies PublicCoach correctly', () => {
      expect(isPublicCoach(mockPublicCoach)).toBe(true);
      expect(isPublicCoach(mockCoach)).toBe(false);
    });

    test('isInstalledCoach identifies InstalledCoach correctly', () => {
      expect(isInstalledCoach(mockInstalledCoach)).toBe(true);
      expect(isInstalledCoach(mockCoach)).toBe(false);
    });

    test('isInstalled checks for source_coach_id', () => {
      expect(isInstalled(mockInstalledCoach)).toBe(true);
      expect(isInstalled(mockCoach)).toBe(false);
    });
  });

  describe('Database Conversions', () => {
    test('dbCoachToCoach converts database row to Coach interface', () => {
      const result = dbCoachToCoach(mockDbCoach);
      
      expect(result.id).toBe(mockDbCoach.id);
      expect(result.name).toBe(mockDbCoach.name);
      expect(result.systemPrompt).toBe(mockDbCoach.system_prompt);
      expect(result.creatorId).toBe(mockDbCoach.creator_id);
      expect(result.isPublic).toBe(mockDbCoach.is_public);
      expect(result.category).toBe(CoachCategory.PRODUCTIVITY);
      expect(result.isFeatured).toBe(mockDbCoach.is_featured);
      expect(result.sourceCoachId).toBe(mockDbCoach.source_coach_id);
    });

    test('coachToDbInsert converts Coach to database format', () => {
      const result = coachToDbInsert(mockCoach);
      
      expect(result.id).toBe(mockCoach.id);
      expect(result.name).toBe(mockCoach.name);
      expect(result.system_prompt).toBe(mockCoach.systemPrompt);
      expect(result.creator_id).toBe(mockCoach.creatorId);
      expect(result.is_public).toBe(mockCoach.isPublic);
      expect(result.category).toBe(mockCoach.category);
      expect(result.is_featured).toBe(mockCoach.isFeatured);
      expect(result.source_coach_id).toBe(mockCoach.sourceCoachId);
    });

    test('coachToDbInsert handles partial Coach objects', () => {
      const partial: Partial<Coach> = {
        name: 'Updated Name',
        category: CoachCategory.LEARNING,
      };
      
      const result = coachToDbInsert(partial);
      
      expect(result.name).toBe('Updated Name');
      expect(result.category).toBe(CoachCategory.LEARNING);
      expect(result.id).toBeUndefined();
      expect(result.system_prompt).toBeUndefined();
    });
  });

  describe('Category Utilities', () => {
    test('getAllCategories returns all categories', () => {
      const categories = getAllCategories();
      
      expect(categories).toHaveLength(7);
      expect(categories).toContain(CoachCategory.PRODUCTIVITY);
      expect(categories).toContain(CoachCategory.LEARNING);
      expect(categories).toContain(CoachCategory.HEALTH);
      expect(categories).toContain(CoachCategory.ENTERTAINMENT);
      expect(categories).toContain(CoachCategory.BUSINESS);
      expect(categories).toContain(CoachCategory.CREATIVE);
      expect(categories).toContain(CoachCategory.GENERAL);
    });

    test('isValidCategory validates category strings', () => {
      expect(isValidCategory('Productivity')).toBe(true);
      expect(isValidCategory('Learning')).toBe(true);
      expect(isValidCategory('Invalid')).toBe(false);
      expect(isValidCategory('')).toBe(false);
    });

    test('getDefaultCategory returns General', () => {
      expect(getDefaultCategory()).toBe(CoachCategory.GENERAL);
    });

    test('getCategoryDisplay returns formatted category name', () => {
      expect(getCategoryDisplay(CoachCategory.PRODUCTIVITY)).toBe('⚡ Productivity');
      expect(getCategoryDisplay(CoachCategory.LEARNING)).toBe('📚 Learning');
      expect(getCategoryDisplay(CoachCategory.HEALTH)).toBe('💪 Health');
    });

    test('getCategoryColor returns color for each category', () => {
      expect(getCategoryColor(CoachCategory.PRODUCTIVITY)).toBe('#3B82F6');
      expect(getCategoryColor(CoachCategory.LEARNING)).toBe('#8B5CF6');
      expect(getCategoryColor(CoachCategory.HEALTH)).toBe('#10B981');
    });
  });

  describe('Coach Installation', () => {
    test('createInstalledCoach creates correct InstalledCoach', () => {
      const userId = 'user-123';
      const newCoachId = 'new-coach-456';
      
      const result = createInstalledCoach(mockPublicCoach, userId, newCoachId);
      
      expect(result.id).toBe(newCoachId);
      expect(result.userId).toBe(userId);
      expect(result.sourceCoachId).toBe(mockPublicCoach.id);
      expect(result.name).toBe(mockPublicCoach.name);
      expect(result.icon).toBe(mockPublicCoach.icon);
      expect(result.systemPrompt).toBe(mockPublicCoach.systemPrompt);
      expect(result.creatorId).toBeNull();
      expect(result.isPublic).toBe(false);
      expect(result.isFeatured).toBe(false);
      expect(result.category).toBe(mockPublicCoach.category);
      expect(result.installedAt).toBeDefined();
    });
  });

  describe('Filtering Functions', () => {
    const coaches: Coach[] = [
      { ...mockCoach, id: '1', category: CoachCategory.PRODUCTIVITY, isPublic: true, isFeatured: true },
      { ...mockCoach, id: '2', category: CoachCategory.LEARNING, isPublic: true, isFeatured: false },
      { ...mockCoach, id: '3', category: CoachCategory.PRODUCTIVITY, isPublic: false, isFeatured: false },
      { ...mockCoach, id: '4', category: CoachCategory.HEALTH, isPublic: true, isFeatured: true },
    ];

    test('filterByCategory filters coaches by category', () => {
      const result = filterByCategory(coaches, CoachCategory.PRODUCTIVITY);
      
      expect(result).toHaveLength(2);
      expect(result.every(c => c.category === CoachCategory.PRODUCTIVITY)).toBe(true);
    });

    test('filterByCategory returns all coaches when category is null', () => {
      const result = filterByCategory(coaches, null);
      
      expect(result).toHaveLength(4);
    });

    test('filterPublicCoaches returns only public coaches', () => {
      const result = filterPublicCoaches(coaches);
      
      expect(result).toHaveLength(3);
      expect(result.every(c => c.isPublic)).toBe(true);
    });

    test('filterFeaturedCoaches returns only featured public coaches', () => {
      const result = filterFeaturedCoaches(coaches);
      
      expect(result).toHaveLength(2);
      expect(result.every(c => c.isFeatured && c.isPublic)).toBe(true);
    });
  });

  describe('Sorting Functions', () => {
    const coaches: Coach[] = [
      { ...mockCoach, id: '1', name: 'Zebra Coach', createdAt: '2024-01-03T00:00:00Z' },
      { ...mockCoach, id: '2', name: 'Alpha Coach', createdAt: '2024-01-01T00:00:00Z' },
      { ...mockCoach, id: '3', name: 'Beta Coach', createdAt: '2024-01-02T00:00:00Z' },
    ];

    test('sortByNewest sorts coaches by creation date (newest first)', () => {
      const result = sortByNewest(coaches);
      
      expect(result[0].id).toBe('1'); // 2024-01-03
      expect(result[1].id).toBe('3'); // 2024-01-02
      expect(result[2].id).toBe('2'); // 2024-01-01
    });

    test('sortByName sorts coaches alphabetically', () => {
      const result = sortByName(coaches);
      
      expect(result[0].name).toBe('Alpha Coach');
      expect(result[1].name).toBe('Beta Coach');
      expect(result[2].name).toBe('Zebra Coach');
    });

    test('sorting functions do not mutate original array', () => {
      const original = [...coaches];
      sortByNewest(coaches);
      sortByName(coaches);
      
      expect(coaches).toEqual(original);
    });
  });
});
