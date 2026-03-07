/**
 * Error Handling Utility
 * 
 * Provides centralized error handling, logging, and retry logic.
 * Validates Task 17.4 requirements.
 */

interface ErrorConfig {
  context?: string;
  showUser?: boolean;
  retry?: () => Promise<any>;
}

export class AppError extends Error {
  public context?: string;
  public isUserVisible: boolean;
  public originalError?: unknown;

  constructor(message: string, config: ErrorConfig = {}) {
    super(message);
    this.name = 'AppError';
    this.context = config.context;
    this.isUserVisible = config.showUser ?? true;
  }
}

export const handleError = (error: unknown, config: ErrorConfig = {}) => {
  // 1. Log to console (dev) or monitoring service (prod)
  if (__DEV__) {
    console.group('🚨 Error Caught');
    console.error('Message:', error instanceof Error ? error.message : String(error));
    if (config.context) console.log('Context:', config.context);
    console.log('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.groupEnd();
  } else {
    // Sentry.captureException(error); // Future integration
  }

  // 2. Return user-friendly message
  if (error instanceof AppError && error.isUserVisible) {
    return error.message;
  }

  // Network errors
  if (error instanceof Error && error.message.includes('Network request failed')) {
    return "You're offline. Please check your connection.";
  }

  return "Something went wrong. Please try again.";
};

/**
 * Retry operation with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
