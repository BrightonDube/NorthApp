/**
 * Error Logger
 * 
 * Centralized error logging utility with Sentry integration.
 * Logs errors for debugging and monitoring purposes.
 * 
 * Validates: Requirement 8.5
 */

import { captureException, addBreadcrumb } from '@/lib/sentry';

/**
 * Error context for detailed logging
 */
export interface ErrorContext {
  operation: string;
  userId?: string;
  fileId?: string;
  filename?: string;
  fileSize?: number;
  component?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'error' | 'warning' | 'info';

/**
 * Log an error with context
 */
export function logError(
  error: Error | string,
  context: ErrorContext,
  severity: ErrorSeverity = 'error'
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    severity,
    message: errorMessage,
    stack: errorStack,
    context,
  };
  
  // Log to console
  switch (severity) {
    case 'error':
      console.error('[Error]', logEntry);
      break;
    case 'warning':
      console.warn('[Warning]', logEntry);
      break;
    case 'info':
      console.info('[Info]', logEntry);
      break;
  }
  
  // Send to Sentry in production
  if (severity === 'error') {
    captureException(
      error instanceof Error ? error : new Error(errorMessage),
      {
        operation: context.operation,
        component: context.component,
        ...context.additionalInfo,
      }
    );
  } else {
    addBreadcrumb(context.operation, errorMessage, {
      severity,
      component: context.component,
      ...context.additionalInfo,
    });
  }
}

/**
 * Log a successful operation
 */
export function logSuccess(operation: string, context: Partial<ErrorContext>): void {
  if (__DEV__) {
    console.log('[Success]', { timestamp: new Date().toISOString(), operation, context });
  }
  
  addBreadcrumb(operation, 'Operation succeeded', {
    component: context.component,
    ...context.additionalInfo,
  });
}

/**
 * Create a user-friendly error message from an error object
 * 
 * Converts technical errors into messages that users can understand
 * and act upon.
 * 
 * @param error - The error object
 * @param operation - The operation that failed
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * const message = getUserFriendlyMessage(error, 'upload');
 * Alert.alert('Error', message);
 * ```
 */
export function getUserFriendlyMessage(error: Error | string, operation: string): string {
  const errorMessage = error instanceof Error ? error.message : error;
  
  // Check for common error patterns and provide friendly messages
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  
  if (errorMessage.includes('authentication') || errorMessage.includes('auth')) {
    return 'Authentication required. Please sign in and try again.';
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
    return errorMessage; // Quota messages are already user-friendly
  }
  
  if (errorMessage.includes('corrupted') || errorMessage.includes('invalid')) {
    return 'The file appears to be corrupted or invalid. Please try a different file.';
  }
  
  if (errorMessage.includes('password')) {
    return 'This file is password-protected and cannot be processed.';
  }
  
  // Default message based on operation
  switch (operation) {
    case 'upload':
      return 'Failed to upload file. Please try again.';
    case 'delete':
      return 'Failed to delete file. Please try again.';
    case 'rename':
      return 'Failed to rename file. Please try again.';
    case 'extract':
      return 'Failed to extract text from file. The file may be corrupted.';
    case 'download':
      return 'Failed to download file. Please try again.';
    default:
      return 'An error occurred. Please try again.';
  }
}
