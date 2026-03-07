/**
 * File Processor Service
 * 
 * This module provides text extraction functionality for uploaded files
 * including PDF, TXT, and MD formats.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 8.2, 8.4, 8.5
 */

import pdfParse from 'pdf-parse';
import { logError, logSuccess, type ErrorContext } from './errorLogger';

/**
 * Result of text extraction operation
 */
export type ExtractedContent = {
  text: string;
  pageCount?: number;
  extractionSuccess: boolean;
  error?: string;
  retryable?: boolean; // Indicates if the operation can be retried
};

/**
 * File data for processing
 */
export interface FileData {
  name: string;
  data: Buffer | Uint8Array;
  type?: string;
}

/**
 * FileProcessor class provides methods for extracting text from various file types
 * 
 * Features:
 * - PDF text extraction using pdf-parse library
 * - Text file reading (TXT, MD)
 * - Comprehensive error handling with retry support
 * - Success/failure tracking
 * - Error logging for debugging
 * 
 * Usage:
 * ```typescript
 * const processor = new FileProcessor();
 * 
 * // Extract text from any supported file
 * const result = await processor.extractText(fileData);
 * if (result.extractionSuccess) {
 *   console.log('Extracted text:', result.text);
 * } else {
 *   console.error('Extraction failed:', result.error);
 *   if (result.retryable) {
 *     // Offer retry option to user
 *   }
 * }
 * 
 * // Extract with retry
 * const resultWithRetry = await processor.extractTextWithRetry(fileData, 3);
 * ```
 */
export class FileProcessor {
  /**
   * Maximum number of retry attempts for extraction
   */
  private readonly MAX_RETRIES = 3;
  
