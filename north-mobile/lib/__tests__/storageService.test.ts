/**
 * Storage Service Unit Tests
 * 
 * Unit tests for file storage functionality.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 1.3, 3.1, 6.3
 */

import { StorageService } from '../storageService';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('StorageService', () => {
  let storage: StorageService;
  let mockStorageFrom: jest.Mock;
  let mockDbFrom: jest.Mock;
  let mockGetUser: jest.Mock;

  beforeEach(() => {
    storage = new StorageService();
    mockStorageFrom = supabase.storage.from as jest.Mock;
    mockDbFrom = supabase.from as jest.Mock;
    mockGetUser = supabase.auth.getUser as jest.Mock;
    jest.clearAllMocks();
    
    // Mock authenticated user by default
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
  });

  describe('uploadFile', () => {
    it('should successfully upload a valid PDF file', async () => {
      // Mock successful upload
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'user-123/file-456.pdf' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/user-123/file-456.pdf' },
        }),
      });

      const userId = 'user-123';
      const file = {
        name: 'document.pdf',
        data: Buffer.from('test pdf content'),
        type: 'application/pdf',
      };

      const result = await storage.uploadFile(userId, file);

      expect(result).toBeDefined();
      expect(result.fileId).toBeDefined();
      expect(result.url).toBe('https://example.com/user-123/file-456.pdf');
      expect(result.path).toBe('user-123/file-456.pdf');
      expect(result.fileId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should successfully upload a text file', async () => {
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'user-123/file-789.txt' },
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/user-123/file-789.txt' },
        }),
      });

      const userId = 'user-123';
      const file = {
        name: 'notes.txt',
        data: Buffer.from('test text content'),
        type: 'text/plain',
      };

      const result = await storage.uploadFile(userId, file);

      expect(result).toBeDefined();
      expect(result.fileId).toBeDefined();
      expect(result.url).toBe('https://example.com/user-123/file-789.txt');
      expect(result.path).toBe('user-123/file-789.txt');
    });

    it('should handle storage service errors', async () => {
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage service error' },
        }),
      });

      const userId = 'user-123';
      const file = {
        name: 'document.pdf',
        data: Buffer.from('test content'),
        type: 'application/pdf',
      };

      await expect(storage.uploadFile(userId, file)).rejects.toThrow('Failed to upload file. Please try again.');
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      // Mock file ownership check
      mockDbFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'user-123' },
          error: null,
        }),
      });
      
      // Mock database query for storage path
      mockDbFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { storage_path: 'user-123/file-456.pdf' },
          error: null,
        }),
      });

      // Mock storage deletion
      mockStorageFrom.mockReturnValue({
        remove: jest.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      });

      const userId = 'user-123';
      const fileId = 'file-456';

      await expect(storage.deleteFile(userId, fileId)).resolves.not.toThrow();
    });

    it('should handle deletion errors', async () => {
      // Mock file ownership check returning no file
      mockDbFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        }),
      });

      const userId = 'user-123';
      const fileId = 'nonexistent-file';

      await expect(storage.deleteFile(userId, fileId)).rejects.toThrow('Failed to verify file ownership');
    });
  });

  describe('getFileUrl', () => {
    it('should generate a signed URL for a file', async () => {
      // Mock file ownership check
      mockDbFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { user_id: 'user-123' },
          error: null,
        }),
      });
      
      // Mock database query for storage path
      mockDbFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { storage_path: 'user-123/file-456.pdf' },
          error: null,
        }),
      });

      // Mock signed URL generation
      mockStorageFrom.mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: 'https://example.com/signed-url' },
          error: null,
        }),
      });

      const userId = 'user-123';
      const fileId = 'file-456';

      const url = await storage.getFileUrl(userId, fileId);

      expect(url).toBe('https://example.com/signed-url');
    });

    it('should handle URL generation errors', async () => {
      // Mock file ownership check returning no file
      mockDbFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to find file' },
        }),
      });

      const userId = 'user-123';
      const fileId = 'file-456';

      await expect(storage.getFileUrl(userId, fileId)).rejects.toThrow('Failed to verify file ownership');
    });
  });

  describe('getUserStorageUsage', () => {
    it('should calculate total storage usage for a user', async () => {
      mockDbFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [
            { file_size: 1024 * 1024 }, // 1MB
            { file_size: 2 * 1024 * 1024 }, // 2MB
            { file_size: 512 * 1024 }, // 512KB
          ],
          error: null,
        }),
      });

      const userId = 'user-123';
      const usage = await storage.getUserStorageUsage(userId);

      expect(usage).toBe(3.5 * 1024 * 1024); // 3.5MB in bytes
    });

    it('should return 0 for users with no files', async () => {
      mockDbFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const userId = 'user-123';
      const usage = await storage.getUserStorageUsage(userId);

      expect(usage).toBe(0);
    });
  });
});
