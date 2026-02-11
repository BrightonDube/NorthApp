/**
 * Session Reports Repository
 * 
 * Database repository for session reports with methods for creating, retrieving,
 * and deleting session reports.
 * 
 * Validates: Requirements 2.6, 4.1, 4.2, 4.3, 9.1
 */

import { supabase } from './supabase';
import type {
  SessionReport,
  SessionReportInsert,
  SessionReportUpdate,
} from './database.types';

/**
 * Pagination options for report queries
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Result type for paginated queries
 */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

/**
 * Session Reports Repository
 * 
 * Provides database operations for session reports including:
 * - Creating new reports
 * - Retrieving reports by ID
 * - Retrieving reports by user with pagination
 * - Deleting reports
 */
export class SessionReportsRepository {
  /**
   * Create a new session report
   * 
   * @param report - The report data to insert
   * @returns The created report with generated ID
   * @throws Error if creation fails
   * 
   * Validates: Requirement 2.6 (Report Persistence)
   * 
   * @example
   * ```typescript
   * const report = await repository.createReport({
   *   session_id: 'session-uuid',
   *   user_id: 'user-uuid',
   *   coach_id: 'coach-uuid',
   *   summary: 'Session focused on goal setting...',
   *   key_insights: [{ id: '1', text: 'User wants to improve time management', importance: 'high' }],
   *   decisions: ['Will start using a daily planner'],
   *   topics: ['productivity', 'time-management'],
   *   session_date: new Date().toISOString(),
   *   session_duration: 45,
   *   message_count: 23,
   * });
   * ```
   */
  async createReport(report: SessionReportInsert): Promise<SessionReport> {
    const { data, error } = await supabase
      .from('session_reports')
      .insert(report)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session report: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create session report: No data returned');
    }

    return data;
  }

  /**
   * Get a specific session report by ID
   * 
   * @param reportId - The UUID of the report to retrieve
   * @returns The session report or null if not found
   * @throws Error if query fails
   * 
   * Validates: Requirement 4.3 (Report Retrieval)
   * 
   * @example
   * ```typescript
   * const report = await repository.getReportById('report-uuid');
   * if (report) {
   *   console.log('Report summary:', report.summary);
   * }
   * ```
   */
  async getReportById(reportId: string): Promise<SessionReport | null> {
    const { data, error } = await supabase
      .from('session_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      // Return null for not found errors
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get session report: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all session reports for a user with pagination
   * 
   * Reports are ordered by session date descending (most recent first).
   * Default pagination: 20 reports per page.
   * 
   * @param userId - The UUID of the user
   * @param options - Pagination options (page and pageSize)
   * @returns Paginated result with reports and metadata
   * @throws Error if query fails
   * 
   * Validates: Requirements 4.1 (Report Ordering), 4.2 (Default Pagination)
   * 
   * @example
   * ```typescript
   * // Get first page with default page size (20)
   * const result = await repository.getReportsByUser('user-uuid');
   * 
   * // Get second page with custom page size
   * const result2 = await repository.getReportsByUser('user-uuid', {
   *   page: 2,
   *   pageSize: 10
   * });
   * 
   * console.log(`Showing ${result.data.length} of ${result.totalCount} reports`);
   * console.log(`Has more: ${result.hasMore}`);
   * ```
   */
  async getReportsByUser(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<SessionReport>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error('Page number must be >= 1');
    }
    if (pageSize < 1 || pageSize > 100) {
      throw new Error('Page size must be between 1 and 100');
    }

    // Calculate range for pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Query with pagination and count
    const { data, error, count } = await supabase
      .from('session_reports')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('session_date', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to get session reports: ${error.message}`);
    }

    const totalCount = count ?? 0;
    const hasMore = (from + (data?.length ?? 0)) < totalCount;

    return {
      data: data ?? [],
      page,
      pageSize,
      totalCount,
      hasMore,
    };
  }

  /**
   * Delete a session report
   * 
   * This will cascade delete associated action items due to foreign key constraints.
   * 
   * @param reportId - The UUID of the report to delete
   * @returns True if deleted, false if not found
   * @throws Error if deletion fails
   * 
   * Validates: Requirement 9.1 (Report Deletion)
   * 
   * @example
   * ```typescript
   * const deleted = await repository.deleteReport('report-uuid');
   * if (deleted) {
   *   console.log('Report deleted successfully');
   * } else {
   *   console.log('Report not found');
   * }
   * ```
   */
  async deleteReport(reportId: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('session_reports')
      .delete({ count: 'exact' })
      .eq('id', reportId);

    if (error) {
      throw new Error(`Failed to delete session report: ${error.message}`);
    }

    // Return true if at least one row was deleted
    return (count ?? 0) > 0;
  }
}

/**
 * Singleton instance of the repository
 * 
 * Use this exported instance for all session report database operations.
 * 
 * @example
 * ```typescript
 * import { sessionReportsRepository } from '@/lib/sessionReportsRepository';
 * 
 * const report = await sessionReportsRepository.getReportById('report-uuid');
 * ```
 */
export const sessionReportsRepository = new SessionReportsRepository();
