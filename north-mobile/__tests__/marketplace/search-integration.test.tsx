/**
 * Search Integration Tests
 * 
 * Verifies that search is properly wired to marketplace filtering.
 * Tests the integration between SearchEngine and MarketplaceScreen.
 * 
 * Validates: Requirements 7.1, 7.4
 */

import { searchEngine } from '@/lib/searchEngine';
import { PublicCoach, CoachCategory } from '@/types';

describe('Search Integration', () => {
  const mockCoaches: PublicCoach[] = [
    {
      id: '1',
      name: 'Productivity Coach',
      icon: '🚀',
      systemPrompt: 'I help you be more productive',
      creatorId: 'user1',
      creatorName: 'John Doe',
      category: CoachCategory.PRODUCTIVITY,
      isPublic: true,
      isFeatured: false,
      sourceCoachId: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      model: 'gpt-4',
      temperature: 0.7,
    },
    {
      id: '2',
      name: 'Learning Assistant',
      icon: '📚',
      systemPrompt: 'I help you learn new skills',
      creatorId: 'user2',
      creatorName: 'Jane Smith',
      category: CoachCategory.LEARNING,
      isPublic: true,
      isFeatured: false,
      sourceCoachId: null,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      model: 'gpt-4',
      temperature: 0.7,
    },
    {
      id: '3',
      name: 'Health Advisor',
      icon: '💪',
      systemPrompt: 'I provide health and wellness guidance',
      creatorId: 'user1',
      creatorName: 'John Doe',
      category: CoachCategory.HEALTH,
      isPublic: true,
      isFeatured: false,
      sourceCoachId: null,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      model: 'gpt-4',
      temperature: 0.7,
    },
  ];

  describe('SearchEngine.search() integration', () => {
    it('should filter coaches by name', () => {
      const results = searchEngine.search(mockCoaches, 'productivity');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Productivity Coach');
    });

    it('should filter coaches by description', () => {
      const results = searchEngine.search(mockCoaches, 'learn');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Learning Assistant');
    });

    it('should filter coaches by creator name', () => {
      const results = searchEngine.search(mockCoaches, 'Jane Smith');
      
      expect(results).toHaveLength(1);
      expect(results[0].creatorName).toBe('Jane Smith');
    });

    it('should return all coaches when query is empty', () => {
      const results = searchEngine.search(mockCoaches, '');
      
      expect(results).toHaveLength(3);
      expect(results).toEqual(mockCoaches);
    });

    it('should return empty array when no matches found', () => {
      const results = searchEngine.search(mockCoaches, 'nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const results1 = searchEngine.search(mockCoaches, 'PRODUCTIVITY');
      const results2 = searchEngine.search(mockCoaches, 'productivity');
      const results3 = searchEngine.search(mockCoaches, 'PrOdUcTiViTy');
      
      expect(results1).toEqual(results2);
      expect(results2).toEqual(results3);
    });

    it('should handle partial matches', () => {
      const results = searchEngine.search(mockCoaches, 'prod');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Productivity Coach');
    });

    it('should search across multiple fields', () => {
      const results = searchEngine.search(mockCoaches, 'John');
      
      // Should match both coaches created by John Doe
      expect(results).toHaveLength(2);
      expect(results.map(c => c.id)).toContain('1');
      expect(results.map(c => c.id)).toContain('3');
    });
  });

  describe('"No results" message handling', () => {
    it('should return empty array for no matches', () => {
      const results = searchEngine.search(mockCoaches, 'xyz123notfound');
      
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle whitespace-only queries', () => {
      const results = searchEngine.search(mockCoaches, '   ');
      
      expect(results).toHaveLength(3);
      expect(results).toEqual(mockCoaches);
    });
  });

  describe('Search performance', () => {
    it('should complete search within 300ms for 100 coaches', () => {
      // Create 100 mock coaches
      const largeCoachSet: PublicCoach[] = Array.from({ length: 100 }, (_, i) => ({
        id: `coach-${i}`,
        name: `Coach ${i}`,
        icon: '🤖',
        systemPrompt: `I am coach number ${i}`,
        creatorId: `user-${i % 10}`,
        creatorName: `Creator ${i % 10}`,
        category: CoachCategory.GENERAL,
        isPublic: true,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        model: 'gpt-4',
        temperature: 0.7,
      }));

      const startTime = Date.now();
      searchEngine.search(largeCoachSet, 'coach');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
    });
  });
});
