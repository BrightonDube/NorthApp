/**
 * Context Store
 * 
 * Manages user context items (values, goals, projects, constraints) and file attachments using Zustand.
 * Implements optimistic updates with rollback on errors and persists to AsyncStorage.
 * 
 * Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 18.3
 * File Attachments: Requirements 2.5, 3.2, 3.3, 3.5, 5.3, 5.4, 7.1, 10.1
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { UserContext, ContextCategory } from '@/types';
import type { FileAttachment, FileAttachmentInsert, SessionFileSelection } from '@/lib/database.types';
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
 * File metadata for creating file attachments
 */
interface FileMetadata {
  filename: string;
  fileType: 'pdf' | 'txt' | 'md';
  fileSize: number;
  uploadDate: Date;
}

/**
 * Storage usage information
 */
interface StorageUsage {
  usedBytes: number;
  totalBytes: number;
  percentageUsed: number;
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
  
  // File attachment methods
  addFileAttachment: (userId: string, metadata: FileMetadata, content: string, storageUrl: string, storagePath: string) => Promise<FileAttachment>;
  getFileAttachments: (userId: string) => Promise<FileAttachment[]>;
  deleteFileAttachment: (userId: string, fileId: string) => Promise<void>;
  updateFileName: (userId: string, fileId: string, newName: string) => Promise<void>;
  getStorageUsage: (userId: string) => Promise<StorageUsage>;
  setSessionFiles: (sessionId: string, fileIds: string[]) => Promise<void>;
  getSessionFiles: (sessionId: string) => Promise<FileAttachment[]>;
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

      // ============================================================================
      // File Attachment Methods
      // ============================================================================

