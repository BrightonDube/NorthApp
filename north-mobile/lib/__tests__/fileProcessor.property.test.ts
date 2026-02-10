/**
 * File Processor Property-Based Tests
 * 
 * Property-based tests for file processing and text extraction functionality.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import * as fc from 'fast-check';
import { FileProcessor } from '../fileProcessor';

// Mock pdf-parse before importing
jest.mock('pdf-parse', () => jest.fn());

// Import the mocked pdf-parse
import pdfParse from 'pdf-parse';
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe('File Processor Properties', () => {
  let processor: FileProcessor;

  beforeEach(() => {
    processor = new FileProcessor();
    jest.clearAllMocks();
    mockPdfParse.mockReset();
  });

  /**
   * Property 4: Text Extraction Attempt
   * 
   * **Validates: Requirements 2.1**
   * 
   * For any successfully uploaded file, the File Processor should attempt
   * to extract text content from the file.
   */
  // Feature: file-context-attachments, Property 4: Text Extraction Attempt
  describe('Property 4: Text Extraction Attempt', () => {
    it('Property 4.1: extractText always attempts extraction for valid file types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, content) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content),
            };

            // Mock pdf-parse for PDF files
            if (extension === 'pdf') {
              mockPdfParse.mockResolvedValue({
                text: content,
                numpages: 1,
                info: {},
                metadata: null,
                version: '1.0',
              });
            }

            const result = await processor.extractText(file);

            // The processor should always return a result (success or failure)
            expect(result).toBeDefined();
            expect(typeof result.extractionSuccess).toBe('boolean');
            
            // For valid file types, extraction should be attempted
            // (either succeeds or fails with an error message)
            if (!result.extractionSuccess) {
              expect(result.error).toBeDefined();
              expect(typeof result.error).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4.2: extractText returns structured result for all inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.uint8Array({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, dataArray) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(dataArray),
            };

            // Mock pdf-parse for PDF files
            if (extension === 'pdf') {
              mockPdfParse.mockResolvedValue({
                text: 'test content',
                numpages: 1,
                info: {},
                metadata: null,
                version: '1.0',
              });
            }

            const result = await processor.extractText(file);

            // Result should always have required fields
            expect(result).toHaveProperty('text');
            expect(result).toHaveProperty('extractionSuccess');
            expect(typeof result.text).toBe('string');
            expect(typeof result.extractionSuccess).toBe('boolean');
            
            // If extraction failed, error should be present
            if (!result.extractionSuccess) {
              expect(result.error).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4.3: extractText handles files without extensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.')),
          fc.uint8Array({ minLength: 0, maxLength: 1000 }),
          async (filename, dataArray) => {
            const file = {
              name: filename,
              data: Buffer.from(dataArray),
            };

            const result = await processor.extractText(file);

            // Files without extensions should fail gracefully
            expect(result.extractionSuccess).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('no extension');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4.4: extractText handles unsupported file types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('jpg', 'png', 'exe', 'doc', 'zip'),
          fc.uint8Array({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, dataArray) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(dataArray),
            };

            const result = await processor.extractText(file);

            // Unsupported file types should fail gracefully
            expect(result.extractionSuccess).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Unsupported file type');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 4.5: extractText never throws exceptions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.uint8Array({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, dataArray) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(dataArray),
            };

            // Mock pdf-parse to sometimes throw errors
            if (extension === 'pdf') {
              if (dataArray.length % 3 === 0) {
                mockPdfParse.mockRejectedValue(
                  new Error('PDF parsing error')
                );
              } else {
                mockPdfParse.mockResolvedValue({
                  text: 'test',
                  numpages: 1,
                  info: {},
                  metadata: null,
                  version: '1.0',
                });
              }
            }

            // extractText should never throw - it should catch all errors
            await expect(processor.extractText(file)).resolves.toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Complete PDF Processing
   * 
   * **Validates: Requirements 2.2**
   * 
   * For any PDF file, the File Processor should extract text from all pages
   * in the document.
   */
  // Feature: file-context-attachments, Property 5: Complete PDF Processing
  describe('Property 5: Complete PDF Processing', () => {
    it('Property 5.1: processPDF extracts text from all pages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 1, maxLength: 10 }),
          async (baseName, pageTexts) => {
            const file = {
              name: `${baseName}.pdf`,
              data: Buffer.from('mock pdf data'),
            };

            // Mock pdf-parse to return text from multiple pages
            const fullText = pageTexts.join('\n');
            mockPdfParse.mockResolvedValue({
              text: fullText,
              numpages: pageTexts.length,
              info: {},
              metadata: null,
              version: '1.0',
            });

            const result = await processor.processPDF(file);

            // Should return the complete text from all pages
            expect(result).toBe(fullText);
            
            // Verify pdf-parse was called with the file data
            expect(mockPdfParse).toHaveBeenCalledWith(expect.any(Buffer));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5.2: extractText includes page count for PDFs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (baseName, pageCount, text) => {
            const file = {
              name: `${baseName}.pdf`,
              data: Buffer.from('mock pdf data'),
            };

            // Mock pdf-parse to return specific page count
            mockPdfParse.mockResolvedValue({
              text,
              numpages: pageCount,
              info: {},
              metadata: null,
              version: '1.0',
            });

            const result = await processor.extractText(file);

            if (result.extractionSuccess) {
              expect(result.pageCount).toBe(pageCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5.3: processPDF handles password-protected PDFs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (baseName) => {
            const file = {
              name: `${baseName}.pdf`,
              data: Buffer.from('encrypted pdf data'),
            };

            // Mock pdf-parse to throw password error
            mockPdfParse.mockRejectedValue(
              new Error('PDF is password-protected')
            );

            await expect(processor.processPDF(file)).rejects.toThrow('password-protected');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5.4: processPDF handles corrupted PDFs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          async (baseName) => {
            const file = {
              name: `${baseName}.pdf`,
              data: Buffer.from('corrupted data'),
            };

            // Mock pdf-parse to throw invalid PDF error
            mockPdfParse.mockRejectedValue(
              new Error('Invalid PDF structure')
            );

            await expect(processor.processPDF(file)).rejects.toThrow('corrupted or invalid');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 5.5: processPDF works with Uint8Array and Buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 500 }),
          async (baseName, dataArray, text) => {
            // Test with Uint8Array
            const fileWithUint8Array = {
              name: `${baseName}.pdf`,
              data: dataArray,
            };

            // Test with Buffer
            const fileWithBuffer = {
              name: `${baseName}.pdf`,
              data: Buffer.from(dataArray),
            };

            mockPdfParse.mockResolvedValue({
              text,
              numpages: 1,
              info: {},
              metadata: null,
              version: '1.0',
            });

            // Both should work
            const result1 = await processor.processPDF(fileWithUint8Array);
            const result2 = await processor.processPDF(fileWithBuffer);

            expect(result1).toBe(text);
            expect(result2).toBe(text);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Complete Text File Reading
   * 
   * **Validates: Requirements 2.3**
   * 
   * For any text or markdown file, the File Processor should read the entire
   * file content without truncation during extraction.
   */
  // Feature: file-context-attachments, Property 6: Complete Text File Reading
  describe('Property 6: Complete Text File Reading', () => {
    it('Property 6.1: processTextFile reads entire content without truncation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.string({ minLength: 0, maxLength: 5000 }),
          async (baseName, extension, content) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content, 'utf-8'),
            };

            const result = await processor.processTextFile(file);

            // Should return the complete content without truncation
            expect(result).toBe(content);
            expect(result.length).toBe(content.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.2: processTextFile handles empty files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          async (baseName, extension) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(''),
            };

            const result = await processor.processTextFile(file);

            // Empty files should return empty string
            expect(result).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.3: processTextFile handles large files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.integer({ min: 1000, max: 10000 }),
          async (baseName, extension, size) => {
            // Create a large text content
            const content = 'a'.repeat(size);
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content, 'utf-8'),
            };

            const result = await processor.processTextFile(file);

            // Should read the entire large file
            expect(result.length).toBe(size);
            expect(result).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.4: processTextFile handles special characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, content) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content, 'utf-8'),
            };

            const result = await processor.processTextFile(file);

            // Should preserve all characters including special ones
            expect(result).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.5: processTextFile handles multi-line content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.array(fc.string({ minLength: 0, maxLength: 100 }), { minLength: 1, maxLength: 20 }),
          async (baseName, extension, lines) => {
            const content = lines.join('\n');
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content, 'utf-8'),
            };

            const result = await processor.processTextFile(file);

            // Should preserve line breaks
            expect(result).toBe(content);
            expect(result.split('\n').length).toBe(lines.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.6: processTextFile works with Uint8Array and Buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (baseName, extension, content) => {
            const buffer = Buffer.from(content, 'utf-8');
            const uint8Array = new Uint8Array(buffer);

            // Test with Uint8Array
            const fileWithUint8Array = {
              name: `${baseName}.${extension}`,
              data: uint8Array,
            };

            // Test with Buffer
            const fileWithBuffer = {
              name: `${baseName}.${extension}`,
              data: buffer,
            };

            const result1 = await processor.processTextFile(fileWithUint8Array);
            const result2 = await processor.processTextFile(fileWithBuffer);

            // Both should return the same content
            expect(result1).toBe(content);
            expect(result2).toBe(content);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 6.7: extractText returns complete text for TXT and MD files', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('txt', 'md'),
          fc.string({ minLength: 0, maxLength: 2000 }),
          async (baseName, extension, content) => {
            const file = {
              name: `${baseName}.${extension}`,
              data: Buffer.from(content, 'utf-8'),
            };

            const result = await processor.extractText(file);

            if (result.extractionSuccess) {
              // Should return the complete content
              expect(result.text).toBe(content);
              expect(result.text.length).toBe(content.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
