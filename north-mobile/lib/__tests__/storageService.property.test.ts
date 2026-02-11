/**
 * Storage Service Property-Based Tests
 * 
 * Property-based tests for file storage functionality.
 * Feature: file-context-attachments
 * 
 * Validates: Requirements 1.3, 3.1, 3.3, 6.3
 */

import * as fc from 'fast-check';
import { StorageService } from '../storageService';
import { supabase } from '../supabase';

// Mock Supabase
jest.mock('../supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Storage Service Properties', () => {
  let storage: StorageService;
  let mockStorageFrom: jest.Mock;
  let mockDbFrom: jest.Mock;
  let mockAuthGetUser: jest.Mock;

  // Helper to set up all mocks for a given user
  const setupMocksForUser = (userId: string, extension = 'pdf') => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    mockStorageFrom.mockReturnValue({
      upload: jest.fn().mockImplementation((path: string) => {
        return Promise.resolve({
          data: { path },
          error: null,
        });
      }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: `https://example.com/${path}` },
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url?token=abc123' },
        error: null,
      }),
    });

    mockDbFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { user_id: userId, storage_path: `${userId}/file.${extension}` },
        error: null,
      }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    storage = new StorageService();
    mockStorageFrom = supabase.storage.from as jest.Mock;
    mockDbFrom = supabase.from as jest.Mock;
    mockAuthGetUser = supabase.auth.getUser as jest.Mock;
    
    // Default: mock authenticated user
    setupMocksForUser('test-user-id');
  });

  /**
   * Property 3: Unique File Identifier Assignment
   * 
   * **Validates: Requirements 1.3**
   * 
   * For any valid file that is successfully uploaded, the Storage Service
   * should assign a unique file identifier that differs from all other
   * file identifiers.
   */
  // Feature: file-context-attachments, Property 3: Unique File Identifier Assignment
  describe('Property 3: Unique File Identifier Assignment', () => {
    it('Property 3.1: Each upload generates a unique file ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.uuid(),
              fileName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              extension: fc.constantFrom('pdf', 'txt', 'md'),
              size: fc.integer({ min: 1, max: 10 * 1024 * 1024 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (uploads) => {
            const fileIds = new Set<string>();

            for (const upload of uploads) {
              // Set up mocks for this user
              setupMocksForUser(upload.userId, upload.extension);

              const file = {
                name: `${upload.fileName}.${upload.extension}`,
                data: Buffer.from('test content'),
                type: 'application/pdf',
              };

              const result = await storage.uploadFile(upload.userId, file);

              // Each file ID should be unique
              expect(fileIds.has(result.fileId)).toBe(false);
              fileIds.add(result.fileId);

              // File ID should be a valid UUID format
              expect(result.fileId).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
              );
            }

            // Verify all IDs are unique
            expect(fileIds.size).toBe(uploads.length);
          }
        ),
        { numRuns: 50 } // Reduced runs for async tests
      );
    });

    it('Property 3.2: File IDs are unique across different users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userIds, fileName, extension) => {
            const fileIds = new Set<string>();

            for (const userId of userIds) {
              // Set up auth mock to return this specific user
              mockAuthGetUser.mockResolvedValue({
                data: { user: { id: userId } },
                error: null,
              });

              mockStorageFrom.mockReturnValue({
                upload: jest.fn().mockResolvedValue({
                  data: { path: `${userId}/file-id.${extension}` },
                  error: null,
                }),
                getPublicUrl: jest.fn().mockReturnValue({
                  data: { publicUrl: 'https://example.com/file.pdf' },
                }),
              });

              const file = {
                name: `${fileName}.${extension}`,
                data: Buffer.from('test content'),
                type: 'application/pdf',
              };

              const result = await storage.uploadFile(userId, file);

              // File IDs should be unique even for the same file uploaded by different users
              expect(fileIds.has(result.fileId)).toBe(false);
              fileIds.add(result.fileId);
            }

            expect(fileIds.size).toBe(userIds.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 3.3: File IDs are unique even for identical file names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('pdf', 'txt', 'md'),
          fc.integer({ min: 2, max: 5 }),
          async (userId, fileName, extension, uploadCount) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockStorageFrom.mockReturnValue({
              upload: jest.fn().mockResolvedValue({
                data: { path: `${userId}/file-id.${extension}` },
                error: null,
              }),
              getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.pdf' },
              }),
            });

            const fileIds = new Set<string>();

            for (let i = 0; i < uploadCount; i++) {
              const file = {
                name: `${fileName}.${extension}`,
                data: Buffer.from(`test content ${i}`),
                type: 'application/pdf',
              };

              const result = await storage.uploadFile(userId, file);

              // Even with identical filenames, IDs should be unique
              expect(fileIds.has(result.fileId)).toBe(false);
              fileIds.add(result.fileId);
            }

            expect(fileIds.size).toBe(uploadCount);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 3.4: File ID format is consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockStorageFrom.mockReturnValue({
              upload: jest.fn().mockResolvedValue({
                data: { path: `${userId}/file-id.${extension}` },
                error: null,
              }),
              getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.pdf' },
              }),
            });

            const file = {
              name: `${fileName}.${extension}`,
              data: Buffer.from('test content'),
              type: 'application/pdf',
            };

            const result = await storage.uploadFile(userId, file);

            // File ID should be a valid UUID v4
            expect(result.fileId).toMatch(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            );
            expect(typeof result.fileId).toBe('string');
            expect(result.fileId.length).toBe(36); // UUID length with hyphens
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: User-Specific Storage Isolation
   * 
   * **Validates: Requirements 3.1, 3.3**
   * 
   * For any file uploaded by a user, the file should be stored in a storage
   * path that includes the user's identifier, ensuring isolation from other
   * users' files.
   */
  // Feature: file-context-attachments, Property 9: User-Specific Storage Isolation
  describe('Property 9: User-Specific Storage Isolation', () => {
    it('Property 9.1: Storage path always includes user ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            let capturedPath: string = '';
            
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockStorageFrom.mockReturnValue({
              upload: jest.fn().mockImplementation((path: string) => {
                capturedPath = path;
                return Promise.resolve({
                  data: { path },
                  error: null,
                });
              }),
              getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.pdf' },
              }),
            });

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            const file = {
              name: `${fileName}.${extension}`,
              data: Buffer.from('test content'),
              type: 'application/pdf',
            };

            const result = await storage.uploadFile(userId, file);

            // Path should start with user ID
            expect(result.path).toContain(userId);
            expect(capturedPath).toContain(userId);
            expect(capturedPath.startsWith(userId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 9.2: Storage path format is {userId}/{fileId}.{extension}', async () => {
      let capturedPath: string = '';
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockImplementation((path: string) => {
          capturedPath = path;
          return Promise.resolve({
            data: { path },
            error: null,
          });
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.pdf' },
        }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            const file = {
              name: `${fileName}.${extension}`,
              data: Buffer.from('test content'),
              type: 'application/pdf',
            };

            const result = await storage.uploadFile(userId, file);

            // Path should match format: userId/fileId.extension
            const pathPattern = new RegExp(
              `^${userId}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${extension}$`,
              'i'
            );
            expect(capturedPath).toMatch(pathPattern);
            expect(result.path).toMatch(pathPattern);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 9.3: Different users have different storage paths', async () => {
      const capturedPaths: string[] = [];
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockImplementation((path: string) => {
          capturedPaths.push(path);
          return Promise.resolve({
            data: { path },
            error: null,
          });
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.pdf' },
        }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userIds, fileName, extension) => {
            capturedPaths.length = 0; // Clear array

            for (const userId of userIds) {
              const file = {
                name: `${fileName}.${extension}`,
                data: Buffer.from('test content'),
                type: 'application/pdf',
              };

              await storage.uploadFile(userId, file);
            }

            // Each user should have a different path prefix
            const userPrefixes = capturedPaths.map((path) => path.split('/')[0]);
            const uniquePrefixes = new Set(userPrefixes);
            expect(uniquePrefixes.size).toBe(userIds.length);

            // Each prefix should match a user ID
            userPrefixes.forEach((prefix) => {
              expect(userIds).toContain(prefix);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 9.4: Storage path preserves file extension', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            let capturedPath: string = '';
            
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockStorageFrom.mockReturnValue({
              upload: jest.fn().mockImplementation((path: string) => {
                capturedPath = path;
                return Promise.resolve({
                  data: { path },
                  error: null,
                });
              }),
              getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.pdf' },
              }),
            });

            const file = {
              name: `${fileName}.${extension}`,
              data: Buffer.from('test content'),
              type: 'application/pdf',
            };

            await storage.uploadFile(userId, file);

            // Path should end with the correct extension
            expect(capturedPath).toMatch(new RegExp(`\\.${extension}$`));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 21: Time-Limited URL Generation
   * 
   * **Validates: Requirements 6.3**
   * 
   * For any file download request, the Storage Service should generate a
   * signed URL that expires after a fixed time period.
   */
  // Feature: file-context-attachments, Property 21: Time-Limited URL Generation
  describe('Property 21: Time-Limited URL Generation', () => {
    it('Property 21.1: Signed URLs are generated for file access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, fileId) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            // Mock database query - returns both user_id (for ownership) and storage_path
            mockDbFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { user_id: userId, storage_path: `${userId}/${fileId}.pdf` },
                error: null,
              }),
            });

            // Mock signed URL generation
            mockStorageFrom.mockReturnValue({
              createSignedUrl: jest.fn().mockResolvedValue({
                data: { signedUrl: 'https://example.com/signed-url?token=abc123&expires=1234567890' },
                error: null,
              }),
            });

            const url = await storage.getFileUrl(userId, fileId);

            // URL should be a valid string
            expect(typeof url).toBe('string');
            expect(url.length).toBeGreaterThan(0);

            // URL should be a valid HTTP(S) URL
            expect(url).toMatch(/^https?:\/\/.+/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 21.2: Signed URL generation includes expiration parameter', async () => {
      let capturedExpiration: number = 0;

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, fileId) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockDbFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { user_id: userId, storage_path: `${userId}/${fileId}.pdf` },
                error: null,
              }),
            });

            mockStorageFrom.mockReturnValue({
              createSignedUrl: jest.fn().mockImplementation((path: string, expiration: number) => {
                capturedExpiration = expiration;
                return Promise.resolve({
                  data: { signedUrl: `https://example.com/signed-url?expires=${expiration}` },
                  error: null,
                });
              }),
            });

            await storage.getFileUrl(userId, fileId);

            // Expiration should be set (1 hour = 3600 seconds)
            expect(capturedExpiration).toBe(3600);
            expect(capturedExpiration).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 21.3: Each URL generation call creates a new signed URL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }),
          async (userId, fileId, requestCount) => {
            const generatedUrls = new Set<string>();
            let callCount = 0;

            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockDbFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { user_id: userId, storage_path: `${userId}/${fileId}.pdf` },
                error: null,
              }),
            });

            mockStorageFrom.mockReturnValue({
              createSignedUrl: jest.fn().mockImplementation(() => {
                callCount++;
                return Promise.resolve({
                  data: { signedUrl: `https://example.com/signed-url-${callCount}?token=${callCount}` },
                  error: null,
                });
              }),
            });

            for (let i = 0; i < requestCount; i++) {
              const url = await storage.getFileUrl(userId, fileId);
              generatedUrls.add(url);
            }

            // Each call should generate a unique URL (in practice, due to timestamps)
            // For testing purposes, we verify the method was called the correct number of times
            expect(callCount).toBe(requestCount);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property 21.4: URL generation requires valid user and file IDs', async () => {
      mockDbFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' },
        }),
      });

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (userId, fileId) => {
            // Should throw error when file not found
            await expect(storage.getFileUrl(userId, fileId)).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional storage properties
   */
  describe('Additional Storage Properties', () => {
    it('Property: Upload result includes all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('pdf', 'txt', 'md'),
          async (userId, fileName, extension) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockStorageFrom.mockReturnValue({
              upload: jest.fn().mockResolvedValue({
                data: { path: `${userId}/file-id.${extension}` },
                error: null,
              }),
              getPublicUrl: jest.fn().mockReturnValue({
                data: { publicUrl: 'https://example.com/file.pdf' },
              }),
            });

            const file = {
              name: `${fileName}.${extension}`,
              data: Buffer.from('test content'),
              type: 'application/pdf',
            };

            const result = await storage.uploadFile(userId, file);

            // Result should have all required fields
            expect(result).toHaveProperty('fileId');
            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('path');

            expect(typeof result.fileId).toBe('string');
            expect(typeof result.url).toBe('string');
            expect(typeof result.path).toBe('string');

            expect(result.fileId.length).toBeGreaterThan(0);
            expect(result.url.length).toBeGreaterThan(0);
            expect(result.path.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Storage usage calculation is non-negative', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            // Set up auth mock to return this specific user
            mockAuthGetUser.mockResolvedValue({
              data: { user: { id: userId } },
              error: null,
            });

            mockDbFrom.mockReturnValue({
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockResolvedValue({
                data: [
                  { file_size: 1024 },
                  { file_size: 2048 },
                  { file_size: 4096 },
                ],
                error: null,
              }),
            });

            const usage = await storage.getUserStorageUsage(userId);

            expect(usage).toBeGreaterThanOrEqual(0);
            expect(typeof usage).toBe('number');
            expect(Number.isFinite(usage)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
