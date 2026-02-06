/**
 * Context Store
 * 
 * Manages user context items (values, goals, projects, constraints) using Zustand.
 * Implements optimistic updates with rollback on errors and persists to AsyncStorage.
 * 
 * Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 18.3
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { UserContext, ContextCategory } from '@/types';
import { useOfflineQueue } from '@/lib/offlineQueue';

/**
 * Database row type (snake_case from Supabase)
 */
interface DbContextRow {
  id: string;
  user_id: string;
  category: ContextCategory;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Map database row to UserContext type
 */
function mapDbToContext(row: DbContextRow): UserContext {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Context store state
 */
interface ContextState {
  items: UserContext[];
  isLoading: boolean;
  error: string | null;
  lastSynced: number | null;
}

/**
 * Context store actions
 */
interface ContextActions {
  fetchContexts: (force?: boolean) => Promise<void>;
  createContext: (category: ContextCategory, content: string, optimisticId?: string) => Promise<UserContext>;
  updateContext: (id: string, content: string) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
  canAddMore: (isProUser: boolean) => boolean;
  getByCategory: (category: ContextCategory) => UserContext[];
  clearError: () => void;
  reset: () => void;
}

/**
 * Complete context store type
 */
type ContextStore = ContextState & ContextActions;

/**
 * Free tier limit for context items
 * Validates: Requirement 4.1
 */
const FREE_TIER_LIMIT = 3;

/**
 * Context Store
 * 
 * Provides context management with the following features:
 * - CRUD operations for context items
 * - Optimistic updates with rollback on errors
 * - Persistence to AsyncStorage for offline access
 * - Free tier limit enforcement
 * - Category-based filtering
 *
 * @example
 * ```typescript
 * import { useContextStore } from '@/stores/contextStore';
 * 
 * function ContextScreen() {
 *   const { items, fetchContexts, createContext, isLoading } = useContextStore();
 *   
 *   useEffect(() => {
 *     fetchContexts();
 *   }, []);
 *   
 *   const handleCreate = async () => {
 *     await createContext('values', 'I value transparency');
 *   };
 *   
 *   return (
 *     <View>
 *       {items.map(item => (
 *         <Text key={item.id}>{item.content}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export const useContextStore = create<ContextStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // State
      // ============================================================================
      
      items: [],
      isLoading: false,
      error: null,
      lastSynced: null,

      // ============================================================================
      // Actions
      // ============================================================================

      /**
       * Fetch all context items for the authenticated user
       * 
       * Validates: Requirements 3.6, 3.7, 16.2
       * 
       * Items are ordered by category first, then by creation date.
       * This ensures consistent grouping in the UI.
       * 
       * @example
       * ```typescript
       * await fetchContexts();
       * ```
       */
      fetchContexts: async (force = false) => {
        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        // Cache invalidation (24 hours)
        const lastSynced = get().lastSynced;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const isStale = !lastSynced || (Date.now() - lastSynced > ONE_DAY_MS);

        if (!isOnline) {
          if (get().items.length === 0) {
            set({
              error: "You're offline. Please check your connection.",
              isLoading: false,
            });
          }
          return;
        }

        // If not stale and not forced, don't fetch
        if (!isStale && !force) {
            return;
        }

        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase
            .from('user_context')
            .select('*')
            .order('category')
            .order('created_at');

          if (error) throw error;

          set({
            items: ((data || []) as DbContextRow[]).map(mapDbToContext),
            lastSynced: Date.now(),
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch context',
            isLoading: false,
          });
        }
      },

