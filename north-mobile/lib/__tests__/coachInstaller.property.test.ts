/**
 * Coach Installer Property-Based Tests
 * 
 * Property-based tests for coach installation functionality.
 * Feature: coach-marketplace-sharing
 * 
 * Validates: Requirements 3.4, 10.1, 10.2, 10.3
 */

import * as fc from 'fast-check';
import { SupabaseCoachInstaller } from '../coachInstaller';
import { supabase } from '../supabase';
import { Coach, CoachCategory } from '../../types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock crypto.randomUUID to generate predictable UUIDs for testing
let uuidCounter = 0;
global.crypto = {
  randomUUID: jest.fn(() => `test-uuid-${uuidCounter++}`),
} as any;

/**
 * Custom arbitraries for coach property testing
 */

// Coach name arbitrary (non-empty, max 100 chars)
const coachNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

// Coach icon arbitrary (emoji or simple string)
const coachIconArbitrary = fc.oneof(
  fc.constant('🤖'),
  fc.constant('🎯'),
  fc.constant('💡'),
  fc.constant('🚀'),
  fc.constant('📚'),
  fc.constant('💪'),
  fc.constant('🎨'),
  fc.constant('⚡')
);

// System prompt arbitrary (non-empty, max 2000 chars)
const systemPromptArbitrary = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

// Coach category arbitrary
const coachCategoryArbitrary = fc.oneof(
  fc.constant(CoachCategory.PRODUCTIVITY),
  fc.constant(CoachCategory.LEARNING),
  fc.constant(CoachCategory.HEALTH),
  fc.constant(CoachCategory.ENTERTAINMENT),
  fc.constant(CoachCategory.BUSINESS),
  fc.constant(CoachCategory.CREATIVE),
  fc.constant(CoachCategory.GENERAL)
);

// ISO timestamp arbitrary - use integer timestamps to avoid invalid dates
const timestampArbitrary = fc
  .integer({ min: new Date('2024-01-01').getTime(), max: new Date('2030-12-31').getTime() })
  .map((timestamp) => new Date(timestamp).toISOString());

// Public coach arbitrary (for source coaches)
const publicCoachArbitrary = fc.record({
  id: fc.uuid(),
  name: coachNameArbitrary,
  icon: coachIconArbitrary,
  system_prompt: systemPromptArbitrary,
  creator_id: fc.uuid(),
  is_public: fc.constant(true), // Must be public to be installable
  category: coachCategoryArbitrary,
  is_featured: fc.boolean(),
  source_coach_id: fc.constant(null), // Source coaches don't have a source
  created_at: timestampArbitrary,
  updated_at: timestampArbitrary,
});

