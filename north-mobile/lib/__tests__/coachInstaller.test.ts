/**
 * Unit Tests for CoachInstaller Service
 * 
 * These tests verify the functionality of the CoachInstaller service,
 * including coach installation, duplicate checking, and ID retrieval.
 * 
 * Validates: Requirements 3.4, 3.6, 10.1, 10.2, 10.3
 */

import { SupabaseCoachInstaller } from '../coachInstaller';
import { supabase } from '../supabase';
import { CoachCategory } from '../../types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: jest.fn(() => 'mock-uuid-1234'),
} as any;

describe('SupabaseCoachInstaller', () => {
  let installer: SupabaseCoachInstaller;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockMaybeSingle: jest.Mock;
  let mockInsert: jest.Mock;

  beforeEach(() => {
    installer = new SupabaseCoachInstaller();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock chain
    mockMaybeSingle = jest.fn();
    mockSingle = jest.fn();
    mockInsert = jest.fn();
    const mockIs = jest.fn(() => ({
      eq: mockEq,
      maybeSingle: mockMaybeSingle,
    }));
    mockEq = jest.fn(() => ({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      is: mockIs,
    }));
    mockSelect = jest.fn(() => ({
      eq: mockEq,
      single: mockSingle,
      is: mockIs,
    }));
    mockFrom = jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    }));
    
    (supabase.from as jest.Mock) = mockFrom;
  });

  describe('installCoach', () => {
    const mockSourceCoach = {
      id: 'source-coach-123',
      name: 'Test Coach',
      icon: '🤖',
      system_prompt: 'You are a helpful assistant',
      creator_id: 'creator-456',
      is_public: true,
      category: 'Productivity',
      is_featured: false,
      source_coach_id: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const userId = 'user-789';

    it('should successfully install a public coach', async () => {
      // Mock fetching the source coach
      mockSingle.mockResolvedValueOnce({
        data: mockSourceCoach,
        error: null,
      });

      // Mock inserting the new coach
      const mockInsertedCoach = {
        ...mockSourceCoach,
        id: 'mock-uuid-1234',
        creator_id: null,
        is_public: false,
        is_featured: false,
        source_coach_id: 'source-coach-123',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      };

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockInsertedCoach,
            error: null,
          }),
        }),
      });

      const result = await installer.installCoach('source-coach-123', userId);

      // Verify the result
      expect(result).toMatchObject({
        id: 'mock-uuid-1234',
        name: 'Test Coach',
        icon: '🤖',
        systemPrompt: 'You are a helpful assistant',
        creatorId: null,
        isPublic: false,
        category: CoachCategory.PRODUCTIVITY,
        isFeatured: false,
        sourceCoachId: 'source-coach-123',
      });

      // Verify the database calls
      expect(mockFrom).toHaveBeenCalledWith('coaches');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'source-coach-123');
    });

    it('should throw error if source coach does not exist', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Coach not found' },
      });

      await expect(
        installer.installCoach('non-existent-coach', userId)
      ).rejects.toThrow('Failed to fetch coach');
    });

    it('should throw error if coach is not public', async () => {
      const privateCoach = {
        ...mockSourceCoach,
        is_public: false,
      };

      mockSingle.mockResolvedValueOnce({
        data: privateCoach,
        error: null,
      });

      await expect(
        installer.installCoach('source-coach-123', userId)
      ).rejects.toThrow('Cannot install a private coach');
    });

    it('should throw error if insertion fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: mockSourceCoach,
        error: null,
      });

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          }),
        }),
      });

      await expect(
        installer.installCoach('source-coach-123', userId)
      ).rejects.toThrow('Failed to install coach');
    });

    it('should copy all coach properties correctly', async () => {
      mockSingle.mockResolvedValueOnce({
        data: mockSourceCoach,
        error: null,
      });

      const mockInsertedCoach = {
        id: 'mock-uuid-1234',
        name: mockSourceCoach.name,
        icon: mockSourceCoach.icon,
        system_prompt: mockSourceCoach.system_prompt,
        creator_id: null,
        is_public: false,
        category: mockSourceCoach.category,
        is_featured: false,
        source_coach_id: 'source-coach-123',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockInsertedCoach,
            error: null,
          }),
        }),
      });

      const result = await installer.installCoach('source-coach-123', userId);

      // Verify all properties are copied correctly
      expect(result.name).toBe(mockSourceCoach.name);
      expect(result.icon).toBe(mockSourceCoach.icon);
      expect(result.systemPrompt).toBe(mockSourceCoach.system_prompt);
      expect(result.category).toBe(CoachCategory.PRODUCTIVITY);
      
      // Verify properties are set correctly for installed coaches
      expect(result.creatorId).toBeNull();
      expect(result.isPublic).toBe(false);
      expect(result.isFeatured).toBe(false);
      expect(result.sourceCoachId).toBe('source-coach-123');
    });
  });

  describe('checkIfInstalled', () => {
    const coachId = 'coach-123';
    const userId = 'user-456';

    it('should return true if coach is already installed', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'installed-coach-789' },
        error: null,
      });

      const result = await installer.checkIfInstalled(coachId, userId);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('coaches');
      expect(mockSelect).toHaveBeenCalledWith('id');
    });

    it('should return false if coach is not installed', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await installer.checkIfInstalled(coachId, userId);

      expect(result).toBe(false);
    });

    it('should return false if there is an error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await installer.checkIfInstalled(coachId, userId);

      expect(result).toBe(false);
    });
  });

  describe('getInstalledCoachId', () => {
    const sourceCoachId = 'source-coach-123';
    const userId = 'user-456';

    it('should return the installed coach ID if found', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'installed-coach-789' },
        error: null,
      });

      const result = await installer.getInstalledCoachId(sourceCoachId, userId);

      expect(result).toBe('installed-coach-789');
      expect(mockFrom).toHaveBeenCalledWith('coaches');
      expect(mockSelect).toHaveBeenCalledWith('id');
    });

    it('should return null if coach is not installed', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await installer.getInstalledCoachId(sourceCoachId, userId);

      expect(result).toBeNull();
    });

    it('should return null if there is an error', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await installer.getInstalledCoachId(sourceCoachId, userId);

      expect(result).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty coach ID', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid ID' },
      });

      await expect(
        installer.installCoach('', 'user-123')
      ).rejects.toThrow();
    });

    it('should handle empty user ID in checkIfInstalled', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await installer.checkIfInstalled('coach-123', '');

      expect(result).toBe(false);
    });

    it('should handle special characters in IDs', async () => {
      const specialCoachId = 'coach-with-special-chars-!@#$%';
      const specialUserId = 'user-with-special-chars-!@#$%';

      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'installed-coach-789' },
        error: null,
      });

      const result = await installer.checkIfInstalled(specialCoachId, specialUserId);

      expect(result).toBe(true);
    });
  });
});