      /**
       * Create a new context item
       * 
       * Validates: Requirements 3.3, 3.4, 16.2
       * 
       * Implements optimistic updates: the item is added to the UI immediately
       * with a temporary ID, then replaced with the real item from the server.
       * If the request fails, the temporary item is removed (rollback).
       * 
       * @param category - The context category (values, goals, projects, constraints)
       * @param content - The context content
       * @returns The created context item
       * @throws Error if creation fails
       * 
       * @example
       * ```typescript
       * const newContext = await createContext('goals', 'Launch my startup by Q2');
       * ```
       */
      createContext: async (category, content, optimisticId) => {
        // Validate input - reject empty or whitespace-only content
        if (!content || content.trim().length === 0) {
          const error = new Error('Context content cannot be empty');
          set({ error: error.message });
          throw error;
        }

        // Validate category
        const validCategories: ContextCategory[] = ['values', 'goals', 'projects', 'constraints'];
        if (!validCategories.includes(category)) {
          const error = new Error(`Invalid category: ${category}`);
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const tempId = optimisticId || `temp-${Date.now()}`;
        const tempItem: UserContext = {
          id: tempId,
          userId: user.id,
          category,
          content: content.trim(), // Trim whitespace
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistic update - add temp item immediately
        // Only add if it doesn't exist (to prevent duplicates if called with existing optimisticId)
        set((state) => {
            if (state.items.some(i => i.id === tempId)) return state;
            return { items: [...state.items, tempItem] };
        });

        if (!isOnline) {
            // Queue for later
            useOfflineQueue.getState().enqueue('create_context', { category, content: content.trim(), optimisticId: tempId });
            return tempItem;
        }

        try {
          const { data, error } = await supabase
            .from('user_context')
            .insert({ user_id: user.id, category, content: content.trim() })
            .select()
            .single();

          if (error) throw error;

          const mappedItem = mapDbToContext(data as DbContextRow);

          // Replace temp item with real item from server
          set((state) => ({
            items: state.items.map((item) =>
              item.id === tempId ? mappedItem : item
            ),
          }));

          return mappedItem;
        } catch (error) {
          // Rollback - remove temp item on error
          set((state) => ({
            items: state.items.filter((item) => item.id !== tempId),
            error: error instanceof Error ? error.message : 'Failed to create context',
          }));
          throw error;
        }
      },

      /**
       * Update an existing context item
       * 
       * Validates: Requirements 3.5, 16.2
       *
       * Implements optimistic updates: the item is updated in the UI immediately,
       * then synced with the server. If the request fails, the previous state
       * is restored (rollback).
       * 
       * @param id - The context item ID
       * @param content - The new content
       * @throws Error if update fails
       * 
       * @example
       * ```typescript
       * await updateContext('123', 'Updated goal content');
       * ```
       */
      updateContext: async (id, content) => {
        // Validate input - reject empty or whitespace-only content
        if (!content || content.trim().length === 0) {
          const error = new Error('Context content cannot be empty');
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        const previousItems = get().items;

        // Optimistic update - update item immediately
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, content: content.trim(), updatedAt: new Date().toISOString() }
              : item
          ),
        }));

        if (!isOnline) {
            useOfflineQueue.getState().enqueue('update_context', { id, content: content.trim() });
            return;
        }

        try {
          const { error } = await supabase
            .from('user_context')
            .update({ content: content.trim() })
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          // Rollback - restore previous state on error
          set({ items: previousItems, error: 'Failed to update context' });
          throw error;
        }
      },

      /**
       * Delete a context item
       * 
       * Validates: Requirements 3.6, 16.2
       * 
       * Implements optimistic updates: the item is removed from the UI immediately,
       * then deleted from the server. If the request fails, the item is restored
       * (rollback).
       * 
       * Edge case: If the item doesn't exist locally, still attempts server deletion
       * to ensure consistency.
       * 
       * @param id - The context item ID
       * @throws Error if deletion fails
       * 
       * @example
       * ```typescript
       * await deleteContext('123');
       * ```
       */
      deleteContext: async (id) => {
        // Validate id
        if (!id || id.trim().length === 0) {
          const error = new Error('Context ID cannot be empty');
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        const previousItems = get().items;

        // Optimistic update - remove item immediately
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        if (!isOnline) {
            useOfflineQueue.getState().enqueue('delete_context', { id });
            return;
        }

        try {
          const { error } = await supabase
            .from('user_context')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          // Rollback - restore item on error
          set({ items: previousItems, error: 'Failed to delete context' });
          throw error;
        }
      },

      /**
       * Check if user can add more context items
       * 
       * Validates: Requirements 4.1, 4.2
       * 
       * Free tier users are limited to 3 context items total.
       * Pro users have unlimited context items.
       * 
       * @param isProUser - Whether the user has Pro subscription
       * @returns true if user can add more items, false otherwise
       * 
       * @example
       * ```typescript
       * const canAdd = canAddMore(isProUser);
       * if (!canAdd) {
       *   showUpgradePrompt();
       * }
       * ```
       */
      canAddMore: (isProUser) => {
        if (isProUser) return true;
        return get().items.length < FREE_TIER_LIMIT;
      },

      /**
       * Get context items filtered by category
       * 
       * Validates: Requirements 3.2, 3.7
       * 
       * @param category - The category to filter by
       * @returns Array of context items in the specified category
       * 
       * @example
       * ```typescript
       * const values = getByCategory('values');
       * const goals = getByCategory('goals');
       * ```
       */
      getByCategory: (category) => {
        return get().items.filter((item) => item.category === category);
      },

      /**
       * Clear error state
       * 
       * Useful for dismissing error messages in the UI.
       * 
       * @example
       * ```typescript
       * const { error, clearError } = useContextStore();
       * 
       * return (
       *   <View>
       *     {error && (
       *       <Alert>
       *         {error}
       *         <Button onPress={clearError}>Dismiss</Button>
       *       </Alert>
       *     )}
       *   </View>
       * );
       * ```
       */
      clearError: () => set({ error: null }),

      /**
       * Reset store to initial state
       * 
       * Useful for logout or testing scenarios.
       * 
       * @example
       * ```typescript
       * // On logout
       * reset();
       * ```
       */
      reset: () => {
        // Clear persisted storage first (synchronously start the operation)
        AsyncStorage.removeItem('north-context-storage')?.catch((error) => {
          console.error('[ContextStore] Error clearing storage:', error);
        });
        // Then set state to initial values
        set({ items: [], isLoading: false, error: null, lastSynced: null });
      },
    }),
    {
      name: 'north-context-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist items and lastSynced, not loading/error states
      partialize: (state) => ({
        items: state.items,
        lastSynced: state.lastSynced,
      }),
    }
  )
);

