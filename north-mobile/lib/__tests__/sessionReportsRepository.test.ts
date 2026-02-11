/**
 * Session Reports Repository Unit Tests
 * 
 * Tests for the SessionReportsRepository class covering:
 * - Report creation
 * - Report retrieval by ID
 * - Report retrieval by user with pagination
 * - Report deletion
 * 
 * Validates: Requirements 2.6, 4.1, 4.2, 4.3, 9.1
 */

import { SessionReportsRepository } from '../sessionReportsRepository';
import { supabase } from '../supabase';
import type { SessionReport, SessionReportInsert } from '../database.types';

// Mock the supabase client
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('SessionReportsRepository', () => {
  let repository: SessionReportsRepository;
  let mockFrom: jest.Mock;
  let mockSelect: jest.Mock;
  let mockInsert: jest.Mock;
  let mockEq: jest.Mock;
  let mockOrder: jest.Mock;
  let mockRange: jest.Mock;
  let mockSingle: jest.Mock;
  let mockDelete: jest.Mock;

  beforeEach(() => {
    repository = new SessionReportsRepository();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock chain
    mockSingle = jest.fn();
    mockSelect = jest.fn();
    mockInsert = jest.fn();
    mockEq = jest.fn();
    mockOrder = jest.fn();
    mockRange = jest.fn();
    mockDelete = jest.fn();
    mockFrom = jest.fn();

    (supabase.from as jest.Mock) = mockFrom;
  });

  describe('createReport', () => {
    it('should create a new session report successfully', async () => {
      const mockReport: SessionReportInsert = {
        session_id: 'session-123',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Test session summary',
        key_insights: [{ id: '1', text: 'Key insight', importance: 'high' }],
        decisions: ['Decision 1'],
        topics: ['productivity'],
        session_date: '2024-01-01T10:00:00Z',
        session_duration: 45,
        message_count: 20,
      };

      const mockCreatedReport: SessionReport = {
        id: 'report-123',
        ...mockReport,
        key_insights: mockReport.key_insights as any,
        decisions: mockReport.decisions as any,
        topics: mockReport.topics as string[],
        generated_at: '2024-01-01T10:45:00Z',
        confidence: 'high',
        generation_attempts: 1,
        created_at: '2024-01-01T10:45:00Z',
        updated_at: '2024-01-01T10:45:00Z',
      };

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: mockCreatedReport,
        error: null,
      });

      const result = await repository.createReport(mockReport);

      expect(mockFrom).toHaveBeenCalledWith('session_reports');
      expect(mockInsert).toHaveBeenCalledWith(mockReport);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockCreatedReport);
    });

    it('should throw error when creation fails', async () => {
      const mockReport: SessionReportInsert = {
        session_id: 'session-123',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Test summary',
        session_date: '2024-01-01T10:00:00Z',
        session_duration: 45,
        message_count: 20,
      };

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(repository.createReport(mockReport)).rejects.toThrow(
        'Failed to create session report: Database error'
      );
    });

    it('should throw error when no data is returned', async () => {
      const mockReport: SessionReportInsert = {
        session_id: 'session-123',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Test summary',
        session_date: '2024-01-01T10:00:00Z',
        session_duration: 45,
        message_count: 20,
      };

      mockFrom.mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(repository.createReport(mockReport)).rejects.toThrow(
        'Failed to create session report: No data returned'
      );
    });
  });

  describe('getReportById', () => {
    it('should retrieve a report by ID successfully', async () => {
      const mockReport: SessionReport = {
        id: 'report-123',
        session_id: 'session-123',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Test summary',
        key_insights: [],
        decisions: [],
        topics: ['productivity'],
        session_date: '2024-01-01T10:00:00Z',
        session_duration: 45,
        message_count: 20,
        generated_at: '2024-01-01T10:45:00Z',
        confidence: 'high',
        generation_attempts: 1,
        created_at: '2024-01-01T10:45:00Z',
        updated_at: '2024-01-01T10:45:00Z',
      };

      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: mockReport,
        error: null,
      });

      const result = await repository.getReportById('report-123');

      expect(mockFrom).toHaveBeenCalledWith('session_reports');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
      expect(mockSingle).toHaveBeenCalled();
      expect(result).toEqual(mockReport);
    });

    it('should return null when report is not found', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const result = await repository.getReportById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        single: mockSingle,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' },
      });

      await expect(repository.getReportById('report-123')).rejects.toThrow(
        'Failed to get session report: Database error'
      );
    });
  });

  describe('getReportsByUser', () => {
    const mockReports: SessionReport[] = [
      {
        id: 'report-1',
        session_id: 'session-1',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Recent session',
        key_insights: [],
        decisions: [],
        topics: [],
        session_date: '2024-01-03T10:00:00Z',
        session_duration: 30,
        message_count: 15,
        generated_at: '2024-01-03T10:30:00Z',
        confidence: 'high',
        generation_attempts: 1,
        created_at: '2024-01-03T10:30:00Z',
        updated_at: '2024-01-03T10:30:00Z',
      },
      {
        id: 'report-2',
        session_id: 'session-2',
        user_id: 'user-123',
        coach_id: 'coach-123',
        summary: 'Older session',
        key_insights: [],
        decisions: [],
        topics: [],
        session_date: '2024-01-01T10:00:00Z',
        session_duration: 45,
        message_count: 20,
        generated_at: '2024-01-01T10:45:00Z',
        confidence: 'medium',
        generation_attempts: 1,
        created_at: '2024-01-01T10:45:00Z',
        updated_at: '2024-01-01T10:45:00Z',
      },
    ];

    it('should retrieve reports with default pagination', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockResolvedValue({
        data: mockReports,
        error: null,
        count: 2,
      });

      const result = await repository.getReportsByUser('user-123');

      expect(mockFrom).toHaveBeenCalledWith('session_reports');
      expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockOrder).toHaveBeenCalledWith('session_date', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 19); // Default page size 20
      expect(result).toEqual({
        data: mockReports,
        page: 1,
        pageSize: 20,
        totalCount: 2,
        hasMore: false,
      });
    });

    it('should retrieve reports with custom pagination', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockResolvedValue({
        data: mockReports,
        error: null,
        count: 25,
      });

      const result = await repository.getReportsByUser('user-123', {
        page: 2,
        pageSize: 10,
      });

      expect(mockRange).toHaveBeenCalledWith(10, 19); // Page 2, size 10
      expect(result).toEqual({
        data: mockReports,
        page: 2,
        pageSize: 10,
        totalCount: 25,
        hasMore: true, // 12 items fetched, 25 total
      });
    });

    it('should handle empty results', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      });

      const result = await repository.getReportsByUser('user-with-no-reports');

      expect(result).toEqual({
        data: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        hasMore: false,
      });
    });

    it('should throw error for invalid page number', async () => {
      await expect(
        repository.getReportsByUser('user-123', { page: 0 })
      ).rejects.toThrow('Page number must be >= 1');

      await expect(
        repository.getReportsByUser('user-123', { page: -1 })
      ).rejects.toThrow('Page number must be >= 1');
    });

    it('should throw error for invalid page size', async () => {
      await expect(
        repository.getReportsByUser('user-123', { pageSize: 0 })
      ).rejects.toThrow('Page size must be between 1 and 100');

      await expect(
        repository.getReportsByUser('user-123', { pageSize: 101 })
      ).rejects.toThrow('Page size must be between 1 and 100');
    });

    it('should throw error when query fails', async () => {
      mockFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });
      mockOrder.mockReturnValue({
        range: mockRange,
      });
      mockRange.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      await expect(repository.getReportsByUser('user-123')).rejects.toThrow(
        'Failed to get session reports: Database error'
      );
    });
  });

  describe('deleteReport', () => {
    it('should delete a report successfully', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        error: null,
        count: 1,
      });

      const result = await repository.deleteReport('report-123');

      expect(mockFrom).toHaveBeenCalledWith('session_reports');
      expect(mockDelete).toHaveBeenCalledWith({ count: 'exact' });
      expect(mockEq).toHaveBeenCalledWith('id', 'report-123');
      expect(result).toBe(true);
    });

    it('should return false when report is not found', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        error: null,
        count: 0,
      });

      const result = await repository.deleteReport('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should throw error when deletion fails', async () => {
      mockFrom.mockReturnValue({
        delete: mockDelete,
      });
      mockDelete.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockResolvedValue({
        error: { message: 'Database error' },
        count: null,
      });

      await expect(repository.deleteReport('report-123')).rejects.toThrow(
        'Failed to delete session report: Database error'
      );
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      const { sessionReportsRepository } = require('../sessionReportsRepository');
      expect(sessionReportsRepository).toBeInstanceOf(SessionReportsRepository);
    });
  });
});
