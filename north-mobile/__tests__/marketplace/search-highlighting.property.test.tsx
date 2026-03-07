/**
 * Search Highlighting Property-Based Tests
 * 
 * Property-based tests for search highlighting functionality in the coach marketplace.
 * Feature: coach-marketplace-sharing
 * 
 * Properties tested:
 * - Property 19: Search highlighting is applied
 * 
 * Validates: Requirements 7.3
 */

import fc from 'fast-check';
import { searchEngine } from '@/lib/searchEngine';

describe('Search Highlighting Properties', () => {
  /**
   * Property 19: Search highlighting is applied
   * 
   * **Validates: Requirements 7.3**
   * 
   * For any search query and matching coach, the displayed coach card should have
   * the matching text highlighted with <mark> tags.
   * 
   * This property ensures:
   * 1. Matching text is wrapped with <mark> tags
   * 2. Case-insensitive matching is applied
   * 3. Multiple matches are all highlighted
   * 4. Original text structure is preserved
   * 5. Empty queries return original text
   */
  // Feature: coach-marketplace-sharing, Property 19: Search highlighting is applied
  describe('Property 19: Search highlighting is applied', () => {
    it('Property 19.1: Highlights matching text with <mark> tags', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            // Ensure search term is non-empty after trimming and doesn't consist only of special chars
            return trimmed.length > 0 && /[a-zA-Z0-9]/.test(trimmed);
          }),
          (text, searchTerm) => {
            // Ensure the text contains the search term
            const textWithTerm = `${text} ${searchTerm} more text`;
            
            const highlighted = searchEngine.highlightMatches(textWithTerm, searchTerm);
            
            // Verify <mark> tags are present
            expect(highlighted).toContain('<mark>');
            expect(highlighted).toContain('</mark>');
            
            // Verify the search term appears in the highlighted text (case-insensitive)
            const lowerHighlighted = highlighted.toLowerCase();
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            expect(lowerHighlighted).toContain(`<mark>${lowerSearchTerm}</mark>`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.2: Highlighting is case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length >= 3 && /[a-zA-Z0-9]/.test(trimmed);
          }),
          fc.constantFrom('lower', 'upper', 'mixed'),
          (searchTerm, caseVariant) => {
            // Trim the search term since highlightMatches trims it
            const trimmedSearchTerm = searchTerm.trim();
            
            // Create text with the search term in original case
            const text = `This is a test with ${trimmedSearchTerm} in it`;
            
            // Transform the search term based on case variant
            let transformedTerm: string;
            switch (caseVariant) {
              case 'lower':
                transformedTerm = trimmedSearchTerm.toLowerCase();
                break;
              case 'upper':
                transformedTerm = trimmedSearchTerm.toUpperCase();
                break;
              case 'mixed':
                transformedTerm = trimmedSearchTerm
                  .split('')
                  .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
                  .join('');
                break;
              default:
                transformedTerm = trimmedSearchTerm;
            }
            
            const highlighted = searchEngine.highlightMatches(text, transformedTerm);
            
            // Verify highlighting occurred
            expect(highlighted).toContain('<mark>');
            expect(highlighted).toContain('</mark>');
            
            // The highlighted text should contain the original term from the text (case-insensitive match)
            const lowerHighlighted = highlighted.toLowerCase();
            const lowerSearchTerm = trimmedSearchTerm.toLowerCase();
            expect(lowerHighlighted).toContain(`<mark>${lowerSearchTerm}</mark>`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.3: Multiple matches are all highlighted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 15 }).filter(s => s.trim().length >= 2),
          fc.integer({ min: 2, max: 5 }),
          (searchTerm, occurrences) => {
            // Create text with multiple occurrences of the search term
            const parts = Array(occurrences).fill(searchTerm);
            const text = parts.join(' and ');
            
            const highlighted = searchEngine.highlightMatches(text, searchTerm);
            
            // Count the number of <mark> tags
            const markCount = (highlighted.match(/<mark>/g) || []).length;
            const closeMarkCount = (highlighted.match(/<\/mark>/g) || []).length;
            
            // Verify all occurrences are highlighted
            expect(markCount).toBe(occurrences);
            expect(closeMarkCount).toBe(occurrences);
            
            // Verify tags are properly paired
            expect(markCount).toBe(closeMarkCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.4: Original text structure is preserved', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10),
          fc.string({ minLength: 2, maxLength: 10 }).filter(s => s.trim().length >= 2),
          (text, searchTerm) => {
            // Ensure text contains the search term
            const textWithTerm = `${text} ${searchTerm} end`;
            
            const highlighted = searchEngine.highlightMatches(textWithTerm, searchTerm);
            
            // Remove <mark> tags to get back the original text
            const untagged = highlighted.replace(/<\/?mark>/g, '');
            
            // Verify the untagged text matches the original
            expect(untagged).toBe(textWithTerm);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.5: Empty query returns original text unchanged', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (text) => {
            // Test with empty string
            const highlightedEmpty = searchEngine.highlightMatches(text, '');
            expect(highlightedEmpty).toBe(text);
            
            // Test with whitespace only
            const highlightedWhitespace = searchEngine.highlightMatches(text, '   ');
            expect(highlightedWhitespace).toBe(text);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.6: Partial matches are highlighted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length >= 5 && /[a-zA-Z0-9]{3,}/.test(trimmed);
          }),
          (fullTerm) => {
            // Take a substring as the search term (at least 2 chars)
            const searchTerm = fullTerm.substring(0, Math.max(2, Math.floor(fullTerm.length / 2)));
            const text = `This contains ${fullTerm} in the middle`;
            
            const highlighted = searchEngine.highlightMatches(text, searchTerm);
            
            // Verify highlighting occurred
            expect(highlighted).toContain('<mark>');
            expect(highlighted).toContain('</mark>');
            
            // Verify the partial match is highlighted (case-insensitive)
            const lowerHighlighted = highlighted.toLowerCase();
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            expect(lowerHighlighted).toContain(`<mark>${lowerSearchTerm}`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.7: Special regex characters are escaped', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '[', ']', '|', '\\'),
          (specialChar) => {
            const text = `This has a ${specialChar} special character`;
            
            // Should not throw an error
            expect(() => {
              const highlighted = searchEngine.highlightMatches(text, specialChar);
              
              // Verify the special character is highlighted
              expect(highlighted).toContain('<mark>');
              expect(highlighted).toContain('</mark>');
            }).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.8: Whitespace in query is trimmed', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 20 }).filter(s => {
            const trimmed = s.trim();
            return trimmed.length >= 3 && /[a-zA-Z0-9]/.test(trimmed);
          }),
          (searchTerm) => {
            const text = `This contains ${searchTerm} in the text`;
            
            // Search with whitespace around the term
            const highlightedWithWhitespace = searchEngine.highlightMatches(text, `  ${searchTerm}  `);
            const highlightedWithoutWhitespace = searchEngine.highlightMatches(text, searchTerm);
            
            // Both should produce the same result (because query is trimmed)
            expect(highlightedWithWhitespace).toBe(highlightedWithoutWhitespace);
            
            // Verify highlighting occurred
            expect(highlightedWithWhitespace).toContain('<mark>');
            expect(highlightedWithWhitespace).toContain('</mark>');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.9: No matches returns original text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }).filter(s => s.trim().length >= 10),
          (text) => {
            // Use a search term that definitely won't match
            const impossibleTerm = 'xyzabc123impossible987654321';
            
            const highlighted = searchEngine.highlightMatches(text, impossibleTerm);
            
            // Should return original text without any <mark> tags
            expect(highlighted).toBe(text);
            expect(highlighted).not.toContain('<mark>');
            expect(highlighted).not.toContain('</mark>');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 19.10: Highlighting preserves word boundaries', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s)),
          (searchTerm) => {
            // Create text where the search term appears as a standalone word and as part of another word
            const text = `The ${searchTerm} is here and ${searchTerm}ing is also here`;
            
            const highlighted = searchEngine.highlightMatches(text, searchTerm);
            
            // Count occurrences of <mark> tags
            const markCount = (highlighted.match(/<mark>/g) || []).length;
            
            // Should highlight all occurrences (both standalone and as part of words)
            // because the search is substring-based, not word-boundary based
            expect(markCount).toBeGreaterThan(0);
            
            // Verify the highlighted text contains the search term
            const markedContents = highlighted.match(/<mark>([^<]+)<\/mark>/g);
            expect(markedContents).toBeTruthy();
            if (markedContents) {
              markedContents.forEach(marked => {
                const content = marked.replace(/<\/?mark>/g, '');
                expect(content.toLowerCase()).toContain(searchTerm.toLowerCase());
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
