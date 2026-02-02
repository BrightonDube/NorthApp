/**
 * Coach Store
 * 
 * Manages coaches (both default and user-created) using Zustand.
 * Implements optimistic updates with rollback on errors and persists to AsyncStorage.
 * 
 * Validates: Requirements 6.2-6.7, 7.1-7.7, 18.4
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { Coach } from '@/types';
import { useOfflineQueue } from '@/lib/offlineQueue';

/**
 * Database row type (snake_case from Supabase)
 */
interface DbCoachRow {
  id: string;
  name: string;
  icon: string;
  system_prompt: string;
  creator_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Map database row to Coach type
 */
function mapDbToCoach(row: DbCoachRow): Coach {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    systemPrompt: row.system_prompt,
    creatorId: row.creator_id,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Coach store state
 */
interface CoachState {
  coaches: Coach[];
  isLoading: boolean;
  error: string | null;
  lastSynced: number | null;
}

/**
 * Coach store actions
 */
interface CoachActions {
  fetchCoaches: (force?: boolean) => Promise<void>;
  createCoach: (name: string, icon: string, systemPrompt: string, optimisticId?: string) => Promise<Coach>;
  updateCoach: (id: string, updates: Partial<Omit<Coach, 'id' | 'creatorId' | 'isPublic' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteCoach: (id: string) => Promise<void>;
  canCreateCoach: (isProUser: boolean) => boolean;
  getDefaultCoaches: () => Coach[];
  getUserCoaches: (userId: string) => Coach[];
  getCoachById: (id: string) => Coach | undefined;
  clearError: () => void;
  reset: () => void;
}

/**
 * Complete coach store type
 */
type CoachStore = CoachState & CoachActions;

/**
 * Coach Store
 * 
 * Provides coach management with the following features:
 * - CRUD operations for coaches
 * - Optimistic updates with rollback on errors
 * - Persistence to AsyncStorage for offline access
 * - Pro tier requirement for coach creation
 * - Filtering for default vs user coaches
 * 
 * @example
 * ```typescript
 * import { useCoachStore } from '@/stores/coachStore';
 * 
 * function CoachList() {
 *   const { coaches, fetchCoaches, isLoading } = useCoachStore();
 *   
 *   useEffect(() => {
 *     fetchCoaches();
 *   }, []);
 *   
 *   return (
 *     <View>
 *       {coaches.map(coach => (
 *         <Text key={coach.id}>{coach.name}</Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export const useCoachStore = create<CoachStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // State
      // ============================================================================
      
      coaches: [],
      isLoading: false,
      error: null,
      lastSynced: null,

      // ============================================================================
      // Actions
      // ============================================================================

      /**
       * Fetch all coaches available to the authenticated user
       * 
       * Validates: Requirements 6.2, 6.3, 16.2
       * 
       * Fetches:
       * - All default coaches (creator_id IS NULL)
       * - User's private coaches (creator_id = current user)
       * 
       * Coaches are ordered by name for consistent display.
       * 
       * @example
       * ```typescript
       * await fetchCoaches();
       * ```
       */
      fetchCoaches: async (force = false) => {
        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        // Cache invalidation (24 hours)
        const lastSynced = get().lastSynced;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const isStale = !lastSynced || (Date.now() - lastSynced > ONE_DAY_MS);

        if (!isOnline) {
          if (get().coaches.length === 0) {
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
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Fetch default coaches (creator_id IS NULL) and user's private coaches
          const { data, error } = await supabase
            .from('coaches')
            .select('*')
            .or(`creator_id.is.null,creator_id.eq.${user.id}`)
            .order('name');

          if (error) throw error;

          set({
            coaches: ((data || []) as DbCoachRow[]).map(mapDbToCoach),
            lastSynced: Date.now(),
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch coaches',
            isLoading: false,
          });
        }
      },

      /**
       * Create a new private coach
       *
       * Validates: Requirements 6.4, 6.5, 7.2, 16.2
       * 
       * Implements optimistic updates: the coach is added to the UI immediately
       * with a temporary ID, then replaced with the real coach from the server.
       * If the request fails, the temporary coach is removed (rollback).
       * 
       * Only Pro users can create coaches.
       * 
       * @param name - The coach's display name
       * @param icon - The coach's icon (emoji or icon identifier)
       * @param systemPrompt - The coach's role definition
       * @returns The created coach
       * @throws Error if creation fails
       * 
       * @example
       * ```typescript
       * const newCoach = await createCoach(
       *   'My Coach',
       *   '🚀',
       *   'You are a helpful coach...'
       * );
       * ```
       */
      createCoach: async (name, icon, systemPrompt, optimisticId) => {
        // Validate inputs
        if (!name || name.trim().length === 0) {
          const error = new Error('Coach name cannot be empty');
          set({ error: error.message });
          throw error;
        }
        
        if (!systemPrompt || systemPrompt.trim().length === 0) {
          const error = new Error('System prompt cannot be empty');
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();

        const tempId = optimisticId || `temp-${Date.now()}`;
        const tempCoach: Coach = {
          id: tempId,
          name,
          icon,
          systemPrompt,
          creatorId: '',
          isPublic: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistic update - add temp coach immediately
        set((state) => {
            if (state.coaches.some(c => c.id === tempId)) return state;
            return { coaches: [...state.coaches, tempCoach] };
        });

        if (!isOnline) {
             useOfflineQueue.getState().enqueue('create_coach', { name, icon, systemPrompt, optimisticId: tempId });
             return tempCoach;
        }

        try {
          const { data, error } = await supabase
            .from('coaches')
            .insert({ 
              name, 
              icon, 
              system_prompt: systemPrompt, 
              is_public: false 
            })
            .select()
            .single();

          if (error) throw error;

          const mappedCoach = mapDbToCoach(data as DbCoachRow);

          // Replace temp coach with real coach from server
          set((state) => ({
            coaches: state.coaches.map((coach) =>
              coach.id === tempId ? mappedCoach : coach
            ),
          }));

          return mappedCoach;
        } catch (error) {
          // Rollback - remove temp coach on error
          set((state) => ({
            coaches: state.coaches.filter((coach) => coach.id !== tempId),
            error: error instanceof Error ? error.message : 'Failed to create coach',
          }));
          throw error;
        }
      },

      /**
       * Update an existing private coach
       * 
       * Validates: Requirements 7.6, 16.2
       * 
       * Implements optimistic updates: the coach is updated in the UI immediately,
       * then synced with the server. If the request fails, the previous state
       * is restored (rollback).
       * 
       * Only the coach creator can update their coaches.
       * Default coaches cannot be updated.
       * 
       * @param id - The coach ID
       * @param updates - Partial coach updates (name, icon, systemPrompt)
       * @throws Error if update fails
       * 
       * @example
       * ```typescript
       * await updateCoach('123', { 
       *   name: 'Updated Coach Name',
       *   systemPrompt: 'New system prompt...'
       * });
       * ```
       */
      updateCoach: async (id, updates) => {
        // Check if trying to update a default coach
        const coach = get().coaches.find(c => c.id === id);
        if (coach && coach.creatorId === null) {
          const error = new Error('Cannot update default coach');
          set({ error: error.message });
          throw error;
        }

        // Validate inputs
        if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
          const error = new Error('Coach name cannot be empty');
          set({ error: error.message });
          throw error;
        }
        
        if (updates.systemPrompt !== undefined && (!updates.systemPrompt || updates.systemPrompt.trim().length === 0)) {
          const error = new Error('System prompt cannot be empty');
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        const previousCoaches = get().coaches;

        // Optimistic update - update coach immediately
        set((state) => ({
          coaches: state.coaches.map((coach) =>
            coach.id === id
              ? { ...coach, ...updates, updatedAt: new Date().toISOString() }
              : coach
          ),
        }));

        if (!isOnline) {
            useOfflineQueue.getState().enqueue('update_coach', { id, updates });
            return;
        }

        try {
          // Convert camelCase to snake_case for database
          const dbUpdates: any = {};
          if (updates.name !== undefined) dbUpdates.name = updates.name;
          if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
          if (updates.systemPrompt !== undefined) dbUpdates.system_prompt = updates.systemPrompt;

          const { error } = await supabase
            .from('coaches')
            .update(dbUpdates)
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          // Rollback - restore previous state on error
          set({ coaches: previousCoaches, error: 'Failed to update coach' });
          throw error;
        }
      },

      /**
       * Delete a private coach
       * 
       * Validates: Requirements 7.7, 16.2
       * 
       * Implements optimistic updates: the coach is removed from the UI immediately,
       * then deleted from the server. If the request fails, the coach is restored
       * (rollback).
       * 
       * Only the coach creator can delete their coaches.
       * Default coaches cannot be deleted.
       * 
       * @param id - The coach ID
       * @throws Error if deletion fails
       * 
       * @example
       * ```typescript
       * await deleteCoach('123');
       * ```
       */
      deleteCoach: async (id) => {
        // Check if trying to delete a default coach
        const coach = get().coaches.find(c => c.id === id);
        if (coach && coach.creatorId === null) {
          const error = new Error('Cannot delete default coach');
          set({ error: error.message });
          throw error;
        }

        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        
        const previousCoaches = get().coaches;

        // Optimistic update - remove coach immediately
        set((state) => ({
          coaches: state.coaches.filter((coach) => coach.id !== id),
        }));

        if (!isOnline) {
            useOfflineQueue.getState().enqueue('delete_coach', { id });
            return;
        }

        try {
          const { error } = await supabase
            .from('coaches')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (error) {
          // Rollback - restore coach on error
          set({ coaches: previousCoaches, error: 'Failed to delete coach' });
          throw error;
        }
      },

      /**
       * Check if user can create coaches
       * 
       * Validates: Requirements 6.4, 7.1
       * 
       * Only Pro users can create custom coaches.
       * Free users can only use default coaches.
       * 
       * @param isProUser - Whether the user has Pro subscription
       * @returns true if user can create coaches, false otherwise
       * 
       * @example
       * ```typescript
       * const canCreate = canCreateCoach(isProUser);
       * if (!canCreate) {
       *   showUpgradePrompt();
       * }
       * ```
       */
      canCreateCoach: (isProUser) => isProUser,

      /**
       * Get all default coaches
       * 
       * Validates: Requirements 6.2
       * 
       * Default coaches have creator_id = null and are available to all users.
       * 
       * @returns Array of default coaches
       * 
       * @example
       * ```typescript
       * const defaultCoaches = getDefaultCoaches();
       * ```
       */
      getDefaultCoaches: () => {
        return get().coaches.filter((coach) => coach.creatorId === null);
      },

      /**
       * Get user's private coaches
       * 
       * Validates: Requirements 6.6, 7.3
       * 
       * Private coaches have creator_id = user ID and are only visible to their creator.
       * 
       * @param userId - The user ID to filter by
       * @returns Array of user's private coaches
       * 
       * @example
       * ```typescript
       * const myCoaches = getUserCoaches(currentUser.id);
       * ```
       */
      getUserCoaches: (userId) => {
        return get().coaches.filter((coach) => coach.creatorId === userId);
      },

      /**
       * Get a specific coach by ID
       * 
       * Validates: Requirements 6.1
       * 
       * @param id - The coach ID
       * @returns The coach if found, undefined otherwise
       * 
       * @example
       * ```typescript
       * const coach = getCoachById('123');
       * if (coach) {
       *   console.log(coach.name);
       * }
       * ```
       */
      getCoachById: (id) => {
        return get().coaches.find((coach) => coach.id === id);
      },

      /**
       * Clear error state
       * 
       * Useful for dismissing error messages in the UI.
       * 
       * @example
       * ```typescript
       * const { error, clearError } = useCoachStore();
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
        AsyncStorage.removeItem('north-coach-storage')?.catch((error) => {
          console.error('[CoachStore] Error clearing storage:', error);
        });
        // Then set state to initial values
        set({ coaches: [], isLoading: false, error: null, lastSynced: null });
      },
    }),
    {
      name: 'north-coach-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist coaches and lastSynced, not loading/error states
      partialize: (state) => ({
        coaches: state.coaches,
        lastSynced: state.lastSynced,
      }),
    }
  )
);

/**
 * Helper hook to get default coaches
 * 
 * @returns Array of default coaches
 * 
 * @example
 * ```typescript
 * function DefaultCoachesSection() {
 *   const defaultCoaches = useDefaultCoaches();
 *   
 *   return (
 *     <View>
 *       {defaultCoaches.map(coach => (
 *         <CoachCard key={coach.id} coach={coach} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useDefaultCoaches(): Coach[] {
  return useCoachStore((state) => state.getDefaultCoaches());
}

/**
 * Helper hook to get user's private coaches
 * 
 * @param userId - The user ID to filter by
 * @returns Array of user's private coaches
 * 
 * @example
 * ```typescript
 * function MyCoachesSection({ userId }: { userId: string }) {
 *   const myCoaches = useUserCoaches(userId);
 *   
 *   return (
 *     <View>
 *       {myCoaches.map(coach => (
 *         <CoachCard key={coach.id} coach={coach} />
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUserCoaches(userId: string): Coach[] {
  return useCoachStore((state) => state.getUserCoaches(userId));
}

/**
 * Helper hook to check if user can create coaches
 * 
 * @param isProUser - Whether the user has Pro subscription
 * @returns true if user can create coaches, false otherwise
 * 
 * @example
 * ```typescript
 * function CreateCoachButton({ isProUser }: { isProUser: boolean }) {
 *   const canCreate = useCanCreateCoach(isProUser);
 *   
 *   const handlePress = () => {
 *     if (!canCreate) {
 *       showUpgradePrompt();
 *       return;
 *     }
 *     showCreateModal();
 *   };
 *   
 *   return <Button onPress={handlePress}>Create Coach</Button>;
 * }
 * ```
 */
export function useCanCreateCoach(isProUser: boolean): boolean {
  return useCoachStore((state) => state.canCreateCoach(isProUser));
}

/**
 * Helper hook to get a specific coach by ID
 * 
 * @param id - The coach ID
 * @returns The coach if found, undefined otherwise
 * 
 * @example
 * ```typescript
 * function CoachDetail({ coachId }: { coachId: string }) {
 *   const coach = useCoachById(coachId);
 *   
 *   if (!coach) return <Text>Coach not found</Text>;
 *   
 *   return <Text>{coach.name}</Text>;
 * }
 * ```
 */
export function useCoachById(id: string): Coach | undefined {
  return useCoachStore((state) => state.getCoachById(id));
}

/**
 * Helper hook to get coach count
 * 
 * @returns The total number of coaches
 * 
 * @example
 * ```typescript
 * function CoachHeader() {
 *   const count = useCoachCount();
 *   
 *   return <Text>{count} coaches available</Text>;
 * }
 * ```
 */
export function useCoachCount(): number {
  return useCoachStore((state) => state.coaches.length);
}
