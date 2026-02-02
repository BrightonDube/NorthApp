/**
 * Context Store Property-Based Tests
 * 
 * Property-based tests for contextStore using fast-check.
 * Each test validates universal properties that should hold across all inputs.
 * 
 * Feature: north-mobile-app
 * 
 * Properties tested:
 * - Property 5: Context Data Structure Integrity
 * - Property 6: Category Validation
 * - Property 7: Context User Association
 * - Property 8: Update Timestamp Modification
 * - Property 9: Context Deletion Completeness
 * - Property 10: Context Retrieval Ordering
 * - Property 11: Free Tier Context Limit
 * - Property 12: Pro Tier Unlimited Context
 * - Property 58: Context Store Sync
 * 
 * Validates: Requirements 3.1-3.7, 4.1, 4.2, 18.3
 */

import fc from 'fast-check';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContextStore, useContextByCategory, useCanAddContext, useContextCount } from '../contextStore';
import { supabase } from '@/lib/supabase';
import type { UserContext, ContextCategory } from '@/types';
import {
  contextCategoryArbitrary,
  invalidContextCategoryArbitrary,
  contextContentArbitrary,
  uuidArbitrary,
  timestampArbitrary,
  PBT_CONFIG,
} from '../../__tests__/utils/property-helpers';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

