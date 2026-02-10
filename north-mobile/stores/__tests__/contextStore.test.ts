/**
 * Context Store Tests
 * 
 * Basic unit tests for the context store to verify core functionality.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useContextStore } from '../contextStore';
import type { ContextCategory } from '@/types';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'user-123' } },
        error: null,
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-id',
              userId: 'user-123',
              category: 'values' as ContextCategory,
              content: 'Test value',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('contextStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useContextStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('should have empty items array', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.items).toEqual([]);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.error).toBeNull();
    });

    it('should have no lastSynced timestamp initially', () => {
      const { result } = renderHook(() => useContextStore());
      expect(result.current.lastSynced).toBeNull();
    });
  });

  describe('canAddMore', () => {
    it('should allow Pro users to add unlimited items', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Add 5 items (more than free tier limit)
      act(() => {
        result.current.items = Array(5).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(true)).toBe(true);
    });

    it('should limit free users to 3 items', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Add 2 items
      act(() => {
        result.current.items = Array(2).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(false)).toBe(true);

      // Add 3rd item
      act(() => {
        result.current.items = Array(3).fill(null).map((_, i) => ({
          id: `item-${i}`,
          userId: 'user-123',
          category: 'values' as ContextCategory,
          content: `Value ${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      });

      expect(result.current.canAddMore(false)).toBe(false);
    });
  });

  describe('getByCategory', () => {
    it('should filter items by category', () => {
      const { result } = renderHook(() => useContextStore());
      
      act(() => {
        result.current.items = [
          {
            id: '1',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '2',
            userId: 'user-123',
            category: 'goals' as ContextCategory,
            content: 'Goal 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: '3',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 2',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      });

      const values = result.current.getByCategory('values');
      expect(values).toHaveLength(2);
      expect(values[0].content).toBe('Value 1');
      expect(values[1].content).toBe('Value 2');

      const goals = result.current.getByCategory('goals');
      expect(goals).toHaveLength(1);
      expect(goals[0].content).toBe('Goal 1');
    });

    it('should return empty array for category with no items', () => {
      const { result } = renderHook(() => useContextStore());
      
      const projects = result.current.getByCategory('projects');
      expect(projects).toEqual([]);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Set an error
      act(() => {
        result.current.error = 'Test error';
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useContextStore());
      
      // Set some state
      act(() => {
        result.current.items = [
          {
            id: '1',
            userId: 'user-123',
            category: 'values' as ContextCategory,
            content: 'Value 1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        result.current.error = 'Test error';
        result.current.lastSynced = Date.now();
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSynced).toBeNull();
    });
  });

  describe('File Attachment Methods', () => {
    describe('addFileAttachment', () => {
      it('should add a file attachment with valid metadata', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockFileAttachment = {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_type: 'pdf' as const,
          file_size: 1024000,
          upload_date: new Date().toISOString(),
          storage_path: 'user-123/file-123.pdf',
          storage_url: 'https://storage.url/file.pdf',
          extracted_content: 'Test content',
          extraction_success: true,
          extraction_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Mock Supabase insert
        const mockInsert = jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockFileAttachment, error: null })),
          })),
        }));

        // Mock getStorageUsage (for quota check)
        const mockFiles = [
          { file_size: 10 * 1024 * 1024 }, // 10MB existing
        ];

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'file_attachments') {
            return {
              select: mockSelect,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'test.pdf',
          fileType: 'pdf' as const,
          fileSize: 1024000,
          uploadDate: new Date(),
        };

        let attachment;
        await act(async () => {
          attachment = await result.current.addFileAttachment(
            'user-123',
            metadata,
            'Test content',
            'https://storage.url/file.pdf',
            'user-123/file-123.pdf'
          );
        });

        expect(mockFrom).toHaveBeenCalledWith('file_attachments');
        expect(attachment).toEqual(mockFileAttachment);
      });

      it('should handle extraction failure gracefully', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockFileAttachment = {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_type: 'pdf' as const,
          file_size: 1024000,
          upload_date: new Date().toISOString(),
          storage_path: 'user-123/file-123.pdf',
          storage_url: 'https://storage.url/file.pdf',
          extracted_content: null,
          extraction_success: false,
          extraction_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockInsert = jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockFileAttachment, error: null })),
          })),
        }));

        // Mock getStorageUsage (for quota check)
        const mockFiles = [
          { file_size: 10 * 1024 * 1024 }, // 10MB existing
        ];

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'file_attachments') {
            return {
              select: mockSelect,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'test.pdf',
          fileType: 'pdf' as const,
          fileSize: 1024000,
          uploadDate: new Date(),
        };

        let attachment;
        await act(async () => {
          attachment = await result.current.addFileAttachment(
            'user-123',
            metadata,
            '', // Empty content indicates extraction failure
            'https://storage.url/file.pdf',
            'user-123/file-123.pdf'
          );
        });

        expect(attachment).toEqual(mockFileAttachment);
      });

      it('should reject upload when quota would be exceeded', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock getStorageUsage to return 95MB used
        const mockFiles = [
          { file_size: 95 * 1024 * 1024 }, // 95MB
        ];

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'large-file.pdf',
          fileType: 'pdf' as const,
          fileSize: 10 * 1024 * 1024, // 10MB - would exceed 100MB quota
          uploadDate: new Date(),
        };

        await act(async () => {
          await expect(
            result.current.addFileAttachment(
              'user-123',
              metadata,
              'Test content',
              'https://storage.url/file.pdf',
              'user-123/file-123.pdf'
            )
          ).rejects.toThrow(/Storage quota exceeded/);
        });

        expect(result.current.error).toContain('Storage quota exceeded');
        expect(result.current.error).toContain('MB remaining');
      });

      it('should allow upload when exactly at quota limit', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock getStorageUsage to return 95MB used
        const mockFiles = [
          { file_size: 95 * 1024 * 1024 }, // 95MB
        ];

        const mockFileAttachment = {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'exact-fit.pdf',
          file_type: 'pdf' as const,
          file_size: 5 * 1024 * 1024, // 5MB - exactly at 100MB quota
          upload_date: new Date().toISOString(),
          storage_path: 'user-123/file-123.pdf',
          storage_url: 'https://storage.url/file.pdf',
          extracted_content: 'Test content',
          extraction_success: true,
          extraction_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockInsert = jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockFileAttachment, error: null })),
          })),
        }));

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'file_attachments') {
            return {
              select: mockSelect,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'exact-fit.pdf',
          fileType: 'pdf' as const,
          fileSize: 5 * 1024 * 1024, // 5MB
          uploadDate: new Date(),
        };

        let attachment;
        await act(async () => {
          attachment = await result.current.addFileAttachment(
            'user-123',
            metadata,
            'Test content',
            'https://storage.url/file.pdf',
            'user-123/file-123.pdf'
          );
        });

        expect(attachment).toEqual(mockFileAttachment);
      });

      it('should warn when quota reaches 80% threshold', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock console.warn to capture warning
        const originalWarn = console.warn;
        const mockWarn = jest.fn();
        console.warn = mockWarn;

        // Mock getStorageUsage to return 75MB used (75%)
        const mockFiles = [
          { file_size: 75 * 1024 * 1024 }, // 75MB
        ];

        const mockFileAttachment = {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_type: 'pdf' as const,
          file_size: 10 * 1024 * 1024, // 10MB - will push to 85%
          upload_date: new Date().toISOString(),
          storage_path: 'user-123/file-123.pdf',
          storage_url: 'https://storage.url/file.pdf',
          extracted_content: 'Test content',
          extraction_success: true,
          extraction_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockInsert = jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockFileAttachment, error: null })),
          })),
        }));

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'file_attachments') {
            return {
              select: mockSelect,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'test.pdf',
          fileType: 'pdf' as const,
          fileSize: 10 * 1024 * 1024, // 10MB
          uploadDate: new Date(),
        };

        await act(async () => {
          await result.current.addFileAttachment(
            'user-123',
            metadata,
            'Test content',
            'https://storage.url/file.pdf',
            'user-123/file-123.pdf'
          );
        });

        // Verify warning was logged
        expect(mockWarn).toHaveBeenCalledWith(
          '[ContextStore]',
          expect.stringContaining('Warning: You are now using')
        );
        expect(mockWarn).toHaveBeenCalledWith(
          '[ContextStore]',
          expect.stringContaining('85%')
        );

        // Restore console.warn
        console.warn = originalWarn;
      });

      it('should not warn when already above 80% threshold', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock console.warn to capture warning
        const originalWarn = console.warn;
        const mockWarn = jest.fn();
        console.warn = mockWarn;

        // Mock getStorageUsage to return 85MB used (85%)
        const mockFiles = [
          { file_size: 85 * 1024 * 1024 }, // 85MB
        ];

        const mockFileAttachment = {
          id: 'file-123',
          user_id: 'user-123',
          filename: 'test.pdf',
          file_type: 'pdf' as const,
          file_size: 5 * 1024 * 1024, // 5MB - will push to 90%
          upload_date: new Date().toISOString(),
          storage_path: 'user-123/file-123.pdf',
          storage_url: 'https://storage.url/file.pdf',
          extracted_content: 'Test content',
          extraction_success: true,
          extraction_error: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const mockInsert = jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockFileAttachment, error: null })),
          })),
        }));

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'file_attachments') {
            return {
              select: mockSelect,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        const metadata = {
          filename: 'test.pdf',
          fileType: 'pdf' as const,
          fileSize: 5 * 1024 * 1024, // 5MB
          uploadDate: new Date(),
        };

        await act(async () => {
          await result.current.addFileAttachment(
            'user-123',
            metadata,
            'Test content',
            'https://storage.url/file.pdf',
            'user-123/file-123.pdf'
          );
        });

        // Verify warning was NOT logged (already above threshold)
        expect(mockWarn).not.toHaveBeenCalled();

        // Restore console.warn
        console.warn = originalWarn;
      });
    });

    describe('getFileAttachments', () => {
      it('should retrieve all user files', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockFiles = [
          {
            id: 'file-1',
            user_id: 'user-123',
            filename: 'file1.pdf',
            file_type: 'pdf' as const,
            file_size: 1024,
            upload_date: new Date().toISOString(),
            storage_path: 'user-123/file-1.pdf',
            storage_url: 'https://storage.url/file1.pdf',
            extracted_content: 'Content 1',
            extraction_success: true,
            extraction_error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'file-2',
            user_id: 'user-123',
            filename: 'file2.txt',
            file_type: 'txt' as const,
            file_size: 512,
            upload_date: new Date().toISOString(),
            storage_path: 'user-123/file-2.txt',
            storage_url: 'https://storage.url/file2.txt',
            extracted_content: 'Content 2',
            extraction_success: true,
            extraction_error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        const mockOrder = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockEq = jest.fn(() => ({ order: mockOrder }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let files;
        await act(async () => {
          files = await result.current.getFileAttachments('user-123');
        });

        expect(mockFrom).toHaveBeenCalledWith('file_attachments');
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(files).toEqual(mockFiles);
      });

      it('should return empty array when user has no files', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockOrder = jest.fn(() => Promise.resolve({ data: [], error: null }));
        const mockEq = jest.fn(() => ({ order: mockOrder }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let files;
        await act(async () => {
          files = await result.current.getFileAttachments('user-123');
        });

        expect(files).toEqual([]);
      });
    });

    describe('deleteFileAttachment', () => {
      it('should delete a file attachment', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock file ownership check (first call)
        const mockOwnershipSingle = jest.fn(() => Promise.resolve({
          data: { user_id: 'user-123' },
          error: null,
        }));
        const mockOwnershipEq = jest.fn(() => ({ single: mockOwnershipSingle }));
        const mockOwnershipSelect = jest.fn(() => ({ eq: mockOwnershipEq }));
        
        // Mock delete operation (second call)
        const mockEq2 = jest.fn(() => Promise.resolve({ error: null }));
        const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
        const mockDelete = jest.fn(() => ({ eq: mockEq1 }));
        
        let callCount = 0;
        const mockFrom = jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: ownership check
            return { select: mockOwnershipSelect };
          } else {
            // Second call: delete operation
            return { delete: mockDelete };
          }
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        await act(async () => {
          await result.current.deleteFileAttachment('user-123', 'file-123');
        });

        expect(mockFrom).toHaveBeenCalledWith('file_attachments');
        expect(mockEq1).toHaveBeenCalledWith('id', 'file-123');
        expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
      });

      it('should throw error if deletion fails', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock file ownership check returning error
        const mockOwnershipSingle = jest.fn(() => Promise.resolve({
          data: null,
          error: { message: 'File not found' },
        }));
        const mockOwnershipEq = jest.fn(() => ({ single: mockOwnershipSingle }));
        const mockOwnershipSelect = jest.fn(() => ({ eq: mockOwnershipEq }));
        const mockFrom = jest.fn(() => ({ select: mockOwnershipSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        await act(async () => {
          await expect(
            result.current.deleteFileAttachment('user-123', 'file-123')
          ).rejects.toThrow('File not found');
        });
      });
    });

    describe('updateFileName', () => {
      it('should update a file name', async () => {
        const { result } = renderHook(() => useContextStore());
        
        // Mock file ownership check (first call)
        const mockOwnershipSingle = jest.fn(() => Promise.resolve({
          data: { user_id: 'user-123' },
          error: null,
        }));
        const mockOwnershipEq = jest.fn(() => ({ single: mockOwnershipSingle }));
        const mockOwnershipSelect = jest.fn(() => ({ eq: mockOwnershipEq }));
        
        // Mock update operation (second call)
        const mockEq2 = jest.fn(() => Promise.resolve({ error: null }));
        const mockEq1 = jest.fn(() => ({ eq: mockEq2 }));
        const mockUpdate = jest.fn(() => ({ eq: mockEq1 }));
        
        let callCount = 0;
        const mockFrom = jest.fn(() => {
          callCount++;
          if (callCount === 1) {
            // First call: ownership check
            return { select: mockOwnershipSelect };
          } else {
            // Second call: update operation
            return { update: mockUpdate };
          }
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        await act(async () => {
          await result.current.updateFileName('user-123', 'file-123', 'new-name.pdf');
        });

        expect(mockFrom).toHaveBeenCalledWith('file_attachments');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
          filename: 'new-name.pdf',
        }));
        expect(mockEq1).toHaveBeenCalledWith('id', 'file-123');
        expect(mockEq2).toHaveBeenCalledWith('user_id', 'user-123');
      });
    });

    describe('getStorageUsage', () => {
      it('should calculate storage usage correctly', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockFiles = [
          { file_size: 10 * 1024 * 1024 }, // 10MB
          { file_size: 5 * 1024 * 1024 },  // 5MB
          { file_size: 2 * 1024 * 1024 },  // 2MB
        ];

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let usage;
        await act(async () => {
          usage = await result.current.getStorageUsage('user-123');
        });

        const expectedUsed = 17 * 1024 * 1024; // 17MB
        const expectedTotal = 100 * 1024 * 1024; // 100MB
        const expectedPercentage = 17;

        expect(usage).toEqual({
          usedBytes: expectedUsed,
          totalBytes: expectedTotal,
          percentageUsed: expectedPercentage,
        });
      });

      it('should return zero usage when user has no files', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockEq = jest.fn(() => Promise.resolve({ data: [], error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let usage;
        await act(async () => {
          usage = await result.current.getStorageUsage('user-123');
        });

        expect(usage).toEqual({
          usedBytes: 0,
          totalBytes: 100 * 1024 * 1024,
          percentageUsed: 0,
        });
      });
    });

    describe('setSessionFiles', () => {
      it('should set session-specific files', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
        const mockDeleteEq = jest.fn(() => Promise.resolve({ error: null }));
        const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
        const mockFrom = jest.fn((table: string) => {
          if (table === 'session_file_selections') {
            return {
              delete: mockDelete,
              insert: mockInsert,
            };
          }
          return {};
        });

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        await act(async () => {
          await result.current.setSessionFiles('session-123', ['file-1', 'file-2']);
        });

        expect(mockDeleteEq).toHaveBeenCalledWith('session_id', 'session-123');
        expect(mockInsert).toHaveBeenCalledWith([
          { session_id: 'session-123', file_id: 'file-1' },
          { session_id: 'session-123', file_id: 'file-2' },
        ]);
      });

      it('should clear session files when empty array provided', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
        const mockDeleteEq = jest.fn(() => Promise.resolve({ error: null }));
        const mockDelete = jest.fn(() => ({ eq: mockDeleteEq }));
        const mockFrom = jest.fn(() => ({
          delete: mockDelete,
          insert: mockInsert,
        }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        await act(async () => {
          await result.current.setSessionFiles('session-123', []);
        });

        expect(mockDeleteEq).toHaveBeenCalledWith('session_id', 'session-123');
        expect(mockInsert).not.toHaveBeenCalled();
      });
    });

    describe('getSessionFiles', () => {
      it('should retrieve session-specific files', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockFiles = [
          {
            file_id: 'file-1',
            file_attachments: {
              id: 'file-1',
              user_id: 'user-123',
              filename: 'file1.pdf',
              file_type: 'pdf' as const,
              file_size: 1024,
              upload_date: new Date().toISOString(),
              storage_path: 'user-123/file-1.pdf',
              storage_url: 'https://storage.url/file1.pdf',
              extracted_content: 'Content 1',
              extraction_success: true,
              extraction_error: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        ];

        const mockEq = jest.fn(() => Promise.resolve({ data: mockFiles, error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let files;
        await act(async () => {
          files = await result.current.getSessionFiles('session-123');
        });

        expect(mockFrom).toHaveBeenCalledWith('session_file_selections');
        expect(mockEq).toHaveBeenCalledWith('session_id', 'session-123');
        expect(files).toEqual([mockFiles[0].file_attachments]);
      });

      it('should return empty array when no files selected for session', async () => {
        const { result } = renderHook(() => useContextStore());
        
        const mockEq = jest.fn(() => Promise.resolve({ data: [], error: null }));
        const mockSelect = jest.fn(() => ({ eq: mockEq }));
        const mockFrom = jest.fn(() => ({ select: mockSelect }));

        const { supabase } = require('@/lib/supabase');
        supabase.from = mockFrom;

        let files;
        await act(async () => {
          files = await result.current.getSessionFiles('session-123');
        });

        expect(files).toEqual([]);
      });
    });
  });
});
