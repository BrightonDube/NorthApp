/**
 * File Validator Service
 * 
 * This module provides validation for file uploads including type checking,
 * size validation, and storage quota verification.
 * 
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { supabase } from './supabase';

/**
 * Result of a file validation operation
 */
export type ValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Allowed file types for upload
 */
const ALLOWED_FILE_TYPES = ['pdf', 'txt', 'md'] as const;
export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Maximum storage quota per user in bytes (100MB)
 */
export const MAX_STORAGE_QUOTA = 100 * 1024 * 1024; // 100MB

/**
 * File metadata for validation
 */
export interface FileMetadata {
  name: string;
  size: number;
  type?: string;
}

/**
 * FileValidator class provides methods for validating file uploads
 * 
 * Features:
 * - File type validation (PDF, TXT, MD only)
 * - File size validation (max 10MB)
 * - Storage quota checking (max 100MB per user)
 * 
 * Usage:
 * ```typescript
 * const validator = new FileValidator();
 * 
 * // Validate file type
 * const typeResult = validator.validateFileType(file);
 * if (!typeResult.valid) {
 *   console.error(typeResult.error);
 * }
 * 
 * // Validate file size
 * const sizeResult = validator.validateFileSize(file);
 * if (!sizeResult.valid) {
 *   console.error(sizeResult.error);
 * }
 * 
 * // Check storage quota
 * const quotaResult = await validator.checkStorageQuota(userId, file.size);
 * if (!quotaResult.valid) {
 *   console.error(quotaResult.error);
 * }
 * ```
 */
export class FileValidator {
  /**
   * Validates that a file has an allowed file type
   * 
   * Checks the file extension against the allowed types: PDF, TXT, MD
   * 
   * @param file - File metadata containing name and size
   * @returns ValidationResult indicating if the file type is valid
   * 
   * Validates: Requirements 1.1, 1.4
   * 
   * @example
   * ```typescript
   * const result = validator.validateFileType({ name: 'document.pdf', size: 1024 });
   * // result.valid === true
   * 
   * const result2 = validator.validateFileType({ name: 'image.jpg', size: 1024 });
   * // result2.valid === false
   * // result2.error === 'File type not supported. Please upload PDF, TXT, or MD files.'
   * ```
   */
  validateFileType(file: FileMetadata): ValidationResult {
    // Extract file extension from filename
    const extension = this.getFileExtension(file.name);
    
    if (!extension) {
      return {
        valid: false,
        error: 'File has no extension. Please upload PDF, TXT, or MD files.',
      };
    }
    
    // Check if extension is in allowed list
    const isAllowed = ALLOWED_FILE_TYPES.includes(extension.toLowerCase() as AllowedFileType);
    
    if (!isAllowed) {
      return {
        valid: false,
        error: 'File type not supported. Please upload PDF, TXT, or MD files.',
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Validates that a file does not exceed the maximum size limit
   * 
   * Checks that the file size is within the 10MB limit
   * 
   * @param file - File metadata containing name and size
   * @returns ValidationResult indicating if the file size is valid
   * 
   * Validates: Requirements 1.2, 1.5
   * 
   * @example
   * ```typescript
   * const result = validator.validateFileSize({ name: 'document.pdf', size: 5 * 1024 * 1024 });
   * // result.valid === true
   * 
   * const result2 = validator.validateFileSize({ name: 'large.pdf', size: 11 * 1024 * 1024 });
   * // result2.valid === false
   * // result2.error === 'File size exceeds 10MB limit. Please upload a smaller file.'
   * ```
   */
  validateFileSize(file: FileMetadata): ValidationResult {
    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds 10MB limit. Your file is ${fileSizeMB}MB. Please upload a smaller file.`,
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Checks if a user has sufficient storage quota for a file upload
   * 
   * Queries the database to calculate current storage usage and verifies
   * that adding the new file would not exceed the 100MB quota
   * 
   * @param userId - The user's unique identifier
   * @param fileSize - The size of the file to be uploaded in bytes
   * @returns Promise<ValidationResult> indicating if quota is available
   * 
   * Validates: Requirements 1.2, 1.5
   * 
   * @example
   * ```typescript
   * const result = await validator.checkStorageQuota(userId, 5 * 1024 * 1024);
   * if (!result.valid) {
   *   console.error(result.error);
   * }
   * ```
   */
  async checkStorageQuota(userId: string, fileSize: number): Promise<ValidationResult> {
    try {
      // Query the database to get the sum of all file sizes for this user
      const { data, error } = await supabase
        .from('file_attachments')
        .select('file_size')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error checking storage quota:', error);
        return {
          valid: false,
          error: 'Unable to verify storage quota. Please try again.',
        };
      }
      
      // Calculate current usage
      const currentUsage = data?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
      const newUsage = currentUsage + fileSize;
      
      // Check if new usage would exceed quota
      if (newUsage > MAX_STORAGE_QUOTA) {
        const remainingMB = ((MAX_STORAGE_QUOTA - currentUsage) / (1024 * 1024)).toFixed(2);
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        return {
          valid: false,
          error: `Storage quota exceeded. You have ${remainingMB}MB remaining. Your file is ${fileSizeMB}MB. Please delete files to free up space.`,
        };
      }
      
      return { valid: true };
    } catch (err) {
      console.error('Unexpected error checking storage quota:', err);
      return {
        valid: false,
        error: 'Unable to verify storage quota. Please try again.',
      };
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
  
  /**
   * Validates all aspects of a file upload
   * 
   * Convenience method that runs all validation checks in sequence
   * 
   * @param file - File metadata containing name and size
   * @param userId - The user's unique identifier
   * @returns Promise<ValidationResult> with the first validation error encountered, or success
   * 
   * @example
   * ```typescript
   * const result = await validator.validateFile(file, userId);
   * if (!result.valid) {
   *   console.error(result.error);
   * }
   * ```
   */
  async validateFile(file: FileMetadata, userId: string): Promise<ValidationResult> {
    // Check file type
    const typeResult = this.validateFileType(file);
    if (!typeResult.valid) {
      return typeResult;
    }
    
    // Check file size
    const sizeResult = this.validateFileSize(file);
    if (!sizeResult.valid) {
      return sizeResult;
    }
    
    // Check storage quota
    const quotaResult = await this.checkStorageQuota(userId, file.size);
    if (!quotaResult.valid) {
      return quotaResult;
    }
    
    return { valid: true };
  }
}

/**
 * Default FileValidator instance for convenience
 */
export const fileValidator = new FileValidator();
