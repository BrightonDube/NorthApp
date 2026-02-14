/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for crash reporting, error tracking,
 * Session Replay, Feedback Widget, and Structured Logs.
 * 
 * Sentry is initialized at module level in _layout.tsx via Sentry.init()
 * (before any React rendering). This file provides helper utilities
 * for capturing errors, setting user context, and adding breadcrumbs.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = 'https://a5af9d8e4ce379ff5a7225fd4b2b8d07@o4509556480212992.ingest.de.sentry.io/4510885965135952';

/**
 * Initialize Sentry SDK
 * Called from _layout.tsx — kept as a no-op since Sentry.init() is now
 * called at module scope in _layout.tsx (required by Sentry wizard).
 */
export function initSentry(): void {
  // Sentry.init() is called at module level in _layout.tsx
  // This function is retained for backward compatibility
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (__DEV__) {
    console.error('[Sentry] Would capture exception:', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (__DEV__) {
    console.log(`[Sentry] Would capture message (${level}):`, message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error reports
 */
export function setUser(user: { id: string; email?: string; name?: string } | null): void {
  if (__DEV__) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
): void {
  if (__DEV__) return;

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Export Sentry for direct access if needed
export { Sentry };