      /**
       * Add a file attachment to user's context
       * 
       * Validates: Requirements 2.5, 3.2, 3.3, 3.5, 10.1, 10.2, 10.3, 6.1, 6.2
       * 
       * Stores file metadata and extracted content in the database.
       * Links the file to the user's account.
       * Enforces storage quota limits and provides warnings.
       * Verifies user authentication and authorization.
       * 
       * @param userId - The user ID
       * @param metadata - File metadata (filename, type, size, upload date)
       * @param content - Extracted text content from the file
       * @param storageUrl - URL to access the file in storage
       * @param storagePath - Path where file is stored
       * @returns The created file attachment record
       * @throws Error if creation fails, quota exceeded, or user not authenticated
       * 
       * @example
       * ```typescript
       * const attachment = await addFileAttachment(
       *   userId,
       *   { filename: 'resume.pdf', fileType: 'pdf', fileSize: 1024000, uploadDate: new Date() },
       *   'Extracted text content...',
       *   'https://storage.url/file.pdf',
       *   'user-id/file-id.pdf'
       * );
       * ```
       */
      addFileAttachment: async (userId, metadata, content, storageUrl, storagePath) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to add file attachments');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated file attachment attempt');
            throw error;
          }
          
          // Verify the authenticated user matches the provided userId (Requirement 6.2)
          if (user.id !== userId) {
            const error = new Error('You can only add files to your own account');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'unauthorized_access_attempt',
              userId: user.id,
              targetUserId: userId,
              operation: 'addFileAttachment',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to add file for user ${userId}`,
            });
            throw error;
          }
          
          // Check storage quota before upload
          const currentUsage = await get().getStorageUsage(userId);
          const newTotalBytes = currentUsage.usedBytes + metadata.fileSize;
          const newPercentageUsed = Math.round((newTotalBytes / currentUsage.totalBytes) * 100);

          // Enforce 100% quota limit (Requirement 10.3)
          if (newTotalBytes > currentUsage.totalBytes) {
            const remainingBytes = currentUsage.totalBytes - currentUsage.usedBytes;
            const remainingMB = (remainingBytes / (1024 * 1024)).toFixed(2);
            const error = new Error(
              `Storage quota exceeded. You have ${remainingMB} MB remaining. Please delete files to free up space.`
            );
            set({ error: error.message });
            throw error;
          }

          // Insert file attachment
          const insertData: FileAttachmentInsert = {
            user_id: userId,
            filename: metadata.filename,
            file_type: metadata.fileType,
            file_size: metadata.fileSize,
            upload_date: metadata.uploadDate.toISOString(),
            storage_path: storagePath,
            storage_url: storageUrl,
            extracted_content: content,
            extraction_success: content !== null && content.length > 0,
            extraction_error: null,
          };

          const { data, error } = await supabase
            .from('file_attachments')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;

          // Check for 80% quota warning (Requirement 10.2)
          if (newPercentageUsed >= 80 && currentUsage.percentageUsed < 80) {
            const warningMessage = `Warning: You are now using ${newPercentageUsed}% of your storage quota.`;
            console.warn('[ContextStore]', warningMessage);
            // Note: The UI layer should display this warning to the user
            // by checking the storage usage after upload
          }

          return data as FileAttachment;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add file attachment';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Get all file attachments for a user
       * 
       * Validates: Requirements 3.2, 5.1, 6.1, 6.2
       * 
       * Retrieves all files uploaded by the user, ordered by upload date (newest first).
       * Verifies user authentication and authorization.
       * 
       * @param userId - The user ID
       * @returns Array of file attachments
       * @throws Error if fetch fails or user not authenticated
       * 
       * @example
       * ```typescript
       * const files = await getFileAttachments(userId);
       * files.forEach(file => console.log(file.filename));
       * ```
       */
      getFileAttachments: async (userId) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to access file attachments');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated file access attempt');
            throw error;
          }
          
          // Verify the authenticated user matches the provided userId (Requirement 6.2)
          if (user.id !== userId) {
            const error = new Error('You can only access your own files');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'unauthorized_access_attempt',
              userId: user.id,
              targetUserId: userId,
              operation: 'getFileAttachments',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to access files for user ${userId}`,
            });
            throw error;
          }
          
          const { data, error } = await supabase
            .from('file_attachments')
            .select('*')
            .eq('user_id', userId)
            .order('upload_date', { ascending: false });

          if (error) throw error;

          return (data || []) as FileAttachment[];
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch file attachments';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Delete a file attachment
       * 
       * Validates: Requirements 5.3, 10.5, 6.1, 6.2, 6.5
       * 
       * Removes the file metadata from the database. The caller is responsible
       * for also deleting the file from storage.
       * Verifies user authentication and file ownership.
       * 
       * @param userId - The user ID (for authorization)
       * @param fileId - The file attachment ID
       * @throws Error if deletion fails, user not authenticated, or user doesn't own the file
       * 
       * @example
       * ```typescript
       * await deleteFileAttachment(userId, fileId);
       * ```
       */
      deleteFileAttachment: async (userId, fileId) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to delete file attachments');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated file deletion attempt');
            throw error;
          }
          
          // Verify the authenticated user matches the provided userId (Requirement 6.2)
          if (user.id !== userId) {
            const error = new Error('You can only delete your own files');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'unauthorized_access_attempt',
              userId: user.id,
              targetUserId: userId,
              fileId,
              operation: 'deleteFileAttachment',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to delete file ${fileId} for user ${userId}`,
            });
            throw error;
          }
          
          // Verify file ownership before deletion (Requirement 6.5)
          const { data: fileData, error: ownershipError } = await supabase
            .from('file_attachments')
            .select('user_id')
            .eq('id', fileId)
            .single();
          
          if (ownershipError || !fileData) {
            throw new Error('File not found');
          }
          
          if (fileData.user_id !== user.id) {
            const error = new Error('You do not have permission to delete this file');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'file_ownership_violation',
              userId: user.id,
              fileId,
              ownerId: fileData.user_id,
              operation: 'deleteFileAttachment',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to delete file ${fileId} owned by ${fileData.user_id}`,
            });
            throw error;
          }
          
          const { error } = await supabase
            .from('file_attachments')
            .delete()
            .eq('id', fileId)
            .eq('user_id', userId); // Ensure user owns the file

          if (error) throw error;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete file attachment';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Update a file's name
       * 
       * Validates: Requirements 5.4, 6.1, 6.2, 6.5
       * 
       * Renames a file attachment. Only the filename metadata is updated;
       * the actual file in storage is not renamed.
       * Verifies user authentication and file ownership.
       * 
       * @param userId - The user ID (for authorization)
       * @param fileId - The file attachment ID
       * @param newName - The new filename
       * @throws Error if update fails, user not authenticated, or user doesn't own the file
       * 
       * @example
       * ```typescript
       * await updateFileName(userId, fileId, 'new-name.pdf');
       * ```
       */
      updateFileName: async (userId, fileId, newName) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to update file names');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated file update attempt');
            throw error;
          }
          
          // Verify the authenticated user matches the provided userId (Requirement 6.2)
          if (user.id !== userId) {
            const error = new Error('You can only update your own files');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'unauthorized_access_attempt',
              userId: user.id,
              targetUserId: userId,
              fileId,
              operation: 'updateFileName',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to update file ${fileId} for user ${userId}`,
            });
            throw error;
          }
          
          // Verify file ownership before update (Requirement 6.5)
          const { data: fileData, error: ownershipError } = await supabase
            .from('file_attachments')
            .select('user_id')
            .eq('id', fileId)
            .single();
          
          if (ownershipError || !fileData) {
            throw new Error('File not found');
          }
          
          if (fileData.user_id !== user.id) {
            const error = new Error('You do not have permission to update this file');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'file_ownership_violation',
              userId: user.id,
              fileId,
              ownerId: fileData.user_id,
              operation: 'updateFileName',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to update file ${fileId} owned by ${fileData.user_id}`,
            });
            throw error;
          }
          
          const { error } = await supabase
            .from('file_attachments')
            .update({ filename: newName, updated_at: new Date().toISOString() })
            .eq('id', fileId)
            .eq('user_id', userId); // Ensure user owns the file

          if (error) throw error;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update filename';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Get storage usage for a user
       * 
       * Validates: Requirements 10.1, 10.4, 6.1, 6.2
       * 
       * Calculates total storage used by summing all file sizes.
       * Returns usage in bytes and as a percentage of the quota.
       * Verifies user authentication and authorization.
       * 
       * @param userId - The user ID
       * @returns Storage usage information
       * @throws Error if calculation fails or user not authenticated
       * 
       * @example
       * ```typescript
       * const usage = await getStorageUsage(userId);
       * console.log(`Used: ${usage.usedBytes} bytes (${usage.percentageUsed}%)`);
       * ```
       */
      getStorageUsage: async (userId) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to access storage usage');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated storage usage access attempt');
            throw error;
          }
          
          // Verify the authenticated user matches the provided userId (Requirement 6.2)
          if (user.id !== userId) {
            const error = new Error('You can only access your own storage usage');
            set({ error: error.message });
            console.warn('[SECURITY EVENT]', {
              type: 'unauthorized_access_attempt',
              userId: user.id,
              targetUserId: userId,
              operation: 'getStorageUsage',
              timestamp: new Date().toISOString(),
              message: `User ${user.id} attempted to access storage usage for user ${userId}`,
            });
            throw error;
          }
          
          const { data, error } = await supabase
            .from('file_attachments')
            .select('file_size')
            .eq('user_id', userId);

          if (error) throw error;

          const usedBytes = (data || []).reduce((sum, file) => sum + file.file_size, 0);
          const totalBytes = 100 * 1024 * 1024; // 100MB quota
          const percentageUsed = Math.round((usedBytes / totalBytes) * 100);

          return {
            usedBytes,
            totalBytes,
            percentageUsed,
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to calculate storage usage';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Set session-specific file selections
       * 
       * Validates: Requirements 7.1, 7.4, 6.1
       * 
       * Associates specific files with a chat session. Only these files
       * will be included in context injection for that session.
       * Verifies user authentication.
       * 
       * @param sessionId - The chat session ID
       * @param fileIds - Array of file attachment IDs to include
       * @throws Error if operation fails or user not authenticated
       * 
       * @example
       * ```typescript
       * await setSessionFiles(sessionId, [fileId1, fileId2]);
       * ```
       */
      setSessionFiles: async (sessionId, fileIds) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to set session files');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated session file selection attempt');
            throw error;
          }
          
          // First, delete existing selections for this session
          const { error: deleteError } = await supabase
            .from('session_file_selections')
            .delete()
            .eq('session_id', sessionId);

          if (deleteError) throw deleteError;

          // Then, insert new selections
          if (fileIds.length > 0) {
            const insertData = fileIds.map(fileId => ({
              session_id: sessionId,
              file_id: fileId,
            }));

            const { error: insertError } = await supabase
              .from('session_file_selections')
              .insert(insertData);

            if (insertError) throw insertError;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to set session files';
          set({ error: errorMessage });
          throw error;
        }
      },

      /**
       * Get files selected for a specific session
       * 
       * Validates: Requirements 7.2, 7.3, 6.1
       * 
       * Retrieves file attachments that have been selected for a specific session.
       * If no files are selected for the session, returns an empty array
       * (the caller should then use all user files as default).
       * Verifies user authentication.
       * 
       * @param sessionId - The chat session ID
       * @returns Array of file attachments selected for the session
       * @throws Error if fetch fails or user not authenticated
       * 
       * @example
       * ```typescript
       * const sessionFiles = await getSessionFiles(sessionId);
       * if (sessionFiles.length === 0) {
       *   // Use all user files as default
       *   sessionFiles = await getFileAttachments(userId);
       * }
       * ```
       */
      getSessionFiles: async (sessionId) => {
        try {
          // Verify user authentication (Requirement 6.1)
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          
          if (authError || !user) {
            const error = new Error('Authentication required to access session files');
            set({ error: error.message });
            console.warn('[SECURITY EVENT] Unauthenticated session file access attempt');
            throw error;
          }
          
          const { data, error } = await supabase
            .from('session_file_selections')
            .select(`
              file_id,
              file_attachments (*)
            `)
            .eq('session_id', sessionId);

          if (error) throw error;

          // Extract file attachments from the join result
          const files = (data || [])
            .map((selection: any) => selection.file_attachments)
            .filter((file: any) => file !== null) as FileAttachment[];

          return files;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to get session files';
          set({ error: errorMessage });
          throw error;
        }
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
