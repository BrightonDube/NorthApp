/**
 * Storage Service
 * 
 * This module provides file storage operations using Supabase Storage.
 * Handles file uploads, deletions, URL generation, and storage usage tracking.
 * 
 * Validates: Requirements 1.3, 3.1, 3.4, 5.3, 6.3
 */

import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of a file upload operation
 */
export type StorageResult = {
  fileId: string;
  url: string;
  path: string;
};

/**
 * File data for upload
 */
export interface FileUpload {
  name: string;
  data: Blob | Buffer | Uint8Array;
  type?: string;
}

/**
 * Storage bucket name for user context files
 */
const STORAGE_BUCKET = 'user-context-files';

/**
 * Signed URL expiration time in seconds (1 hour)
 */
const SIGNED_URL_EXPIRATION = 3600; // 1 hour

/**
 * StorageService class provides methods for file storage operations
 * 
 * Features:
 * - Upload files to user-specific storage paths
 * - Generate signed URLs with expiration
 * - Delete files from storage
 * - Calculate user storage usage
 * - Enforce user-specific access control
 * 
 * Usage:
 * ```typescript
 * const storage = new StorageService();
 * 
 * // Upload a file
 * const result = await storage.uploadFile(userId, file);
 * console.log('File uploaded:', result.fileId);
 * 
 * // Get a signed URL
 * const url = await storage.getFileUrl(userId, fileId);
 * console.log('Download URL:', url);
 * 
 * // Delete a file
 * await storage.deleteFile(userId, fileId);
 * 
 * // Get storage usage
 * const usage = await storage.getUserStorageUsage(userId);
 * console.log('Storage used:', usage, 'bytes');
 * ```
 */
export class StorageService {
  /**
   * Uploads a file to Supabase Storage in a user-specific path
   * 
   * Files are stored using the path format: {user_id}/{file_id}.{extension}
   * This ensures user-specific storage isolation and unique file identifiers.
   * 
   * @param userId - The user's unique identifier
   * @param file - File data to upload
   * @returns Promise<StorageResult> containing file ID, URL, and storage path
   * @throws Error if upload fails
   * 
   * Validates: Requirements 1.3, 3.1, 3.4
   * 
   * @example
   * ```typescript
   * const result = await storage.uploadFile(userId, {
   *   name: 'document.pdf',
   *   data: fileBuffer,
   *   type: 'application/pdf'
   * });
   * console.log('File ID:', result.fileId);
   * console.log('Storage path:', result.path);
   * ```
   */
  async uploadFile(userId: string, file: FileUpload): Promise<StorageResult> {
    try {
      // Generate a unique file ID
      const fileId = uuidv4();
      
      // Extract file extension from filename
      const extension = this.getFileExtension(file.name);
      if (!extension) {
        throw new Error('File must have an extension');
      }
      
      // Construct user-specific storage path: {user_id}/{file_id}.{extension}
      const path = `${userId}/${fileId}.${extension}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file.data, {
          contentType: file.type,
          upsert: false, // Don't overwrite existing files
        });
      
      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Upload succeeded but no data returned');
      }
      
      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      
      return {
        fileId,
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`File upload failed: ${error.message}`);
      }
      throw new Error('File upload failed: Unknown error');
    }
  }
  
  /**
   * Deletes a file from Supabase Storage
   * 
   * Removes the file from the user's storage path. This operation is permanent
   * and cannot be undone.
   * 
   * @param userId - The user's unique identifier
   * @param fileId - The unique file identifier
   * @returns Promise<void>
   * @throws Error if deletion fails
   * 
   * Validates: Requirements 5.3
   * 
   * @example
   * ```typescript
   * await storage.deleteFile(userId, fileId);
   * console.log('File deleted successfully');
   * ```
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    try {
      // First, get the file path from the database to know the extension
      const { data: fileData, error: queryError } = await supabase
        .from('file_attachments')
        .select('storage_path')
        .eq('user_id', userId)
        .eq('id', fileId)
        .single();
      
      if (queryError) {
        console.error('Error querying file:', queryError);
        throw new Error(`Failed to find file: ${queryError.message}`);
      }
      
      if (!fileData) {
        throw new Error('File not found');
      }
      
      // Delete the file from storage
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([fileData.storage_path]);
      
      if (error) {
        console.error('Storage deletion error:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`File deletion failed: ${error.message}`);
      }
      throw new Error('File deletion failed: Unknown error');
    }
  }
  
  /**
   * Generates a signed URL for accessing a file with time-limited access
   * 
   * Creates a temporary URL that expires after a fixed time period (1 hour).
   * This ensures secure, time-limited access to files.
   * 
   * @param userId - The user's unique identifier
   * @param fileId - The unique file identifier
   * @returns Promise<string> containing the signed URL
   * @throws Error if URL generation fails
   * 
   * Validates: Requirements 6.3
   * 
   * @example
   * ```typescript
   * const url = await storage.getFileUrl(userId, fileId);
   * console.log('Download URL (expires in 1 hour):', url);
   * ```
   */
  async getFileUrl(userId: string, fileId: string): Promise<string> {
    try {
      // Get the file path from the database
      const { data: fileData, error: queryError } = await supabase
        .from('file_attachments')
        .select('storage_path')
        .eq('user_id', userId)
        .eq('id', fileId)
        .single();
      
      if (queryError) {
        console.error('Error querying file:', queryError);
        throw new Error(`Failed to find file: ${queryError.message}`);
      }
      
      if (!fileData) {
        throw new Error('File not found');
      }
      
      // Generate a signed URL with expiration
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(fileData.storage_path, SIGNED_URL_EXPIRATION);
      
      if (error) {
        console.error('Error generating signed URL:', error);
        throw new Error(`Failed to generate file URL: ${error.message}`);
      }
      
      if (!data || !data.signedUrl) {
        throw new Error('Failed to generate signed URL');
      }
      
      return data.signedUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`URL generation failed: ${error.message}`);
      }
      throw new Error('URL generation failed: Unknown error');
    }
  }
  
  /**
   * Calculates the total storage usage for a user
   * 
   * Sums up the file sizes of all files belonging to the user.
   * This is used for quota enforcement and display.
   * 
   * @param userId - The user's unique identifier
   * @returns Promise<number> total storage used in bytes
   * @throws Error if calculation fails
   * 
   * Validates: Requirements 3.1
   * 
   * @example
   * ```typescript
   * const usage = await storage.getUserStorageUsage(userId);
   * const usageMB = (usage / (1024 * 1024)).toFixed(2);
   * console.log(`Storage used: ${usageMB}MB`);
   * ```
   */
  async getUserStorageUsage(userId: string): Promise<number> {
    try {
      // Query all files for this user and sum their sizes
      const { data, error } = await supabase
        .from('file_attachments')
        .select('file_size')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error calculating storage usage:', error);
        throw new Error(`Failed to calculate storage usage: ${error.message}`);
      }
      
      // Sum up all file sizes
      const totalUsage = data?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
      
      return totalUsage;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Storage usage calculation failed: ${error.message}`);
      }
      throw new Error('Storage usage calculation failed: Unknown error');
    }
  }
  
  /**
   * Helper method to extract file extension from filename
   * 
   * @param filename - The name of the file
   * @returns The file extension in lowercase, or null if no extension
   * 
   * @private
   */
  private getFileExtension(filename: string): string | null {
    const parts = filename.split('.');
    if (parts.length < 2) {
      return null;
    }
    return parts[parts.length - 1].toLowerCase();
  }
}

/**
 * Default StorageService instance for convenience
 */
export const storageService = new StorageService();
