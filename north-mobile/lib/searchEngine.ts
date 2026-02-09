/**
 * Search Engine Service
 * 
 * Provides search and text highlighting functionality for the coach marketplace.
 * Filters coaches based on search queries and highlights matching text.
 * 
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { Coach, PublicCoach } from '../types';

/**
 * Interface for the search engine
 */
export interface SearchEngine {
  search(coaches: PublicCoach[], query: string): PublicCoach[];
  highlightMatches(text: string, query: string): string;
}

/**
 * Implementation of the coach search engine
 * 
 * Searches across coach name, description, and creator name fields.
 * Provides text highlighting for matching search terms.
 */
export class CoachSearchEngine implements SearchEngine {
  /**
   * Search coaches by query string
   * 
   * Filters coaches based on case-insensitive matching against:
   * - Coach name
   * - Coach description (system prompt)
   * - Creator name
   * 
   * @param coaches - Array of public coaches to search
   * @param query - Search query string
   * @returns Filtered array of coaches matching the query
   * 
   * Validates: Requirements 7.1, 7.2
   */
  search(coaches: PublicCoach[], query: string): PublicCoach[] {
    // Return all coaches if query is empty or only whitespace
    if (!query.trim()) {
      return coaches;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    return coaches.filter(coach => {
      // Search in coach name
      const nameMatch = coach.name.toLowerCase().includes(lowerQuery);
      
      // Search in coach description (system prompt)
      const descriptionMatch = coach.systemPrompt.toLowerCase().includes(lowerQuery);
      
      // Search in creator name
      const creatorMatch = coach.creatorName.toLowerCase().includes(lowerQuery);
      
      return nameMatch || descriptionMatch || creatorMatch;
    });
  }
  
  /**
   * Highlight matching text in a string
   * 
   * Wraps matching text with <mark> tags for highlighting in UI.
   * Uses case-insensitive matching.
   * 
   * @param text - Text to highlight matches in
   * @param query - Search query to match
   * @returns Text with <mark> tags around matches
   * 
   * Validates: Requirements 7.3
   */
  highlightMatches(text: string, query: string): string {
    // Return original text if query is empty or only whitespace
    if (!query.trim()) {
      return text;
    }
    
    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex with case-insensitive flag and global flag
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    
    // Replace matches with <mark> tags
    return text.replace(regex, '<mark>$1</mark>');
  }
}

/**
 * Create a new instance of the search engine
 * 
 * @returns A new CoachSearchEngine instance
 */
export function createSearchEngine(): SearchEngine {
  return new CoachSearchEngine();
}

/**
 * Default search engine instance for convenience
 */
export const searchEngine = createSearchEngine();
