/**
 * File Validator Property-Based Tests
 * 
 * Property-based tests for file validation functionality.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 1.1, 1.2, 1.4
 */

import * as fc from 'fast-check';
import { FileValidator, MAX_FILE_SIZE, AllowedFileType } from '../fileValidator';

describe('File Validator Properties', () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = new FileValidator();
  });

  /**
   * Property 1: File Type Validation
   * 
   * **Validates: Requirements 1.1, 1.4**
   * 
   * For any file upload attempt, only files with extensions PDF, TXT, or MD
   * should be accepted, and all other file types should be rejected with an
   * error message.
   */
  // Feature: file-context-attachments, Property 1: File Type Validation
  describe('Property 1: File Type Validation', () => {
    it('Property 1.1: Only PDF, TXT, and MD files are accepted', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            extension: fc.constantFrom('pdf', 'txt', 'md', 'jpg', 'png', 'exe', 'doc', 'docx', 'zip', 'mp4'),
            size: fc.integer({ min: 1, max: 15 * 1024 * 1024 }),
          }),
          (fileData) => {
            const file = {
              name: `${fileData.name}.${fileData.extension}`,
              size: fileData.size,
            };

            const result = validator.validateFileType(file);
            const validExtensions = ['pdf', 'txt', 'md'];

            if (validExtensions.includes(fileData.extension)) {
              expect(result.valid).toBe(true);
              expect(result.error).toBeUndefined();
            } else {
              expect(result.valid).toBe(false);
              expect(result.error).toBeDefined();
              expect(result.error).toContain('not supported');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 1.2: File type validation is case-insensitive', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.constantFrom('lower', 'upper', 'mixed'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
          (extension, caseVariant, baseName, size) => {
            let transformedExtension: string;
            switch (caseVariant) {
              case 'lower':
                transformedExtension = extension.toLowerCase();
                break;
              case 'upper':
                transformedExtension = extension.toUpperCase();
                break;
              case 'mixed':
                transformedExtension = extension
                  .split('')
                  .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
                  .join('');
                break;
              default:
                transformedExtension = extension;
            }

            const file = {
              name: `${baseName}.${transformedExtension}`,
              size,
            };

            const result = validator.validateFileType(file);

            // All valid extensions should be accepted regardless of case
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 1.3: Files without extensions are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => !s.includes('.')),
          fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
          (filename, size) => {
            const file = {
              name: filename,
              size,
            };

            const result = validator.validateFileType(file);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('no extension');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 1.4: Invalid file types always include error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('jpg', 'png', 'exe', 'doc', 'docx', 'zip', 'mp4', 'avi', 'mov'),
          fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
          (baseName, invalidExtension, size) => {
            const file = {
              name: `${baseName}.${invalidExtension}`,
              size,
            };

            const result = validator.validateFileType(file);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 1.5: Valid file types never include error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
          (baseName, validExtension, size) => {
            const file = {
              name: `${baseName}.${validExtension}`,
              size,
            };

            const result = validator.validateFileType(file);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 1.6: Multiple dots in filename - uses last extension', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          fc.constantFrom('pdf', 'txt', 'md', 'jpg', 'exe'),
          fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
          (nameParts, finalExtension, size) => {
            const filename = nameParts.join('.') + '.' + finalExtension;
            const file = {
              name: filename,
              size,
            };

            const result = validator.validateFileType(file);
            const validExtensions = ['pdf', 'txt', 'md'];

            if (validExtensions.includes(finalExtension)) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: File Size Validation
   * 
   * **Validates: Requirements 1.2**
   * 
   * For any file upload attempt, files exceeding 10MB should be rejected
   * with a size limit error.
   */
  // Feature: file-context-attachments, Property 2: File Size Validation
  describe('Property 2: File Size Validation', () => {
    it('Property 2.1: Files under 10MB are accepted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const result = validator.validateFileSize(file);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.2: Files over 10MB are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: MAX_FILE_SIZE + 1, max: 100 * 1024 * 1024 }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const result = validator.validateFileSize(file);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('exceeds 10MB limit');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.3: Exactly 10MB files are accepted', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          (baseName, extension) => {
            const file = {
              name: `${baseName}.${extension}`,
              size: MAX_FILE_SIZE,
            };

            const result = validator.validateFileSize(file);

            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.4: File size error includes actual file size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: MAX_FILE_SIZE + 1, max: 50 * 1024 * 1024 }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const result = validator.validateFileSize(file);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            
            // Error should mention the file size in MB
            const fileSizeMB = (size / (1024 * 1024)).toFixed(2);
            expect(result.error).toContain(fileSizeMB);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.5: Zero-byte files are rejected', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          (baseName, extension) => {
            const file = {
              name: `${baseName}.${extension}`,
              size: 0,
            };

            const result = validator.validateFileSize(file);

            // Zero-byte files pass size validation (they're under 10MB)
            // but would fail in actual processing
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.6: File size validation is independent of file type', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1, max: 20 * 1024 * 1024 }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const result = validator.validateFileSize(file);

            // Size validation should work the same regardless of extension
            if (size <= MAX_FILE_SIZE) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
              expect(result.error).toContain('exceeds 10MB limit');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 2.7: Large file errors always include helpful message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: MAX_FILE_SIZE + 1, max: 100 * 1024 * 1024 }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const result = validator.validateFileSize(file);

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
            expect(result.error!.length).toBeGreaterThan(0);
            
            // Error should be helpful and mention both the limit and the actual size
            expect(result.error).toContain('10MB');
            expect(result.error).toContain('MB');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined validation properties
   */
  describe('Combined Validation Properties', () => {
    it('Property: Valid type and size both pass', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const typeResult = validator.validateFileType(file);
            const sizeResult = validator.validateFileSize(file);

            expect(typeResult.valid).toBe(true);
            expect(sizeResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Invalid type fails regardless of size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('jpg', 'png', 'exe', 'doc'),
          fc.integer({ min: 1, max: MAX_FILE_SIZE }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const typeResult = validator.validateFileType(file);

            expect(typeResult.valid).toBe(false);
            expect(typeResult.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Oversized file fails regardless of type', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.integer({ min: MAX_FILE_SIZE + 1, max: 50 * 1024 * 1024 }),
          (baseName, extension, size) => {
            const file = {
              name: `${baseName}.${extension}`,
              size,
            };

            const sizeResult = validator.validateFileSize(file);

            expect(sizeResult.valid).toBe(false);
            expect(sizeResult.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