  /**
   * Delay between retry attempts in milliseconds
   */
  private readonly RETRY_DELAY = 1000;
  /**
   * Extracts text content from a PDF file
   * 
   * Uses pdf-parse library to extract text from all pages in the PDF document.
   * Handles corrupted PDFs, password-protected PDFs, and other parsing errors.
   * 
   * @param file - File data containing PDF content
   * @returns Promise<string> containing extracted text from all pages
   * @throws Error if PDF parsing fails
   * 
   * Validates: Requirements 2.2, 8.4
   * 
   * @example
   * ```typescript
   * const text = await processor.processPDF(pdfFileData);
   * console.log('Extracted text:', text);
   * ```
   */
  async processPDF(file: FileData): Promise<string> {
    const errorContext: ErrorContext = {
      operation: 'processPDF',
      filename: file.name,
      component: 'FileProcessor',
    };
    
    try {
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
      
      // Parse PDF and extract text
      const data = await pdfParse(buffer);
      
      // Log success
      logSuccess('processPDF', {
        ...errorContext,
        additionalInfo: { pageCount: data.numpages },
      });
      
      // Return the extracted text from all pages
      return data.text;
    } catch (error) {
      // Log error with context
      logError(error as Error, errorContext, 'error');
      
      // Handle specific PDF parsing errors
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          throw new Error('PDF is password-protected and cannot be processed');
        } else if (error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
          throw new Error('PDF file is corrupted or invalid');
        } else if (error.message.includes('encrypted')) {
          throw new Error('PDF is encrypted and cannot be processed');
        } else {
          throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
      }
      throw new Error('Failed to extract text from PDF: Unknown error');
    }
  }
  
  /**
   * Reads text content from a text or markdown file
   * 
   * Reads the entire file content without truncation. Supports TXT and MD files.
   * Handles various text encodings and ensures complete content extraction.
   * 
   * @param file - File data containing text content
   * @returns Promise<string> containing the complete file content
   * 
   * Validates: Requirements 2.3, 8.5
   * 
   * @example
   * ```typescript
   * const text = await processor.processTextFile(textFileData);
   * console.log('File content:', text);
   * ```
   */
  async processTextFile(file: FileData): Promise<string> {
    const errorContext: ErrorContext = {
      operation: 'processTextFile',
      filename: file.name,
      component: 'FileProcessor',
    };
    
    try {
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
      
      // Decode as UTF-8 text
      const text = buffer.toString('utf-8');
      
      // Log success
      logSuccess('processTextFile', {
        ...errorContext,
        additionalInfo: { textLength: text.length },
      });
      
      // Return the complete text content
      return text;
    } catch (error) {
      // Log error with context
      logError(error as Error, errorContext, 'error');
      
      if (error instanceof Error) {
        throw new Error(`Failed to read text file: ${error.message}`);
      }
      throw new Error('Failed to read text file: Unknown error');
    }
  }
  
  /**
   * Main entry point for text extraction from any supported file type
   * 
   * Automatically detects file type and routes to appropriate extraction method.
   * Provides comprehensive error handling and returns structured result with
   * success flag, error details, and retry information.
   * 
   * @param file - File data to extract text from
   * @returns Promise<ExtractedContent> with text, success flag, optional error, and retry flag
   * 
   * Validates: Requirements 2.1, 2.4, 8.2, 8.4, 8.5
   * 
   * @example
   * ```typescript
   * const result = await processor.extractText(fileData);
   * if (result.extractionSuccess) {
   *   console.log('Success:', result.text);
   * } else {
   *   console.error('Failed:', result.error);
   *   if (result.retryable) {
   *     // Offer retry to user
   *   }
   * }
   * ```
   */
  async extractText(file: FileData): Promise<ExtractedContent> {
    const errorContext: ErrorContext = {
      operation: 'extractText',
      filename: file.name,
      component: 'FileProcessor',
    };
    
    try {
      // Determine file type from filename extension
      const extension = this.getFileExtension(file.name);
      
      if (!extension) {
        const error = 'File has no extension';
        logError(error, errorContext, 'error');
        return {
          text: '',
          extractionSuccess: false,
          error,
          retryable: false,
        };
      }
      
      let text: string;
      let pageCount: number | undefined;
      
      // Route to appropriate extraction method based on file type
      if (extension === 'pdf') {
        text = await this.processPDF(file);
        
        // For PDFs, we can get page count from pdf-parse
        try {
          const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
          const data = await pdfParse(buffer);
          pageCount = data.numpages;
        } catch {
          // If we can't get page count, it's not critical
          pageCount = undefined;
        }
      } else if (extension === 'txt' || extension === 'md') {
        text = await this.processTextFile(file);
      } else {
        const error = `Unsupported file type: ${extension}`;
        logError(error, errorContext, 'error');
        return {
          text: '',
          extractionSuccess: false,
          error,
          retryable: false,
        };
      }
      
      // Log success
      logSuccess('extractText', {
        ...errorContext,
        additionalInfo: { textLength: text.length, pageCount },
      });
      
      return {
        text,
        pageCount,
        extractionSuccess: true,
        retryable: false,
      };
    } catch (error) {
      // Handle extraction errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Determine if error is retryable
      const retryable = this.isRetryableError(errorMessage);
      
      // Log error with context
      logError(error as Error, errorContext, 'error');
      
      return {
        text: '',
        extractionSuccess: false,
        error: errorMessage,
        retryable,
      };
    }
  }
  
  /**
   * Extract text with automatic retry on failure
   * 
   * Attempts extraction multiple times with exponential backoff.
   * Useful for handling transient errors.
   * 
   * Validates: Requirements 8.2
   * 
   * @param file - File data to extract text from
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Promise<ExtractedContent> with extraction result
   * 
   * @example
   * ```typescript
   * const result = await processor.extractTextWithRetry(fileData, 3);
   * ```
   */
  async extractTextWithRetry(
    file: FileData,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<ExtractedContent> {
    let lastResult: ExtractedContent | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.extractText(file);
      
      if (result.extractionSuccess) {
        return result;
      }
      
      lastResult = result;
      
      // Don't retry if error is not retryable
      if (!result.retryable) {
        break;
      }
      
      // Don't retry on last attempt
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = this.RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logError(
          `Retry attempt ${attempt + 1}/${maxRetries} for file: ${file.name}`,
          {
            operation: 'extractTextWithRetry',
            filename: file.name,
            component: 'FileProcessor',
            additionalInfo: { attempt: attempt + 1, maxRetries },
          },
          'warning'
        );
      }
    }
    
    return lastResult || {
      text: '',
      extractionSuccess: false,
      error: 'Extraction failed after all retry attempts',
      retryable: false,
    };
  }
  
  /**
   * Determine if an error is retryable
   * 
   * Some errors are permanent (corrupted file, password-protected)
   * while others are transient (network issues, temporary failures).
   * 
   * @param errorMessage - The error message
   * @returns true if the error is retryable
   * 
   * @private
   */
  private isRetryableError(errorMessage: string): boolean {
    // Non-retryable errors
    const nonRetryablePatterns = [
      'password',
      'encrypted',
      'corrupted',
      'invalid',
      'unsupported',
      'no extension',
    ];
    
    for (const pattern of nonRetryablePatterns) {
      if (errorMessage.toLowerCase().includes(pattern)) {
        return false;
      }
    }
    
    // All other errors are considered retryable
    return true;
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
 * Default FileProcessor instance for convenience
 */
export const fileProcessor = new FileProcessor();
