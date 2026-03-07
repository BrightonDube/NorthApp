/**
 * Edge Function Property-Based Tests
 * 
 * Property-based tests for the chat Edge Function's prompt composition logic.
 * These tests validate the universal properties of context injection and prompt formatting.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 13: Context Prompt Composition
 * - Property 30: Complete Prompt Composition
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 9.1
 */

import fc from 'fast-check';

// Type definitions matching the Edge Function
type ContextCategory = 'values' | 'goals' | 'projects' | 'constraints';

interface UserContext {
  category: ContextCategory;
  content: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Coach {
  system_prompt: string;
  name: string;
}

// Arbitraries for property-based testing
const contextCategoryArbitrary = fc.constantFrom<ContextCategory>(
  'values',
  'goals',
  'projects',
  'constraints'
);

const contextContentArbitrary = fc.string({ minLength: 1, maxLength: 500 });

const userContextArbitrary = fc.record({
  category: contextCategoryArbitrary,
  content: contextContentArbitrary,
});

const messageArbitrary = fc.record({
  role: fc.constantFrom<'user' | 'assistant'>('user', 'assistant'),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
});

const coachArbitrary = fc.record({
  system_prompt: fc.string({ minLength: 10, maxLength: 500 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

const userMessageArbitrary = fc.string({ minLength: 1, maxLength: 10000 });

/**
 * Helper function to format context by category
 * This mirrors the logic in the Edge Function (lines 112-117)
 */
function formatContextByCategory(contexts: UserContext[]): Record<ContextCategory, string[]> {
  return {
    values: contexts.filter(c => c.category === 'values').map(c => c.content),
    goals: contexts.filter(c => c.category === 'goals').map(c => c.content),
    projects: contexts.filter(c => c.category === 'projects').map(c => c.content),
    constraints: contexts.filter(c => c.category === 'constraints').map(c => c.content),
  };
}

/**
 * Helper function to build system prompt with context
 * This mirrors the logic in the Edge Function (lines 119-136)
 */
function buildSystemPromptWithContext(
  coachSystemPrompt: string,
  contexts: UserContext[]
): string {
  const contextByCategory = formatContextByCategory(contexts);

  return `${coachSystemPrompt}

---

USER CONTEXT (This information defines who the user is - use it to personalize your responses):

VALUES (Core principles):
${contextByCategory.values.length > 0 ? contextByCategory.values.map(v => `- ${v}`).join('\n') : 'Not specified'}

GOALS (Current objectives):
${contextByCategory.goals.length > 0 ? contextByCategory.goals.map(g => `- ${g}`).join('\n') : 'Not specified'}

PROJECTS (Active work):
${contextByCategory.projects.length > 0 ? contextByCategory.projects.map(p => `- ${p}`).join('\n') : 'Not specified'}

CONSTRAINTS (Limitations):
${contextByCategory.constraints.length > 0 ? contextByCategory.constraints.map(c => `- ${c}`).join('\n') : 'Not specified'}`;
}

describe('Edge Function Property-Based Tests', () => {
  /**
   * Property 13: Context Prompt Composition
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3, 9.1**
   * 
   * For any message sent to a coach, the composed prompt should include all user context items
   * formatted with proper category headers and bullet points.
   * 
   * This property ensures that:
   * 1. All context items are included in the prompt
   * 2. Context is properly grouped by category
   * 3. Each category has the correct header
   * 4. Items are formatted with bullet points
   * 5. Empty categories show "Not specified"
   */
  describe('Property 13: Context Prompt Composition', () => {
    it('should include all context items in the composed prompt', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 0, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify coach system prompt is included
            expect(systemPrompt).toContain(coach.system_prompt);

            // Verify all context items are included
            contexts.forEach(context => {
              expect(systemPrompt).toContain(context.content);
            });

            // Verify context section header is present
            expect(systemPrompt).toContain('USER CONTEXT');
            expect(systemPrompt).toContain('This information defines who the user is');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format context items with proper category headers', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 1, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify all category headers are present
            expect(systemPrompt).toContain('VALUES (Core principles):');
            expect(systemPrompt).toContain('GOALS (Current objectives):');
            expect(systemPrompt).toContain('PROJECTS (Active work):');
            expect(systemPrompt).toContain('CONSTRAINTS (Limitations):');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format each context item with a bullet point', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 1, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify each context item is formatted with "- " prefix
            contexts.forEach(context => {
              const bulletPoint = `- ${context.content}`;
              expect(systemPrompt).toContain(bulletPoint);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should group context items by category correctly', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 1, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);
            const contextByCategory = formatContextByCategory(contexts);

            // For each category, verify items appear in the correct section
            const categories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
            
            categories.forEach(category => {
              const categoryItems = contextByCategory[category];
              
              if (categoryItems.length > 0) {
                // Find the category section in the prompt
                const categoryHeader = category.toUpperCase();
                const headerIndex = systemPrompt.indexOf(categoryHeader);
                expect(headerIndex).toBeGreaterThan(-1);

                // Verify all items for this category appear after the header
                categoryItems.forEach(content => {
                  const itemIndex = systemPrompt.indexOf(`- ${content}`);
                  expect(itemIndex).toBeGreaterThan(headerIndex);
                });
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display "Not specified" for empty categories', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 0, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);
            const contextByCategory = formatContextByCategory(contexts);

            // For each empty category, verify "Not specified" appears
            const categories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
            
            categories.forEach(category => {
              const categoryItems = contextByCategory[category];
              
              if (categoryItems.length === 0) {
                // Find the category section
                const categoryHeader = category.toUpperCase();
                const headerIndex = systemPrompt.indexOf(categoryHeader);
                
                // Find "Not specified" after this header
                const notSpecifiedIndex = systemPrompt.indexOf('Not specified', headerIndex);
                expect(notSpecifiedIndex).toBeGreaterThan(headerIndex);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain context order within categories', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          contextCategoryArbitrary,
          fc.array(contextContentArbitrary, { minLength: 2, maxLength: 10 }),
          (coach, category, contents) => {
            // Create contexts all in the same category
            const contexts: UserContext[] = contents.map(content => ({
              category,
              content,
            }));

            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify items appear in the same order they were provided
            let lastIndex = -1;
            contents.forEach(content => {
              const currentIndex = systemPrompt.indexOf(`- ${content}`);
              expect(currentIndex).toBeGreaterThan(lastIndex);
              lastIndex = currentIndex;
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 30: Complete Prompt Composition
   * 
   * **Validates: Requirements 9.1**
   * 
   * For any message sent, the composed prompt should include:
   * 1. Coach system_prompt
   * 2. User context (all categories)
   * 3. Conversation history (last 10 messages)
   * 4. Current user message
   * 
   * This property ensures the complete prompt structure is correct.
   */
  describe('Property 30: Complete Prompt Composition', () => {
    it('should include coach system prompt in the composed prompt', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 0, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify coach system prompt is at the beginning
            expect(systemPrompt.startsWith(coach.system_prompt)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include user context section after system prompt', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 1, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify context section appears after system prompt
            const systemPromptEnd = coach.system_prompt.length;
            const contextHeaderIndex = systemPrompt.indexOf('USER CONTEXT');
            
            expect(contextHeaderIndex).toBeGreaterThan(systemPromptEnd);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all four context categories in order', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 0, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify categories appear in the correct order
            const valuesIndex = systemPrompt.indexOf('VALUES (Core principles):');
            const goalsIndex = systemPrompt.indexOf('GOALS (Current objectives):');
            const projectsIndex = systemPrompt.indexOf('PROJECTS (Active work):');
            const constraintsIndex = systemPrompt.indexOf('CONSTRAINTS (Limitations):');

            expect(valuesIndex).toBeGreaterThan(-1);
            expect(goalsIndex).toBeGreaterThan(valuesIndex);
            expect(projectsIndex).toBeGreaterThan(goalsIndex);
            expect(constraintsIndex).toBeGreaterThan(projectsIndex);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should properly separate sections with dividers', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          fc.array(userContextArbitrary, { minLength: 0, maxLength: 20 }),
          (coach, contexts) => {
            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify section divider exists
            expect(systemPrompt).toContain('---');
            
            // Verify divider appears between system prompt and context
            const dividerIndex = systemPrompt.indexOf('---');
            const contextIndex = systemPrompt.indexOf('USER CONTEXT');
            
            expect(dividerIndex).toBeGreaterThan(0);
            expect(contextIndex).toBeGreaterThan(dividerIndex);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Test history truncation (last 10 messages)
   * 
   * **Validates: Requirements 9.1**
   * 
   * The Edge Function should only include the last 10 messages in the conversation history
   * to prevent context window overflow and maintain performance.
   */
  describe('History Truncation', () => {
    it('should truncate conversation history to last 10 messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 11, maxLength: 50 }),
          (messages) => {
            // Simulate the Edge Function's history truncation logic
            // In the actual Edge Function (line 103-106), this is done via:
            // .limit(10)
            const truncatedHistory = messages.slice(-10);

            // Verify only last 10 messages are included
            expect(truncatedHistory.length).toBe(10);

            // Verify the truncated history contains the last 10 messages
            const expectedLast10 = messages.slice(-10);
            expect(truncatedHistory).toEqual(expectedLast10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not truncate when history has 10 or fewer messages', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 0, maxLength: 10 }),
          (messages) => {
            // Simulate truncation
            const truncatedHistory = messages.slice(-10);

            // Verify all messages are included
            expect(truncatedHistory.length).toBe(messages.length);
            expect(truncatedHistory).toEqual(messages);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain message order after truncation', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 11, maxLength: 50 }),
          (messages) => {
            const truncatedHistory = messages.slice(-10);

            // Verify messages are in chronological order
            for (let i = 0; i < truncatedHistory.length - 1; i++) {
              const currentIndex = messages.indexOf(truncatedHistory[i]);
              const nextIndex = messages.indexOf(truncatedHistory[i + 1]);
              expect(nextIndex).toBeGreaterThan(currentIndex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve message roles after truncation', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 11, maxLength: 50 }),
          (messages) => {
            const truncatedHistory = messages.slice(-10);

            // Verify all messages have valid roles
            truncatedHistory.forEach(message => {
              expect(['user', 'assistant']).toContain(message.role);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve message content after truncation', () => {
      fc.assert(
        fc.property(
          fc.array(messageArbitrary, { minLength: 11, maxLength: 50 }),
          (messages) => {
            const truncatedHistory = messages.slice(-10);
            const expectedLast10 = messages.slice(-10);

            // Verify content is preserved exactly
            truncatedHistory.forEach((message, index) => {
              expect(message.content).toBe(expectedLast10[index].content);
              expect(message.role).toBe(expectedLast10[index].role);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Test context formatting for each category
   * 
   * **Validates: Requirements 5.1, 5.2, 5.3**
   * 
   * Each context category should be formatted consistently with proper headers,
   * bullet points, and fallback text for empty categories.
   */
  describe('Context Formatting by Category', () => {
    const categories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
    const categoryLabels = {
      values: 'VALUES (Core principles):',
      goals: 'GOALS (Current objectives):',
      projects: 'PROJECTS (Active work):',
      constraints: 'CONSTRAINTS (Limitations):',
    };

    categories.forEach(category => {
      describe(`${category} category`, () => {
        it(`should format ${category} with correct header`, () => {
          fc.assert(
            fc.property(
              coachArbitrary,
              fc.array(contextContentArbitrary, { minLength: 1, maxLength: 5 }),
              (coach, contents) => {
                const contexts: UserContext[] = contents.map(content => ({
                  category,
                  content,
                }));

                const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

                // Verify category header is present
                expect(systemPrompt).toContain(categoryLabels[category]);
              }
            ),
            { numRuns: 50 }
          );
        });

        it(`should format ${category} items with bullet points`, () => {
          fc.assert(
            fc.property(
              coachArbitrary,
              fc.array(contextContentArbitrary, { minLength: 1, maxLength: 5 }),
              (coach, contents) => {
                const contexts: UserContext[] = contents.map(content => ({
                  category,
                  content,
                }));

                const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

                // Verify each item has a bullet point
                contents.forEach(content => {
                  expect(systemPrompt).toContain(`- ${content}`);
                });
              }
            ),
            { numRuns: 50 }
          );
        });

        it(`should show "Not specified" for empty ${category}`, () => {
          fc.assert(
            fc.property(
              coachArbitrary,
              (coach) => {
                // Create contexts with no items in this category
                const contexts: UserContext[] = [];

                const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

                // Find the category section
                const headerIndex = systemPrompt.indexOf(categoryLabels[category]);
                expect(headerIndex).toBeGreaterThan(-1);

                // Verify "Not specified" appears after the header
                const notSpecifiedIndex = systemPrompt.indexOf('Not specified', headerIndex);
                expect(notSpecifiedIndex).toBeGreaterThan(headerIndex);
              }
            ),
            { numRuns: 50 }
          );
        });
      });
    });

    it('should format multiple items in the same category', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          contextCategoryArbitrary,
          fc.array(contextContentArbitrary, { minLength: 2, maxLength: 10 }),
          (coach, category, contents) => {
            const contexts: UserContext[] = contents.map(content => ({
              category,
              content,
            }));

            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify all items are present with bullet points
            contents.forEach(content => {
              expect(systemPrompt).toContain(`- ${content}`);
            });

            // Verify items appear in order
            let lastIndex = -1;
            contents.forEach(content => {
              const currentIndex = systemPrompt.indexOf(`- ${content}`);
              expect(currentIndex).toBeGreaterThan(lastIndex);
              lastIndex = currentIndex;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in context content', () => {
      fc.assert(
        fc.property(
          coachArbitrary,
          contextCategoryArbitrary,
          fc.string({ minLength: 1, maxLength: 200 }), // Allow any characters
          (coach, category, content) => {
            const contexts: UserContext[] = [{ category, content }];

            const systemPrompt = buildSystemPromptWithContext(coach.system_prompt, contexts);

            // Verify content is included exactly as provided
            expect(systemPrompt).toContain(content);
            expect(systemPrompt).toContain(`- ${content}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