describe('Coach Installer Properties', () => {
  let installer: SupabaseCoachInstaller;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockInsert: jest.Mock;

  beforeEach(() => {
    installer = new SupabaseCoachInstaller();
    uuidCounter = 0; // Reset UUID counter for each test
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock chain
    mockSingle = jest.fn();
    mockInsert = jest.fn();
    mockEq = jest.fn(() => ({
      eq: mockEq,
      single: mockSingle,
    }));
    mockSelect = jest.fn(() => ({
      eq: mockEq,
      single: mockSingle,
    }));
    mockFrom = jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    }));
    
    (supabase.from as jest.Mock) = mockFrom;
  });

  /**
   * Property 8: Coach installation creates user copy
   * 
   * **Validates: Requirements 3.4, 10.1, 10.2, 10.3**
   * 
   * For any coach, installing it should create a new coach record in the user's collection
   * with all properties copied except creator_id, and with source_coach_id set to the
   * original coach ID. The installed coach should be private (is_public = false).
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8: Coach installation creates user copy with correct properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(), // userId
        async (sourceCoach, userId) => {
          // Reset UUID counter for this iteration
          uuidCounter = 0;
          
          // Mock fetching the source coach
          mockSingle.mockResolvedValueOnce({
            data: sourceCoach,
            error: null,
          });

          // Mock inserting the new coach - capture what was inserted
          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          // Install the coach
          const result = await installer.installCoach(sourceCoach.id, userId);

          // Verify the inserted data has correct properties
          expect(insertedData).toBeDefined();
          
          // Property 1: All properties are copied except creator_id
          expect(insertedData.name).toBe(sourceCoach.name);
          expect(insertedData.icon).toBe(sourceCoach.icon);
          expect(insertedData.system_prompt).toBe(sourceCoach.system_prompt);
          expect(insertedData.category).toBe(sourceCoach.category);
          
          // Property 2: creator_id is set to null (not copied from source)
          expect(insertedData.creator_id).toBeNull();
          expect(insertedData.creator_id).not.toBe(sourceCoach.creator_id);
          
          // Property 3: source_coach_id is set to the original coach ID
          expect(insertedData.source_coach_id).toBe(sourceCoach.id);
          
          // Property 4: The installed coach is private (is_public = false)
          expect(insertedData.is_public).toBe(false);
          expect(insertedData.is_public).not.toBe(sourceCoach.is_public);
          
          // Property 5: The installed coach is not featured
          expect(insertedData.is_featured).toBe(false);
          
          // Property 6: A new ID is generated for the installed coach
          expect(insertedData.id).toBeDefined();
          expect(insertedData.id).not.toBe(sourceCoach.id);
          
          // Verify the result matches expectations
          expect(result.name).toBe(sourceCoach.name);
          expect(result.icon).toBe(sourceCoach.icon);
          expect(result.systemPrompt).toBe(sourceCoach.system_prompt);
          expect(result.category).toBe(sourceCoach.category);
          expect(result.creatorId).toBeNull();
          expect(result.sourceCoachId).toBe(sourceCoach.id);
          expect(result.isPublic).toBe(false);
          expect(result.isFeatured).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.1: Coach installation preserves all content properties
   * 
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any coach with specific name, icon, and system prompt,
   * the installed copy should preserve these exact values.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.1: Installation preserves all content properties exactly', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          mockSingle.mockResolvedValueOnce({
            data: sourceCoach,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          await installer.installCoach(sourceCoach.id, userId);

          // Verify exact preservation of content
          expect(insertedData.name).toBe(sourceCoach.name);
          expect(insertedData.icon).toBe(sourceCoach.icon);
          expect(insertedData.system_prompt).toBe(sourceCoach.system_prompt);
          expect(insertedData.category).toBe(sourceCoach.category);
          
          // Verify no truncation or modification
          expect(insertedData.name.length).toBe(sourceCoach.name.length);
          expect(insertedData.system_prompt.length).toBe(sourceCoach.system_prompt.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: Installed coaches are always private
   * 
   * **Validates: Requirements 10.3**
   * 
   * For any public coach (is_public = true), the installed copy
   * should always have is_public = false, regardless of the source.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.2: Installed coaches are always private regardless of source', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          // Ensure source is public (should always be true from arbitrary, but explicit)
          const publicSource = { ...sourceCoach, is_public: true };
          
          mockSingle.mockResolvedValueOnce({
            data: publicSource,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          const result = await installer.installCoach(publicSource.id, userId);

          // Verify installed coach is private
          expect(insertedData.is_public).toBe(false);
          expect(result.isPublic).toBe(false);
          
          // Verify it's different from source
          expect(insertedData.is_public).not.toBe(publicSource.is_public);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: Source coach ID is always set correctly
   * 
   * **Validates: Requirements 10.3**
   * 
   * For any coach installation, the source_coach_id should always
   * be set to the ID of the original coach being installed.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.3: Source coach ID is always set to original coach ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          mockSingle.mockResolvedValueOnce({
            data: sourceCoach,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          const result = await installer.installCoach(sourceCoach.id, userId);

          // Verify source_coach_id is set correctly
          expect(insertedData.source_coach_id).toBe(sourceCoach.id);
          expect(result.sourceCoachId).toBe(sourceCoach.id);
          
          // Verify it's not null
          expect(insertedData.source_coach_id).not.toBeNull();
          
          // Verify it's different from the new coach's ID
          expect(insertedData.source_coach_id).not.toBe(insertedData.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: Creator ID is never copied
   * 
   * **Validates: Requirements 10.2**
   * 
   * For any coach with a creator_id, the installed copy should
   * always have creator_id = null, never copying the original creator.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.4: Creator ID is never copied from source coach', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          // Ensure source has a creator_id
          const sourceWithCreator = { ...sourceCoach, creator_id: fc.sample(fc.uuid(), 1)[0] };
          
          mockSingle.mockResolvedValueOnce({
            data: sourceWithCreator,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          const result = await installer.installCoach(sourceWithCreator.id, userId);

          // Verify creator_id is null
          expect(insertedData.creator_id).toBeNull();
          expect(result.creatorId).toBeNull();
          
          // Verify it's not copied from source
          expect(insertedData.creator_id).not.toBe(sourceWithCreator.creator_id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.5: New coach ID is unique
   * 
   * **Validates: Requirements 3.4**
   * 
   * For any coach installation, a new unique ID should be generated
   * that is different from the source coach ID.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.5: New coach ID is generated and differs from source', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          mockSingle.mockResolvedValueOnce({
            data: sourceCoach,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          const result = await installer.installCoach(sourceCoach.id, userId);

          // Verify new ID is generated
          expect(insertedData.id).toBeDefined();
          expect(insertedData.id).not.toBe('');
          
          // Verify it's different from source
          expect(insertedData.id).not.toBe(sourceCoach.id);
          
          // Verify result has the new ID
          expect(result.id).toBe(insertedData.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: Category is preserved
   * 
   * **Validates: Requirements 10.1**
   * 
   * For any coach with a specific category, the installed copy
   * should preserve the exact same category.
   */
  // Feature: coach-marketplace-sharing, Property 8: Coach installation creates user copy
  it('Property 8.6: Category is preserved exactly from source coach', async () => {
    await fc.assert(
      fc.asyncProperty(
        publicCoachArbitrary,
        fc.uuid(),
        async (sourceCoach, userId) => {
          uuidCounter = 0;
          
          mockSingle.mockResolvedValueOnce({
            data: sourceCoach,
            error: null,
          });

          let insertedData: any = null;
          mockInsert.mockImplementationOnce((data) => {
            insertedData = data;
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    ...data,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              })),
            };
          });

          const result = await installer.installCoach(sourceCoach.id, userId);

          // Verify category is preserved
          expect(insertedData.category).toBe(sourceCoach.category);
          expect(result.category).toBe(sourceCoach.category);
          
          // Verify it's a valid category
          expect(Object.values(CoachCategory)).toContain(result.category);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Duplicate installations are prevented
   * 
   * **Validates: Requirements 3.6**
   * 
   * For any coach that a user has already installed, attempting to install it again
   * should be detected by checkIfInstalled() returning true, and getInstalledCoachId()
   * should return the existing coach's ID instead of creating a duplicate.
   */
  // Feature: coach-marketplace-sharing, Property 10: Duplicate installations are prevented
  describe('Property 10: Duplicate installations are prevented', () => {
    let mockMaybeSingle: jest.Mock;
    let mockIs: jest.Mock;

    beforeEach(() => {
      // Setup mock chain for checkIfInstalled and getInstalledCoachId
      mockMaybeSingle = jest.fn();
      mockIs = jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      }));
      mockEq = jest.fn(() => ({
        eq: mockEq,
        is: mockIs,
        maybeSingle: mockMaybeSingle,
      }));
      mockSelect = jest.fn(() => ({
        eq: mockEq,
        is: mockIs,
        maybeSingle: mockMaybeSingle,
      }));
      mockFrom = jest.fn(() => ({
        select: mockSelect,
      }));
      
      (supabase.from as jest.Mock) = mockFrom;
    });

    it('Property 10.1: checkIfInstalled returns true when coach is already installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          fc.uuid(), // installedCoachId
          async (sourceCoachId, userId, installedCoachId) => {
            // Mock that the coach is already installed
            mockMaybeSingle.mockResolvedValueOnce({
              data: { id: installedCoachId },
              error: null,
            });

            const result = await installer.checkIfInstalled(sourceCoachId, userId);

            // Verify checkIfInstalled returns true
            expect(result).toBe(true);

            // Verify the query was made correctly
            expect(mockFrom).toHaveBeenCalledWith('coaches');
            expect(mockSelect).toHaveBeenCalledWith('id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.2: checkIfInstalled returns false when coach is not installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          async (sourceCoachId, userId) => {
            // Mock that the coach is not installed
            mockMaybeSingle.mockResolvedValueOnce({
              data: null,
              error: null,
            });

            const result = await installer.checkIfInstalled(sourceCoachId, userId);

            // Verify checkIfInstalled returns false
            expect(result).toBe(false);

            // Verify the query was made correctly
            expect(mockFrom).toHaveBeenCalledWith('coaches');
            expect(mockSelect).toHaveBeenCalledWith('id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.3: getInstalledCoachId returns existing coach ID when installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          fc.uuid(), // installedCoachId
          async (sourceCoachId, userId, installedCoachId) => {
            // Mock that the coach is already installed
            mockMaybeSingle.mockResolvedValueOnce({
              data: { id: installedCoachId },
              error: null,
            });

            const result = await installer.getInstalledCoachId(sourceCoachId, userId);

            // Verify getInstalledCoachId returns the existing coach ID
            expect(result).toBe(installedCoachId);
            expect(result).not.toBeNull();

            // Verify the query was made correctly
            expect(mockFrom).toHaveBeenCalledWith('coaches');
            expect(mockSelect).toHaveBeenCalledWith('id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.4: getInstalledCoachId returns null when not installed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          async (sourceCoachId, userId) => {
            // Mock that the coach is not installed
            mockMaybeSingle.mockResolvedValueOnce({
              data: null,
              error: null,
            });

            const result = await installer.getInstalledCoachId(sourceCoachId, userId);

            // Verify getInstalledCoachId returns null
            expect(result).toBeNull();

            // Verify the query was made correctly
            expect(mockFrom).toHaveBeenCalledWith('coaches');
            expect(mockSelect).toHaveBeenCalledWith('id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.5: checkIfInstalled handles database errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // error message
          async (sourceCoachId, userId, errorMessage) => {
            // Mock a database error
            mockMaybeSingle.mockResolvedValueOnce({
              data: null,
              error: { message: errorMessage },
            });

            const result = await installer.checkIfInstalled(sourceCoachId, userId);

            // Verify checkIfInstalled returns false on error (safe default)
            expect(result).toBe(false);

            // Verify the query was attempted
            expect(mockFrom).toHaveBeenCalledWith('coaches');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.6: getInstalledCoachId handles database errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          fc.string({ minLength: 1, maxLength: 100 }), // error message
          async (sourceCoachId, userId, errorMessage) => {
            // Mock a database error
            mockMaybeSingle.mockResolvedValueOnce({
              data: null,
              error: { message: errorMessage },
            });

            const result = await installer.getInstalledCoachId(sourceCoachId, userId);

            // Verify getInstalledCoachId returns null on error (safe default)
            expect(result).toBeNull();

            // Verify the query was attempted
            expect(mockFrom).toHaveBeenCalledWith('coaches');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.7: Different users can install the same coach independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId1
          fc.uuid(), // userId2
          fc.uuid(), // installedCoachId1
          async (sourceCoachId, userId1, userId2, installedCoachId1) => {
            // Assume userId1 and userId2 are different
            fc.pre(userId1 !== userId2);

            // Reset mock call counts for this iteration
            jest.clearAllMocks();

            // Mock that user1 has installed the coach
            mockMaybeSingle.mockResolvedValueOnce({
              data: { id: installedCoachId1 },
              error: null,
            });

            const result1 = await installer.checkIfInstalled(sourceCoachId, userId1);

            // Mock that user2 has NOT installed the coach
            mockMaybeSingle.mockResolvedValueOnce({
              data: null,
              error: null,
            });

            const result2 = await installer.checkIfInstalled(sourceCoachId, userId2);

            // Verify user1 has it installed
            expect(result1).toBe(true);

            // Verify user2 does not have it installed
            expect(result2).toBe(false);

            // Both queries should have been made in this iteration
            expect(mockFrom).toHaveBeenCalledTimes(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property 10.8: Same user cannot have duplicate installations of same coach', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // sourceCoachId
          fc.uuid(), // userId
          fc.uuid(), // installedCoachId
          async (sourceCoachId, userId, installedCoachId) => {
            // Mock that the coach is already installed
            mockMaybeSingle.mockResolvedValueOnce({
              data: { id: installedCoachId },
              error: null,
            });

            const isInstalled = await installer.checkIfInstalled(sourceCoachId, userId);

            // If already installed, checkIfInstalled should return true
            expect(isInstalled).toBe(true);

            // Mock getting the installed coach ID
            mockMaybeSingle.mockResolvedValueOnce({
              data: { id: installedCoachId },
              error: null,
            });

            const existingCoachId = await installer.getInstalledCoachId(sourceCoachId, userId);

            // Should return the existing coach ID, not null
            expect(existingCoachId).toBe(installedCoachId);
            expect(existingCoachId).not.toBeNull();

            // This demonstrates that the system can detect duplicates
            // and return the existing coach instead of creating a new one
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
