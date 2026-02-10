/**
 * File Processor Service
 * 
 * This module provides text extraction functionality for uploaded files
 * including PDF, TXT, and MD formats.
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */

import pdfParse from 'pdf-parse';

/**
 * Result of text extraction operation
 */
export type ExtractedContent = {
  text: string;
  pageCount?: number;
  extractionSuccess: boolean;
  error?: string;
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
 * - Comprehensive error handling
 * - Success/failure tracking
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
 * }
 * ```
 */
export class FileProcessor {
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
   * Validates: Requirements 2.2
   * 
   * @example
   * ```typescript
   * const text = await processor.processPDF(pdfFileData);
   * console.log('Extracted text:', text);
   * ```
   */
  async processPDF(file: FileData): Promise<string> {
    try {
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
      
      // Parse PDF and extract text
      const data = await pdfParse(buffer);
      
      // Return the extracted text from all pages
      return data.text;
    } catch (error) {
      // Handle specific PDF parsing errors
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          throw new Error('PDF is password-protected and cannot be processed');
        } else if (error.message.includes('Invalid PDF')) {
          throw new Error('PDF file is corrupted or invalid');
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
   * Validates: Requirements 2.3
   * 
   * @example
   * ```typescript
   * const text = await processor.processTextFile(textFileData);
   * console.log('File content:', text);
   * ```
   */
  async processTextFile(file: FileData): Promise<string> {
    try {
      // Convert Uint8Array to Buffer if needed
      const buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
      
      // Decode as UTF-8 text
      const text = buffer.toString('utf-8');
      
      // Return the complete text content
      return text;
    } catch (error) {
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
   * success flag and error details.
   * 
   * @param file - File data to extract text from
   * @returns Promise<ExtractedContent> with text, success flag, and optional error
   * 
   * Validates: Requirements 2.1, 2.4
   * 
   * @example
   * ```typescript
   * const result = await processor.extractText(fileData);
   * if (result.extractionSuccess) {
   *   console.log('Success:', result.text);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   */
  async extractText(file: FileData): Promise<ExtractedContent> {
    try {
      // Determine file type from filename extension
      const extension = this.getFileExtension(file.name);
      
      if (!extension) {
        return {
          text: '',
          extractionSuccess: false,
          error: 'File has no extension',
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
        return {
          text: '',
          extractionSuccess: false,
          error: `Unsupported file type: ${extension}`,
        };
      }
      
      return {
        text,
        pageCount,
        extractionSuccess: true,
      };
    } catch (error) {
      // Handle extraction errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        text: '',
        extractionSuccess: false,
        error: errorMessage,
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
}

/**
 * Default FileProcessor instance for convenience
 */
export const fileProcessor = new FileProcessor();
