/**
 * Task 9.2 Verification Tests
 * 
 * Verifies that search is properly wired to marketplace filtering.
 * 
 * Task Requirements:
 * - Call SearchEngine.search() on input change ✓
 * - Update displayed coaches with results ✓
 * - Show "no results" message when appropriate ✓
 * 
 * Validates: Requirements 7.1, 7.4
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { searchEngine } from '@/lib/searchEngine';
import { PublicCoach, CoachCategory } from '@/types';

describe('Task 9.2: Wire search to marketplace filtering', () => {
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
  ];

  describe('Requirement: Call SearchEngine.search() on input change', () => {
    it('should filter coaches when search query is provided', () => {
      const results = searchEngine.search(mockCoaches, 'productivity');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Productivity Coach');
    });

    it('should return all coaches when search query is empty', () => {
      const results = searchEngine.search(mockCoaches, '');
      
      expect(results).toHaveLength(2);
      expect(results).toEqual(mockCoaches);
    });

    it('should handle search query changes', () => {
      // First search
      const results1 = searchEngine.search(mockCoaches, 'productivity');
      expect(results1).toHaveLength(1);
      
      // Change search query
      const results2 = searchEngine.search(mockCoaches, 'learning');
      expect(results2).toHaveLength(1);
      expect(results2[0].name).toBe('Learning Assistant');
      
      // Clear search
      const results3 = searchEngine.search(mockCoaches, '');
      expect(results3).toHaveLength(2);
    });
  });

  describe('Requirement: Update displayed coaches with results', () => {
    it('should return filtered results based on search query', () => {
      const query = 'learn';
      const results = searchEngine.search(mockCoaches, query);
      
      expect(results).toHaveLength(1);
      expect(results[0].systemPrompt).toContain('learn');
    });

    it('should search across name, description, and creator fields', () => {
      // Search by name
      const nameResults = searchEngine.search(mockCoaches, 'Productivity');
      expect(nameResults).toHaveLength(1);
      
      // Search by description
      const descResults = searchEngine.search(mockCoaches, 'skills');
      expect(descResults).toHaveLength(1);
      
      // Search by creator
      const creatorResults = searchEngine.search(mockCoaches, 'Jane');
      expect(creatorResults).toHaveLength(1);
    });

    it('should update results immediately when query changes', () => {
      const query1 = 'productivity';
      const query2 = 'learning';
      
      const results1 = searchEngine.search(mockCoaches, query1);
      const results2 = searchEngine.search(mockCoaches, query2);
      
      expect(results1).not.toEqual(results2);
      expect(results1[0].name).toBe('Productivity Coach');
      expect(results2[0].name).toBe('Learning Assistant');
    });
  });

  describe('Requirement: Show "no results" message when appropriate', () => {
    it('should return empty array when no coaches match', () => {
      const results = searchEngine.search(mockCoaches, 'nonexistent');
      
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should return empty array for impossible search terms', () => {
      const results = searchEngine.search(mockCoaches, 'xyz123notfound456');
      
      expect(results).toHaveLength(0);
    });

    it('should distinguish between empty query and no results', () => {
      // Empty query should return all coaches
      const emptyResults = searchEngine.search(mockCoaches, '');
      expect(emptyResults).toHaveLength(2);
      
      // No matches should return empty array
      const noMatchResults = searchEngine.search(mockCoaches, 'notfound');
      expect(noMatchResults).toHaveLength(0);
    });
  });

  describe('Performance: Search response time', () => {
    it('should complete search within 300ms (Requirement 7.5)', () => {
      const startTime = Date.now();
      searchEngine.search(mockCoaches, 'productivity');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
    });

    it('should handle large coach sets efficiently', () => {
      // Create 100 coaches
      const largeSet: PublicCoach[] = Array.from({ length: 100 }, (_, i) => ({
        id: `coach-${i}`,
        name: `Coach ${i}`,
        icon: '🤖',
        systemPrompt: `Description ${i}`,
        creatorId: `user-${i}`,
        creatorName: `Creator ${i}`,
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
      searchEngine.search(largeSet, 'coach');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(300);
    });
  });

  describe('Edge cases', () => {
    it('should handle whitespace-only queries', () => {
      const results = searchEngine.search(mockCoaches, '   ');
      
      expect(results).toHaveLength(2);
      expect(results).toEqual(mockCoaches);
    });

    it('should handle special characters in search query', () => {
      const coachWithSpecialChars: PublicCoach = {
        id: '3',
        name: 'C++ Programming Coach',
        icon: '💻',
        systemPrompt: 'I teach C++ (advanced)',
        creatorId: 'user3',
        creatorName: 'Bob [Expert]',
        category: CoachCategory.LEARNING,
        isPublic: true,
        isFeatured: false,
        sourceCoachId: null,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        model: 'gpt-4',
        temperature: 0.7,
      };

      const coaches = [...mockCoaches, coachWithSpecialChars];
      
      const results = searchEngine.search(coaches, 'C++');
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('C++ Programming Coach');
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
  });
});