/**
 * Helper hook to get context items by category
 * 
 * @param category - The category to filter by
 * @returns Array of context items in the specified category
 * 
 * @example
 * ```typescript
 * function ValuesSection() {
 *   const values = useContextByCategory('values');
 *   
 *   return (
 *     <View>
 *       {values.map(value => (
 *         <Text key={value.id}>{value.content}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useContextByCategory(category: ContextCategory): UserContext[] {
  return useContextStore((state) => state.getByCategory(category));
}

/**
 * Helper hook to check if user can add more context items
 * 
 * @param isProUser - Whether the user has Pro subscription
 * @returns true if user can add more items, false otherwise
 * 
 * @example
 * ```typescript
 * function AddContextButton({ isProUser }: { isProUser: boolean }) {
 *   const canAdd = useCanAddContext(isProUser);
 *   
 *   const handlePress = () => {
 *     if (!canAdd) {
 *       showUpgradePrompt();
 *       return;
 *     }
 *     showCreateModal();
 *   };
 *   
 *   return <Button onPress={handlePress}>Add Context</Button>;
 * }
 * ```
 */
export function useCanAddContext(isProUser: boolean): boolean {
  return useContextStore((state) => state.canAddMore(isProUser));
}

/**
 * Helper hook to get context count
 * 
 * @returns The total number of context items
 * 
 * @example
 * ```typescript
 * function ContextHeader() {
 *   const count = useContextCount();
 *   
 *   return <Text>{count} context items</Text>;
 * }
 * ```
 */
export function useContextCount(): number {
  return useContextStore((state) => state.items.length);
}
