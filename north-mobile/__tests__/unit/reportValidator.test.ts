/**
 * Unit Tests for Report Validator
 * 
 * Tests validation functions for SessionReport structure
 * 
 * Task: 5.1 Create validation functions for SessionReport structure
 * Validates: Requirements 3.1-3.7
 */

import {
  validateRequiredFields,
  validateSummaryLength,
  validateMessageCount,
  validateSessionReport,
} from '../../lib/reportValidator';
import type { SessionReport } from '../../lib/database.types';

describe('Report Validator', () => {
  describe('validateRequiredFields', () => {
    it('should pass validation for a complete report', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [{ text: 'Insight 1', importance: 'high' }],
        summary: 'This is a summary. It has multiple sentences.',
        topics: ['coaching', 'goals'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when session_date is missing', () => {
      const report: Partial<SessionReport> = {
        session_duration: 45,
        key_insights: [],
        summary: 'Summary text.',
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: session_date');
    });

    it('should fail when session_duration is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        key_insights: [],
        summary: 'Summary text.',
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: session_duration');
    });

    it('should fail when key_insights is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        summary: 'Summary text.',
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: key_insights');
    });

    it('should fail when summary is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: summary');
    });

    it('should fail when topics is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        summary: 'Summary text.',
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: topics');
    });

    it('should fail when coach_id is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        summary: 'Summary text.',
        topics: ['coaching'],
        message_count: 10,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: coach_id');
    });

    it('should fail when message_count is missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        summary: 'Summary text.',
        topics: ['coaching'],
        coach_id: 'coach-123',
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: message_count');
    });

    it('should collect multiple errors when multiple fields are missing', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept message_count of 0', () => {
      const report: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        summary: 'Summary text.',
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 0,
      };

      const result = validateRequiredFields(report);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateSummaryLength', () => {
    it('should pass for a summary with 2 sentences', () => {
      const summary = 'This is the first sentence. This is the second sentence.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for a summary with 3 sentences', () => {
      const summary = 'First sentence. Second sentence. Third sentence.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for a summary with 4 sentences', () => {
      const summary = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for a summary with 1 sentence', () => {
      const summary = 'This is only one sentence.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Summary must contain at least 2 sentences (found 1)');
    });

    it('should fail for a summary with 5 sentences', () => {
      const summary = 'First. Second. Third. Fourth. Fifth.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Summary must contain at most 4 sentences (found 5)');
    });

    it('should handle sentences ending with exclamation marks', () => {
      const summary = 'This is exciting! So is this! And this too!';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
    });

    it('should handle sentences ending with question marks', () => {
      const summary = 'Is this a question? Yes it is. What about this?';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed punctuation', () => {
      const summary = 'This is a statement. Is this a question? This is exciting!';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
    });

    it('should fail for empty summary', () => {
      const summary = '';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Summary cannot be empty');
    });

    it('should fail for whitespace-only summary', () => {
      const summary = '   ';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Summary cannot be empty');
    });

    it('should handle sentences with multiple spaces', () => {
      const summary = 'First sentence.  Second sentence.   Third sentence.';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
    });

    it('should handle sentences without trailing punctuation at the end', () => {
      const summary = 'First sentence. Second sentence. Third sentence';
      const result = validateSummaryLength(summary);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMessageCount', () => {
    it('should pass when message counts match', () => {
      const result = validateMessageCount(10, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when both counts are 0', () => {
      const result = validateMessageCount(0, 0);
      expect(result.isValid).toBe(true);
    });

    it('should fail when report count is higher than actual', () => {
      const result = validateMessageCount(15, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Message count mismatch: report shows 15 but session has 10 messages'
      );
    });

    it('should fail when report count is lower than actual', () => {
      const result = validateMessageCount(5, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Message count mismatch: report shows 5 but session has 10 messages'
      );
    });

    it('should fail when message count is negative', () => {
      const result = validateMessageCount(-5, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message count cannot be negative');
    });

    it('should report both mismatch and negative errors', () => {
      const result = validateMessageCount(-5, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateSessionReport', () => {
    const validReport: Partial<SessionReport> = {
      session_date: '2024-01-15T10:00:00Z',
      session_duration: 45,
      key_insights: [{ text: 'Insight 1', importance: 'high' }],
      summary: 'This is a valid summary. It has two sentences.',
      topics: ['coaching', 'goals'],
      coach_id: 'coach-123',
      message_count: 10,
    };

    it('should pass validation for a complete valid report', () => {
      const result = validateSessionReport(validReport, 10);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate without actualMessageCount parameter', () => {
      const result = validateSessionReport(validReport);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect errors from all validation checks', () => {
      const invalidReport: Partial<SessionReport> = {
        summary: 'Only one sentence.',
        message_count: 5,
      };

      const result = validateSessionReport(invalidReport, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      // Should have errors from required fields, summary length, and message count
      expect(result.errors.some(e => e.includes('Missing required field'))).toBe(true);
      expect(result.errors.some(e => e.includes('at least 2 sentences'))).toBe(true);
      expect(result.errors.some(e => e.includes('Message count mismatch'))).toBe(true);
    });

    it('should not validate message count if actualMessageCount is not provided', () => {
      const reportWithWrongCount: Partial<SessionReport> = {
        ...validReport,
        message_count: 999,
      };

      const result = validateSessionReport(reportWithWrongCount);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle report with missing summary gracefully', () => {
      const reportWithoutSummary: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [],
        topics: ['coaching'],
        coach_id: 'coach-123',
        message_count: 10,
      };

      const result = validateSessionReport(reportWithoutSummary, 10);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: summary');
      // Should not have summary length errors since summary is missing
      expect(result.errors.some(e => e.includes('sentences'))).toBe(false);
    });

    it('should validate all aspects when all data is provided', () => {
      const perfectReport: Partial<SessionReport> = {
        session_date: '2024-01-15T10:00:00Z',
        session_duration: 45,
        key_insights: [
          { text: 'Insight 1', importance: 'high' },
          { text: 'Insight 2', importance: 'medium' },
        ],
        summary: 'First sentence. Second sentence. Third sentence.',
        topics: ['coaching', 'goals', 'progress'],
        coach_id: 'coach-123',
        message_count: 25,
      };

      const result = validateSessionReport(perfectReport, 25);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
