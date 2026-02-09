/**
 * Unit Tests for SearchEngine Service
 * 
 * Tests the search and highlighting functionality for the coach marketplace.
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { CoachSearchEngine } from '../searchEngine';
import { PublicCoach, CoachCategory } from '../../types';

describe('CoachSearchEngine', () => {
  let searchEngine: CoachSearchEngine;
  let mockCoaches: PublicCoach[];

  beforeEach(() => {
    searchEngine = new CoachSearchEngine();
    
    // Create mock coaches for testing
    mockCoaches = [
      {
        id: '1',
        name: 'Productivity Coach',
        icon: '⚡',
        systemPrompt: 'I help you get things done efficiently',
        creatorId: 'user1',
        creatorName: 'John Doe',
        isPublic: true,
        category: CoachCategory.PRODUCTIVITY,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        name: 'Learning Assistant',
        icon: '📚',
        systemPrompt: 'I help you learn new skills and concepts',
        creatorId: 'user2',
        creatorName: 'Jane Smith',
        isPublic: true,
        category: CoachCategory.LEARNING,
        isFeatured: true,
        sourceCoachId: null,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
      {
        id: '3',
        name: 'Health Advisor',
        icon: '💪',
        systemPrompt: 'I provide health and wellness guidance',
        creatorId: 'user1',
        creatorName: 'John Doe',
        isPublic: true,
        category: CoachCategory.HEALTH,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      },
    ];
  });

  describe('search()', () => {
    it('should return all coaches when query is empty', () => {
      const result = searchEngine.search(mockCoaches, '');
      expect(result).toEqual(mockCoaches);
    });

    it('should return all coaches when query is only whitespace', () => {
      const result = searchEngine.search(mockCoaches, '   ');
      expect(result).toEqual(mockCoaches);
    });

    it('should filter coaches by name (case-insensitive)', () => {
      const result = searchEngine.search(mockCoaches, 'productivity');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Productivity Coach');
    });

    it('should filter coaches by description/system prompt', () => {
      const result = searchEngine.search(mockCoaches, 'learn');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Learning Assistant');
    });

    it('should filter coaches by creator name', () => {
      const result = searchEngine.search(mockCoaches, 'Jane Smith');
      expect(result).toHaveLength(1);
      expect(result[0].creatorName).toBe('Jane Smith');
    });

    it('should return multiple coaches when query matches multiple fields', () => {
      const result = searchEngine.search(mockCoaches, 'John');
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toContain('1');
      expect(result.map(c => c.id)).toContain('3');
    });

    it('should be case-insensitive', () => {
      const result1 = searchEngine.search(mockCoaches, 'PRODUCTIVITY');
      const result2 = searchEngine.search(mockCoaches, 'productivity');
      const result3 = searchEngine.search(mockCoaches, 'PrOdUcTiViTy');
      
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should return empty array when no matches found', () => {
      const result = searchEngine.search(mockCoaches, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('should handle partial matches', () => {
      const result = searchEngine.search(mockCoaches, 'prod');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Productivity Coach');
    });

    it('should trim whitespace from query', () => {
      const result = searchEngine.search(mockCoaches, '  health  ');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Health Advisor');
    });
  });

  describe('highlightMatches()', () => {
    it('should return original text when query is empty', () => {
      const text = 'Hello World';
      const result = searchEngine.highlightMatches(text, '');
      expect(result).toBe(text);
    });

    it('should return original text when query is only whitespace', () => {
      const text = 'Hello World';
      const result = searchEngine.highlightMatches(text, '   ');
      expect(result).toBe(text);
    });

    it('should wrap matching text with <mark> tags', () => {
      const text = 'I help you learn new skills';
      const result = searchEngine.highlightMatches(text, 'learn');
      expect(result).toBe('I help you <mark>learn</mark> new skills');
    });

    it('should be case-insensitive', () => {
      const text = 'Productivity Coach';
      const result = searchEngine.highlightMatches(text, 'productivity');
      expect(result).toBe('<mark>Productivity</mark> Coach');
    });

    it('should highlight all occurrences', () => {
      const text = 'Learn to learn better';
      const result = searchEngine.highlightMatches(text, 'learn');
      expect(result).toBe('<mark>Learn</mark> to <mark>learn</mark> better');
    });

    it('should handle special regex characters', () => {
      const text = 'Cost is $100 (approx)';
      const result = searchEngine.highlightMatches(text, '$100');
      expect(result).toBe('Cost is <mark>$100</mark> (approx)');
    });

    it('should handle parentheses in query', () => {
      const text = 'Cost is $100 (approx)';
      const result = searchEngine.highlightMatches(text, '(approx)');
      expect(result).toBe('Cost is $100 <mark>(approx)</mark>');
    });

    it('should handle brackets in query', () => {
      const text = 'Array [1, 2, 3]';
      const result = searchEngine.highlightMatches(text, '[1, 2, 3]');
      expect(result).toBe('Array <mark>[1, 2, 3]</mark>');
    });

    it('should handle dots in query', () => {
      const text = 'Visit example.com';
      const result = searchEngine.highlightMatches(text, 'example.com');
      expect(result).toBe('Visit <mark>example.com</mark>');
    });
  });
});
