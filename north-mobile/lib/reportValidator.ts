/**
 * Report Validator
 * 
 * Validation functions for SessionReport structure to ensure data integrity
 * and compliance with requirements.
 * 
 * Task: 5.1 Create validation functions for SessionReport structure
 * Validates: Requirements 3.1-3.7
 */

import type { SessionReport } from './database.types';

/**
 * Validation result for a SessionReport
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that all required fields are present in a SessionReport
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.7
 * 
 * @param report - The session report to validate
 * @returns Validation result with any errors found
 */
export function validateRequiredFields(report: Partial<SessionReport>): ValidationResult {
  const errors: string[] = [];

  // Requirement 3.1: Session date and duration
  if (!report.session_date) {
    errors.push('Missing required field: session_date');
  }
  if (report.session_duration === undefined || report.session_duration === null) {
    errors.push('Missing required field: session_duration');
  }

  // Requirement 3.2: Key insights
  if (!report.key_insights) {
    errors.push('Missing required field: key_insights');
  }

  // Requirement 3.3: Action items (note: can be empty array, but must exist)
  // Action items are stored in a separate table, so we don't validate them here

  // Requirement 3.4: Summary (validated separately for sentence count)
  if (!report.summary) {
    errors.push('Missing required field: summary');
  }

  // Requirement 3.5: Topics
  if (!report.topics) {
    errors.push('Missing required field: topics');
  }

  // Requirement 3.6: Coach reference
  if (!report.coach_id) {
    errors.push('Missing required field: coach_id');
  }

  // Requirement 3.7: Message count
  if (report.message_count === undefined || report.message_count === null) {
    errors.push('Missing required field: message_count');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that the summary contains between 2-4 sentences
 * 
 * Validates: Requirement 3.4
 * 
 * @param summary - The summary text to validate
 * @returns Validation result with any errors found
 */
export function validateSummaryLength(summary: string): ValidationResult {
  const errors: string[] = [];

  if (!summary || summary.trim().length === 0) {
    errors.push('Summary cannot be empty');
    return { isValid: false, errors };
  }

  // Count sentences by splitting on sentence-ending punctuation
  // This regex matches periods, exclamation marks, and question marks
  // followed by whitespace or end of string
  const sentences = summary
    .trim()
    .split(/[.!?]+\s+|[.!?]+$/)
    .filter(s => s.trim().length > 0);

  const sentenceCount = sentences.length;

  if (sentenceCount < 2) {
    errors.push(`Summary must contain at least 2 sentences (found ${sentenceCount})`);
  } else if (sentenceCount > 4) {
    errors.push(`Summary must contain at most 4 sentences (found ${sentenceCount})`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that the message count in the report matches the actual session message count
 * 
 * Validates: Requirement 3.7
 * 
 * @param reportMessageCount - The message count stored in the report
 * @param actualMessageCount - The actual number of messages in the session
 * @returns Validation result with any errors found
 */
export function validateMessageCount(
  reportMessageCount: number,
  actualMessageCount: number
): ValidationResult {
  const errors: string[] = [];

  if (reportMessageCount !== actualMessageCount) {
    errors.push(
      `Message count mismatch: report shows ${reportMessageCount} but session has ${actualMessageCount} messages`
    );
  }

  if (reportMessageCount < 0) {
    errors.push('Message count cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates the complete SessionReport structure
 * 
 * Combines all validation checks for a comprehensive validation
 * 
 * Validates: Requirements 3.1-3.7
 * 
 * @param report - The session report to validate
 * @param actualMessageCount - The actual number of messages in the session (optional)
 * @returns Validation result with all errors found
 */
export function validateSessionReport(
  report: Partial<SessionReport>,
  actualMessageCount?: number
): ValidationResult {
  const allErrors: string[] = [];

  // Validate required fields
  const requiredFieldsResult = validateRequiredFields(report);
  allErrors.push(...requiredFieldsResult.errors);

  // Validate summary length (only if summary exists)
  if (report.summary) {
    const summaryResult = validateSummaryLength(report.summary);
    allErrors.push(...summaryResult.errors);
  }

  // Validate message count (only if actualMessageCount is provided)
  if (actualMessageCount !== undefined && report.message_count !== undefined) {
    const messageCountResult = validateMessageCount(report.message_count, actualMessageCount);
    allErrors.push(...messageCountResult.errors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
