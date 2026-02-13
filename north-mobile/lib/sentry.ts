/**
 * Sentry Error Tracking Configuration
 * 
 * Initializes Sentry for crash reporting and error tracking.
 * Only active in production builds.
 * 
 * Setup:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new project for React Native
 * 3. Add SENTRY_DSN to EAS secrets: eas env:create --name SENTRY_DSN --value "your-dsn" --environment production
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Get DSN from environment
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Initialize Sentry SDK
 * Should be called as early as possible in the app lifecycle
 */
export function initSentry(): void {
  // Only initialize in production builds
  if (__DEV__) {
    console.log('[Sentry] Skipping initialization in development mode');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Enable debug in non-production for troubleshooting
      debug: false,
      
      // Set environment based on release channel
      environment: Constants.expoConfig?.extra?.eas?.channel || 'production',
      
      // Release version for tracking
      release: `${Constants.expoConfig?.name}@${Constants.expoConfig?.version}`,
      
      // Distribution for Android version codes
      dist: String(Constants.expoConfig?.android?.versionCode || '1'),
      
      // Sample rate for performance monitoring (1.0 = 100%)
      tracesSampleRate: 0.2,
      
      // Attach user info when available
      sendDefaultPii: false,
      
      // Filter out known non-actionable errors
      beforeSend(event) {
        // Filter out network errors that are expected
        if (event.exception?.values?.[0]?.value?.includes('Network request failed')) {
          return null;
        }
        return event;
      },
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Failed to initialize:', error);
  }
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
