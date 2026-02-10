/**
 * File Validator Unit Tests
 * 
 * Unit tests for file validation edge cases and specific scenarios.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 1.1, 1.2, 1.4, 1.5
 */

import { FileValidator, MAX_FILE_SIZE, MAX_STORAGE_QUOTA } from '../fileValidator';
import { supabase } from '../supabase';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('FileValidator', () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = new FileValidator();
    jest.clearAllMocks();
  });

  describe('validateFileType', () => {
    it('accepts PDF files', () => {
      const file = { name: 'document.pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts TXT files', () => {
      const file = { name: 'notes.txt', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts MD files', () => {
      const file = { name: 'readme.md', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects JPG files', () => {
      const file = { name: 'image.jpg', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PDF, TXT, or MD files.');
    });

    it('rejects EXE files', () => {
      const file = { name: 'program.exe', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type not supported. Please upload PDF, TXT, or MD files.');
    });

    it('rejects files without extension', () => {
      const file = { name: 'document', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File has no extension. Please upload PDF, TXT, or MD files.');
    });

    it('handles empty filename', () => {
      const file = { name: '', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File has no extension. Please upload PDF, TXT, or MD files.');
    });

    it('handles filename with only extension', () => {
      const file = { name: '.pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles special characters in filename', () => {
      const file = { name: 'my-document_v2 (final).pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles unicode characters in filename', () => {
      const file = { name: '文档.pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('handles multiple dots in filename', () => {
      const file = { name: 'my.document.v2.pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('is case-insensitive for extensions', () => {
      const files = [
        { name: 'document.PDF', size: 1024 },
        { name: 'document.Pdf', size: 1024 },
        { name: 'document.pDf', size: 1024 },
        { name: 'notes.TXT', size: 1024 },
        { name: 'readme.MD', size: 1024 },
      ];

      files.forEach((file) => {
        const result = validator.validateFileType(file);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('validateFileSize', () => {
    it('accepts files under 10MB', () => {
      const file = { name: 'document.pdf', size: 5 * 1024 * 1024 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts files exactly at 10MB', () => {
      const file = { name: 'document.pdf', size: MAX_FILE_SIZE };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects files over 10MB', () => {
      const file = { name: 'large.pdf', size: 11 * 1024 * 1024 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 10MB limit');
      expect(result.error).toContain('11.00MB');
    });

    it('rejects files at 10MB + 1 byte', () => {
      const file = { name: 'document.pdf', size: MAX_FILE_SIZE + 1 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 10MB limit');
    });

    it('accepts very small files', () => {
      const file = { name: 'tiny.txt', size: 100 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts 1 byte files', () => {
      const file = { name: 'minimal.txt', size: 1 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('error message includes file size in MB', () => {
      const file = { name: 'large.pdf', size: 15 * 1024 * 1024 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('15.00MB');
    });

    it('error message is helpful and actionable', () => {
      const file = { name: 'large.pdf', size: 12 * 1024 * 1024 };
      const result = validator.validateFileSize(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 10MB limit');
      expect(result.error).toContain('smaller file');
    });
  });

  describe('checkStorageQuota', () => {
    it('allows upload when user has sufficient quota', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { file_size: 10 * 1024 * 1024 },
              { file_size: 20 * 1024 * 1024 },
            ],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 5 * 1024 * 1024);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockFrom).toHaveBeenCalledWith('file_attachments');
    });

    it('rejects upload when quota would be exceeded', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { file_size: 50 * 1024 * 1024 },
              { file_size: 40 * 1024 * 1024 },
            ],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 15 * 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
      expect(result.error).toContain('MB remaining');
    });

    it('allows upload when user has no existing files', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 10 * 1024 * 1024);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows upload exactly at quota limit', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ file_size: 90 * 1024 * 1024 }],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 10 * 1024 * 1024);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects upload at quota limit + 1 byte', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ file_size: 90 * 1024 * 1024 }],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 10 * 1024 * 1024 + 1);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('handles database errors gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 5 * 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unable to verify storage quota');
    });

    it('handles null data gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 5 * 1024 * 1024);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('error message includes remaining quota', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ file_size: 80 * 1024 * 1024 }],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const result = await validator.checkStorageQuota('user-123', 25 * 1024 * 1024);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('20.00MB remaining');
      expect(result.error).toContain('25.00MB');
    });
  });

  describe('validateFile (combined validation)', () => {
    it('passes when all validations succeed', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const file = { name: 'document.pdf', size: 5 * 1024 * 1024 };
      const result = await validator.validateFile(file, 'user-123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('fails on invalid file type', async () => {
      const file = { name: 'image.jpg', size: 5 * 1024 * 1024 };
      const result = await validator.validateFile(file, 'user-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('fails on oversized file', async () => {
      const file = { name: 'large.pdf', size: 15 * 1024 * 1024 };
      const result = await validator.validateFile(file, 'user-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 10MB limit');
    });

    it('fails on quota exceeded', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ file_size: 95 * 1024 * 1024 }],
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock).mockImplementation(mockFrom);

      const file = { name: 'document.pdf', size: 10 * 1024 * 1024 };
      const result = await validator.validateFile(file, 'user-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Storage quota exceeded');
    });

    it('returns first error encountered', async () => {
      // Invalid type should fail before checking size or quota
      const file = { name: 'image.jpg', size: 15 * 1024 * 1024 };
      const result = await validator.validateFile(file, 'user-123');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
      expect(result.error).not.toContain('exceeds 10MB limit');
    });
  });

  describe('Edge cases', () => {
    it('handles files with very long names', () => {
      const longName = 'a'.repeat(200) + '.pdf';
      const file = { name: longName, size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('handles files with spaces in name', () => {
      const file = { name: 'my document with spaces.pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('handles files with leading/trailing spaces in name (not extension)', () => {
      const file = { name: '  document  .pdf', size: 1024 };
      const result = validator.validateFileType(file);

      expect(result.valid).toBe(true);
    });

    it('handles zero-byte files', () => {
      const file = { name: 'empty.txt', size: 0 };
      const sizeResult = validator.validateFileSize(file);

      // Zero-byte files pass size validation
      expect(sizeResult.valid).toBe(true);
    });
  });
});
