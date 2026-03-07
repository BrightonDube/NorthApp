/**
 * File Processor Unit Tests
 * 
 * Unit tests for file processing and text extraction functionality.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 8.4
 */

import { FileProcessor } from '../fileProcessor';

// Mock pdf-parse before importing
jest.mock('pdf-parse', () => jest.fn());

// Import the mocked pdf-parse
import pdfParse from 'pdf-parse';
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe('FileProcessor', () => {
  let processor: FileProcessor;

  beforeEach(() => {
    processor = new FileProcessor();
    jest.clearAllMocks();
    mockPdfParse.mockReset();
  });

  describe('extractText', () => {
    it('should successfully extract text from a PDF file', async () => {
      const file = {
        name: 'document.pdf',
        data: Buffer.from('mock pdf content'),
      };

      mockPdfParse.mockResolvedValue({
        text: 'This is extracted PDF text',
        numpages: 3,
        info: {},
        metadata: null,
        version: '1.0',
      });

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe('This is extracted PDF text');
      expect(result.pageCount).toBe(3);
      expect(result.error).toBeUndefined();
    });

    it('should successfully extract text from a TXT file', async () => {
      const content = 'This is plain text content\nWith multiple lines';
      const file = {
        name: 'document.txt',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe(content);
      expect(result.pageCount).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should successfully extract text from a MD file', async () => {
      const content = '# Markdown Document\n\nThis is markdown content';
      const file = {
        name: 'document.md',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe(content);
      expect(result.error).toBeUndefined();
    });

    it('should handle files without extensions', async () => {
      const file = {
        name: 'document',
        data: Buffer.from('content'),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.text).toBe('');
      expect(result.error).toBe('File has no extension');
    });

    it('should handle unsupported file types', async () => {
      const file = {
        name: 'image.jpg',
        data: Buffer.from('image data'),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.text).toBe('');
      expect(result.error).toBe('Unsupported file type: jpg');
    });
  });

  describe('processPDF', () => {
    it('should extract text from a valid PDF', async () => {
      const file = {
        name: 'document.pdf',
        data: Buffer.from('mock pdf content'),
      };

      mockPdfParse.mockResolvedValue({
        text: 'Extracted PDF text',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.0',
      });

      const result = await processor.processPDF(file);

      expect(result).toBe('Extracted PDF text');
      expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('should handle corrupted PDF files', async () => {
      const file = {
        name: 'corrupted.pdf',
        data: Buffer.from('corrupted data'),
      };

      mockPdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

      await expect(processor.processPDF(file)).rejects.toThrow('PDF file is corrupted or invalid');
    });

    it('should handle password-protected PDF files', async () => {
      const file = {
        name: 'protected.pdf',
        data: Buffer.from('encrypted data'),
      };

      mockPdfParse.mockRejectedValue(new Error('PDF is password-protected'));

      await expect(processor.processPDF(file)).rejects.toThrow('PDF is password-protected and cannot be processed');
    });

    it('should handle generic PDF parsing errors', async () => {
      const file = {
        name: 'error.pdf',
        data: Buffer.from('error data'),
      };

      mockPdfParse.mockRejectedValue(new Error('Unknown parsing error'));

      await expect(processor.processPDF(file)).rejects.toThrow('Failed to extract text from PDF: Unknown parsing error');
    });

    it('should handle non-Error exceptions', async () => {
      const file = {
        name: 'error.pdf',
        data: Buffer.from('error data'),
      };

      mockPdfParse.mockRejectedValue('String error');

      await expect(processor.processPDF(file)).rejects.toThrow('Failed to extract text from PDF: Unknown error');
    });

    it('should work with Uint8Array data', async () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const file = {
        name: 'document.pdf',
        data: uint8Array,
      };

      mockPdfParse.mockResolvedValue({
        text: 'Extracted text',
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.0',
      });

      const result = await processor.processPDF(file);

      expect(result).toBe('Extracted text');
      expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('processTextFile', () => {
    it('should read entire text file content', async () => {
      const content = 'This is the complete text file content';
      const file = {
        name: 'document.txt',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(content);
    });

    it('should handle empty text files', async () => {
      const file = {
        name: 'empty.txt',
        data: Buffer.from(''),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe('');
    });

    it('should handle very large text files (>1MB)', async () => {
      // Create a 2MB text file
      const largeContent = 'a'.repeat(2 * 1024 * 1024);
      const file = {
        name: 'large.txt',
        data: Buffer.from(largeContent, 'utf-8'),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(largeContent);
      expect(result.length).toBe(2 * 1024 * 1024);
    });

    it('should preserve special characters and unicode', async () => {
      const content = 'Special chars: 你好 🎉 ñ é ü';
      const file = {
        name: 'unicode.txt',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(content);
    });

    it('should preserve line breaks and formatting', async () => {
      const content = 'Line 1\nLine 2\r\nLine 3\n\nLine 5';
      const file = {
        name: 'multiline.txt',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(content);
    });

    it('should work with Uint8Array data', async () => {
      const content = 'Text content';
      const buffer = Buffer.from(content, 'utf-8');
      const uint8Array = new Uint8Array(buffer);
      const file = {
        name: 'document.txt',
        data: uint8Array,
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(content);
    });

    it('should handle markdown files', async () => {
      const content = '# Title\n\n## Subtitle\n\n- Item 1\n- Item 2';
      const file = {
        name: 'document.md',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.processTextFile(file);

      expect(result).toBe(content);
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle PDF extraction failures in extractText', async () => {
      const file = {
        name: 'error.pdf',
        data: Buffer.from('bad data'),
      };

      mockPdfParse.mockRejectedValue(new Error('Parsing failed'));

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.text).toBe('');
      expect(result.error).toContain('Failed to extract text from PDF');
    });

    it('should never throw exceptions from extractText', async () => {
      const file = {
        name: 'error.pdf',
        data: Buffer.from('bad data'),
      };

      mockPdfParse.mockRejectedValue(new Error('Critical error'));

      // Should not throw, should return error result
      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle corrupted PDF with specific error message', async () => {
      const file = {
        name: 'corrupted.pdf',
        data: Buffer.from('corrupted'),
      };

      mockPdfParse.mockRejectedValue(new Error('Invalid PDF'));

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.error).toContain('corrupted or invalid');
    });

    it('should handle password-protected PDF with specific error message', async () => {
      const file = {
        name: 'protected.pdf',
        data: Buffer.from('encrypted'),
      };

      mockPdfParse.mockRejectedValue(new Error('password'));

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(false);
      expect(result.error).toContain('password-protected');
    });

    it('should provide helpful error messages for all failure types', async () => {
      // Test various error scenarios
      const scenarios = [
        { name: 'no-ext', data: Buffer.from('data'), expectedError: 'no extension' },
        { name: 'file.exe', data: Buffer.from('data'), expectedError: 'Unsupported file type' },
      ];

      for (const scenario of scenarios) {
        const file = {
          name: scenario.name,
          data: scenario.data,
        };

        const result = await processor.extractText(file);

        expect(result.extractionSuccess).toBe(false);
        expect(result.error).toContain(scenario.expectedError);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle files with multiple dots in filename', async () => {
      const content = 'Content';
      const file = {
        name: 'my.document.backup.txt',
        data: Buffer.from(content, 'utf-8'),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe(content);
    });

    it('should handle case-insensitive file extensions', async () => {
      const content = 'Content';
      const files = [
        { name: 'doc.PDF', data: Buffer.from(content) },
        { name: 'doc.TXT', data: Buffer.from(content, 'utf-8') },
        { name: 'doc.MD', data: Buffer.from(content, 'utf-8') },
      ];

      mockPdfParse.mockResolvedValue({
        text: content,
        numpages: 1,
        info: {},
        metadata: null,
        version: '1.0',
      });

      for (const file of files) {
        const result = await processor.extractText(file);
        expect(result.extractionSuccess).toBe(true);
      }
    });

    it('should handle zero-byte files', async () => {
      const file = {
        name: 'empty.txt',
        data: Buffer.from(''),
      };

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe('');
    });

    it('should handle PDF with zero pages', async () => {
      const file = {
        name: 'empty.pdf',
        data: Buffer.from('pdf data'),
      };

      mockPdfParse.mockResolvedValue({
        text: '',
        numpages: 0,
        info: {},
        metadata: null,
        version: '1.0',
      });

      const result = await processor.extractText(file);

      expect(result.extractionSuccess).toBe(true);
      expect(result.text).toBe('');
      expect(result.pageCount).toBe(0);
    });
  });
});