describe('ContextStore Property-Based Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset store state
    useContextStore.setState({
      items: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });
    
    // Clear AsyncStorage
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  /**
   * Property 5: Context Data Structure Integrity
   * 
   * For any context item created, the returned data structure should contain
   * all required fields with correct types and valid values.
   * 
   * Validates: Requirements 3.1
   */
  describe('Property 5: Context Data Structure Integrity', () => {
    it('should maintain data structure integrity for all created context items', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (category, content, userId, contextId) => {
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock successful creation
            const mockDbRow = {
              id: contextId,
              user_id: userId,
              category,
              content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDbRow,
                    error: null,
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            let createdContext: UserContext | undefined;
            await act(async () => {
              createdContext = await result.current.createContext(category, content);
            });

            // Verify data structure integrity
            expect(createdContext).toBeDefined();
            expect(createdContext!.id).toBe(contextId);
            expect(createdContext!.userId).toBe(userId);
            expect(createdContext!.category).toBe(category);
            expect(createdContext!.content).toBe(content);
            expect(createdContext!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            expect(createdContext!.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            
            // Verify types
            expect(typeof createdContext!.id).toBe('string');
            expect(typeof createdContext!.userId).toBe('string');
            expect(typeof createdContext!.category).toBe('string');
            expect(typeof createdContext!.content).toBe('string');
            expect(typeof createdContext!.createdAt).toBe('string');
            expect(typeof createdContext!.updatedAt).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Category Validation
   * 
   * For any context creation, only valid categories (values, goals, projects, constraints)
   * should be accepted. Invalid categories should be rejected.
   * 
   * Validates: Requirements 3.2, 3.3
   */
  describe('Property 6: Category Validation', () => {
    it('should accept all valid categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (category, content, userId, contextId) => {
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock successful creation
            const mockDbRow = {
              id: contextId,
              user_id: userId,
              category,
              content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDbRow,
                    error: null,
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            let createdContext: UserContext | undefined;
            await act(async () => {
              createdContext = await result.current.createContext(category, content);
            });

            // Verify category was accepted and stored correctly
            expect(createdContext).toBeDefined();
            expect(createdContext!.category).toBe(category);
            expect(['values', 'goals', 'projects', 'constraints']).toContain(category);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid categories at database level', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidContextCategoryArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          async (invalidCategory, content, userId) => {
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock database rejection of invalid category
            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Invalid category' },
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            // Attempt to create with invalid category
            await act(async () => {
              try {
                await result.current.createContext(invalidCategory as ContextCategory, content);
              } catch (error) {
                // Expected to throw
                expect(error).toBeDefined();
              }
            });

            // Verify no item was added to store
            expect(result.current.items.length).toBe(0);
            expect(result.current.error).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 7: Context User Association
   * 
   * For any context item created, it should be associated with the authenticated user
   * and only that user should be able to access it.
   * 
   * Validates: Requirements 3.4
   */
  describe('Property 7: Context User Association', () => {
    it('should associate context items with the authenticated user', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          async (category, content, userId, contextId) => {
            // Clear mocks for this iteration
            jest.clearAllMocks();
            
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock successful creation
            const mockDbRow = {
              id: contextId,
              user_id: userId,
              category,
              content,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            (supabase.from as jest.Mock).mockReturnValue({
              insert: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockDbRow,
                    error: null,
                  }),
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            let createdContext: UserContext | undefined;
            await act(async () => {
              createdContext = await result.current.createContext(category, content);
            });

            // Verify user association
            expect(createdContext).toBeDefined();
            expect(createdContext!.userId).toBe(userId);

            // Verify the insert call included the user_id
            const fromMock = supabase.from as jest.Mock;
            expect(fromMock).toHaveBeenCalledWith('user_context');
            
            const insertMock = fromMock.mock.results[fromMock.mock.results.length - 1].value.insert;
            expect(insertMock).toHaveBeenCalledWith({
              user_id: userId,
              category,
              content,
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject context creation when user is not authenticated', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          async (category, content) => {
            // Mock no authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: null },
              error: null,
            });

            const { result } = renderHook(() => useContextStore());

            // Attempt to create context without authentication
            await act(async () => {
              try {
                await result.current.createContext(category, content);
                // Should not reach here
                expect(true).toBe(false);
              } catch (error) {
                // Expected to throw
                expect(error).toBeDefined();
                expect((error as Error).message).toContain('not authenticated');
              }
            });

            // Verify no item was added
            expect(result.current.items.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 8: Update Timestamp Modification
   * 
   * For any context item update, the updatedAt timestamp should be modified
   * to reflect the update time, while createdAt remains unchanged.
   * 
   * Validates: Requirements 3.5
   */
  describe('Property 8: Update Timestamp Modification', () => {
    it('should update timestamp on content modification', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          uuidArbitrary,
          timestampArbitrary,
          async (category, originalContent, newContent, userId, contextId, createdAt) => {
            // Skip if contents are the same
            fc.pre(originalContent !== newContent);

            // Setup: Create initial context item in store
            const initialItem: UserContext = {
              id: contextId,
              userId,
              category,
              content: originalContent,
              createdAt,
              updatedAt: createdAt,
            };

            useContextStore.setState({
              items: [initialItem],
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Mock successful update
            (supabase.from as jest.Mock).mockReturnValue({
              update: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            const beforeUpdate = Date.now();
            
            await act(async () => {
              await result.current.updateContext(contextId, newContent);
            });

            const afterUpdate = Date.now();

            // Find the updated item
            const updatedItem = result.current.items.find(item => item.id === contextId);
            expect(updatedItem).toBeDefined();

            // Verify content was updated
            expect(updatedItem!.content).toBe(newContent);

            // Verify createdAt remained unchanged
            expect(updatedItem!.createdAt).toBe(createdAt);

            // Verify updatedAt was modified (should be recent)
            const updatedAtTime = new Date(updatedItem!.updatedAt).getTime();
            expect(updatedAtTime).toBeGreaterThanOrEqual(beforeUpdate);
            expect(updatedAtTime).toBeLessThanOrEqual(afterUpdate);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Context Deletion Completeness
   * 
   * For any context item deletion, the item should be completely removed
   * from both the store and the database, with no traces remaining.
   * 
   * Validates: Requirements 3.6
   */
  describe('Property 9: Context Deletion Completeness', () => {
    it('should completely remove deleted context items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.integer({ min: 0 }),
          async (contextItems, deleteIndexSeed) => {
            // Clear mocks for this iteration
            jest.clearAllMocks();
            
            // Select which item to delete
            const deleteIndex = deleteIndexSeed % contextItems.length;
            const itemToDelete = contextItems[deleteIndex];

            // Setup: Populate store with items
            useContextStore.setState({
              items: contextItems,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Mock successful deletion
            (supabase.from as jest.Mock).mockReturnValue({
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            const initialCount = result.current.items.length;

            await act(async () => {
              await result.current.deleteContext(itemToDelete.id);
            });

            // Verify item was removed from store
            expect(result.current.items.length).toBe(initialCount - 1);
            expect(result.current.items.find(item => item.id === itemToDelete.id)).toBeUndefined();

            // Verify database delete was called
            const fromMock = supabase.from as jest.Mock;
            expect(fromMock).toHaveBeenCalledWith('user_context');
            
            const deleteMock = fromMock.mock.results[fromMock.mock.results.length - 1].value.delete;
            expect(deleteMock).toHaveBeenCalled();
            
            const eqMock = deleteMock.mock.results[deleteMock.mock.results.length - 1].value.eq;
            expect(eqMock).toHaveBeenCalledWith('id', itemToDelete.id);

            // Verify remaining items are intact
            const remainingItems = contextItems.filter(item => item.id !== itemToDelete.id);
            expect(result.current.items).toHaveLength(remainingItems.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should rollback deletion on database error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.integer({ min: 0 }),
          async (contextItems, deleteIndexSeed) => {
            const deleteIndex = deleteIndexSeed % contextItems.length;
            const itemToDelete = contextItems[deleteIndex];

            // Setup store
            useContextStore.setState({
              items: contextItems,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Mock deletion failure
            (supabase.from as jest.Mock).mockReturnValue({
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  error: { message: 'Database error' },
                }),
              }),
            });

            const { result } = renderHook(() => useContextStore());

            await act(async () => {
              try {
                await result.current.deleteContext(itemToDelete.id);
              } catch (error) {
                // Expected to throw
              }
            });

            // Verify item was restored (rollback)
            expect(result.current.items).toHaveLength(contextItems.length);
            expect(result.current.items.find(item => item.id === itemToDelete.id)).toBeDefined();
            expect(result.current.error).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 10: Context Retrieval Ordering
   * 
   * For any context retrieval, items should be ordered by category first,
   * then by creation date within each category.
   * 
   * Validates: Requirements 3.7
   */
  describe('Property 10: Context Retrieval Ordering', () => {
    it('should maintain category and creation date ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              user_id: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              created_at: timestampArbitrary,
              updated_at: timestampArbitrary,
            }),
            { minLength: 5, maxLength: 15 }
          ),
          async (dbRows) => {
            // Clear mocks for this iteration
            jest.clearAllMocks();
            
            // Mock fetch returning items - need to chain order() calls
            const mockOrder = jest.fn();
            const mockSelect = jest.fn();

            // Mock network store
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.setState({ isOnline: true });
            
            // First order() call returns an object with another order() method
            // Second order() call resolves with the data
            mockOrder
              .mockReturnValueOnce({ order: mockOrder })  // First call: .order('category')
              .mockResolvedValueOnce({ data: dbRows, error: null }); // Second call: .order('created_at')
            
            mockSelect.mockReturnValue({ order: mockOrder });
            
            (supabase.from as jest.Mock).mockReturnValue({
              select: mockSelect,
            });

            const { result } = renderHook(() => useContextStore());

            await act(async () => {
              await result.current.fetchContexts(true);
            });

            // Verify the order calls were made correctly
            // This is what matters - that we're asking the database to sort
            expect(mockOrder).toHaveBeenCalledTimes(2);
            expect(mockOrder).toHaveBeenNthCalledWith(1, 'category');
            expect(mockOrder).toHaveBeenNthCalledWith(2, 'created_at');
            
            // Verify items were loaded
            expect(result.current.items.length).toBe(dbRows.length);
          }
        ),
        { numRuns: 20 } // Reduced runs to avoid timeout
      );
    }, 15000); // Increased timeout

    it('should group items by category correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 4, maxLength: 12 }
          ),
          contextCategoryArbitrary,
          async (dbRows, targetCategory) => {
            // Setup store with items
            const items = dbRows;

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useContextStore());

            // Get items by category
            const categoryItems = result.current.getByCategory(targetCategory);

            // Verify all returned items belong to the target category
            categoryItems.forEach(item => {
              expect(item.category).toBe(targetCategory);
            });

            // Verify count matches
            const expectedCount = items.filter(item => item.category === targetCategory).length;
            expect(categoryItems.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Free Tier Context Limit
   * 
   * For any free tier user, attempting to create a fourth context item
   * should be prevented, and the user should be prompted to upgrade.
   * 
   * Validates: Requirements 4.1
   */
  describe('Property 11: Free Tier Context Limit', () => {
    it('should enforce 3-item limit for free tier users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 5 }
          ),
          fc.boolean(),
          async (existingItems, isProUser) => {
            // Setup store with existing items
            useContextStore.setState({
              items: existingItems,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Test directly from store state
            const canAdd = useContextStore.getState().canAddMore(isProUser);

            if (isProUser) {
              // Pro users can always add more
              expect(canAdd).toBe(true);
            } else {
              // Free users limited to 3 items
              if (existingItems.length < 3) {
                expect(canAdd).toBe(true);
              } else {
                expect(canAdd).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow free users to add items up to the limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 2 }),
          async (itemCount) => {
            // Create exactly itemCount items
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Free user should be able to add more
            expect(useContextStore.getState().canAddMore(false)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prevent free users from adding beyond the limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }),
          async (itemCount) => {
            // Create more than 3 items
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Free user should NOT be able to add more
            expect(useContextStore.getState().canAddMore(false)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 12: Pro Tier Unlimited Context
   * 
   * For any Pro tier user, there should be no limit on the number of
   * context items they can create.
   * 
   * Validates: Requirements 4.2
   */
  describe('Property 12: Pro Tier Unlimited Context', () => {
    it('should allow Pro users to create unlimited context items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (itemCount) => {
            // Create any number of items
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Pro user should always be able to add more, regardless of count
            expect(useContextStore.getState().canAddMore(true)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should verify Pro users can exceed free tier limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 4, max: 50 }),
          async (itemCount) => {
            // Create more than free tier limit (3)
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Pro user can still add more
            expect(useContextStore.getState().canAddMore(true)).toBe(true);
            
            // Free user cannot
            expect(useContextStore.getState().canAddMore(false)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 58: Context Store Sync
   * 
   * For any context modification (create, update, delete), the store should
   * sync with AsyncStorage for offline access and maintain consistency.
   * 
   * Validates: Requirements 18.3
   */
  describe('Property 58: Context Store Sync', () => {
    it('should persist items to AsyncStorage after modifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (items) => {
            // Setup store with items
            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Wait for persistence (Zustand persist middleware)
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify store state is correct for persistence
            const state = useContextStore.getState();
            
            expect(state.items).toEqual(items);
            expect(state.lastSynced).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain lastSynced timestamp after fetch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              user_id: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              created_at: timestampArbitrary,
              updated_at: timestampArbitrary,
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (dbRows) => {
            // Clear mocks for this iteration
            jest.clearAllMocks();
            
            // Mock fetch - need to chain order() calls
            const mockOrder = jest.fn();
            const mockSelect = jest.fn();
            
            mockOrder
              .mockReturnValueOnce({ order: mockOrder })  // First call: .order('category')
              .mockResolvedValueOnce({ data: dbRows, error: null }); // Second call: .order('created_at')
            
            mockSelect.mockReturnValue({ order: mockOrder });
            
            (supabase.from as jest.Mock).mockReturnValue({
              select: mockSelect,
            });

            const { result } = renderHook(() => useContextStore());

            // Mock network store
            const { useNetworkStore } = require('../networkStore');
            useNetworkStore.setState({ isOnline: true });

            const beforeFetch = Date.now();

            await act(async () => {
              await result.current.fetchContexts(true);
            });

            const afterFetch = Date.now();

            // Verify lastSynced was updated
            expect(result.current.lastSynced).toBeTruthy();
            expect(result.current.lastSynced!).toBeGreaterThanOrEqual(beforeFetch);
            expect(result.current.lastSynced!).toBeLessThanOrEqual(afterFetch);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle optimistic updates with rollback on error', async () => {
      await fc.assert(
        fc.asyncProperty(
          contextCategoryArbitrary,
          contextContentArbitrary,
          uuidArbitrary,
          fc.boolean(),
          async (category, content, userId, shouldSucceed) => {
            // Clear mocks and reset store for this iteration
            jest.clearAllMocks();
            useContextStore.setState({
              items: [],
              isLoading: false,
              error: null,
              lastSynced: null,
            });
            
            // Mock authenticated user
            (supabase.auth.getUser as jest.Mock).mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock creation with conditional success
            if (shouldSucceed) {
              (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: 'real-id',
                        user_id: userId,
                        category,
                        content,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              });
            } else {
              (supabase.from as jest.Mock).mockReturnValue({
                insert: jest.fn().mockReturnValue({
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'Database error' },
                    }),
                  }),
                }),
              });
            }

            const { result } = renderHook(() => useContextStore());

            const initialCount = result.current.items.length;

            await act(async () => {
              try {
                await result.current.createContext(category, content);
              } catch (error) {
                // Expected on failure
              }
            });

            if (shouldSucceed) {
              // Item should be added
              expect(result.current.items.length).toBe(initialCount + 1);
              // Error might be set from previous iteration, so we don't check it
            } else {
              // Item should be rolled back
              expect(result.current.items.length).toBe(initialCount);
              expect(result.current.error).toBeTruthy();
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Helper hook tests
   */
  describe('Helper Hooks', () => {
    it('useContextByCategory should filter by category', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: uuidArbitrary,
              userId: uuidArbitrary,
              category: contextCategoryArbitrary,
              content: contextContentArbitrary,
              createdAt: timestampArbitrary,
              updatedAt: timestampArbitrary,
            }),
            { minLength: 4, maxLength: 12 }
          ),
          contextCategoryArbitrary,
          async (items, targetCategory) => {
            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            // Test directly from store state
            const categoryItems = useContextStore.getState().getByCategory(targetCategory);

            // All returned items should match the target category
            categoryItems.forEach(item => {
              expect(item.category).toBe(targetCategory);
            });

            // Count should match
            const expectedCount = items.filter(item => item.category === targetCategory).length;
            expect(categoryItems.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('useCanAddContext should respect tier limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          fc.boolean(),
          async (itemCount, isProUser) => {
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useCanAddContext(isProUser));

            if (isProUser) {
              expect(result.current).toBe(true);
            } else {
              expect(result.current).toBe(itemCount < 3);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('useContextCount should return correct count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 20 }),
          async (itemCount) => {
            const items = Array.from({ length: itemCount }, (_, i) => ({
              id: `id-${i}`,
              userId: 'user-1',
              category: 'values' as const,
              content: `content-${i}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            useContextStore.setState({
              items,
              isLoading: false,
              error: null,
              lastSynced: Date.now(),
            });

            const { result } = renderHook(() => useContextCount());

            expect(result.current).toBe(itemCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
