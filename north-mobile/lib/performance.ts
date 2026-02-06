/**
 * Performance Measurement Utilities
 * 
 * Provides utilities for measuring app performance metrics including:
 * - Cold start time (app launch to interactive)
 * - Screen navigation time
 * - Data fetch time
 * 
 * Uses React Native's Performance API (based on Web Performance API)
 * 
 * Validates: Requirements 13.7, 20.1 (cold start < 2s)
 */

// Import performance API with fallback for environments that don't support it
let performance: any = null;
let PerformanceObserver: any = null;

try {
  const rnPerf = require('react-native');
  performance = rnPerf.performance;
  PerformanceObserver = rnPerf.PerformanceObserver;
} catch (e) {
  // Performance API not available
}

// Check if Performance API is available
const isPerformanceAvailable = performance && typeof performance.mark === 'function';

// Performance marks
export const PERFORMANCE_MARKS = {
  APP_START: 'app-start',
  AUTH_INIT_START: 'auth-init-start',
  AUTH_INIT_END: 'auth-init-end',
  DATA_FETCH_START: 'data-fetch-start',
  DATA_FETCH_END: 'data-fetch-end',
  APP_INTERACTIVE: 'app-interactive',
  FIRST_RENDER: 'first-render',
} as const;

// Performance measures
export const PERFORMANCE_MEASURES = {
  COLD_START: 'cold-start-time',
  AUTH_INIT: 'auth-init-time',
  DATA_FETCH: 'data-fetch-time',
  TIME_TO_INTERACTIVE: 'time-to-interactive',
} as const;

/**
 * Mark a performance event
 * @param markName - Name of the performance mark
 */
export function markPerformance(markName: string): void {
  if (!isPerformanceAvailable) {
    return;
  }
  try {
    performance.mark(markName);
    if (__DEV__) {
      console.log(`[Performance] Mark: ${markName} at ${performance.now().toFixed(2)}ms`);
    }
  } catch (error) {
    console.warn(`[Performance] Failed to mark ${markName}:`, error);
  }
}

/**
 * Measure time between two marks
 * @param measureName - Name of the measure
 * @param startMark - Start mark name
 * @param endMark - End mark name
 * @returns Duration in milliseconds, or null if measurement failed
 */
export function measurePerformance(
  measureName: string,
  startMark: string,
  endMark: string
): number | null {
  if (!isPerformanceAvailable) {
    return null;
  }
  try {
    performance.measure(measureName, startMark, endMark);
    const measure = performance.getEntriesByName(measureName, 'measure')[0];
    
    if (measure) {
      const duration = measure.duration;
      if (__DEV__) {
        console.log(`[Performance] ${measureName}: ${duration.toFixed(2)}ms`);
      }
      return duration;
    }
    
    return null;
  } catch (error) {
    console.warn(`[Performance] Failed to measure ${measureName}:`, error);
    return null;
  }
}

/**
 * Get all performance entries of a specific type
 * @param entryType - Type of entries to retrieve ('mark', 'measure', etc.)
 * @returns Array of performance entries
 */
export function getPerformanceEntries(entryType: string): PerformanceEntry[] {
  if (!isPerformanceAvailable) {
    return [];
  }
  try {
    return performance.getEntriesByType(entryType);
  } catch (error) {
    console.warn(`[Performance] Failed to get entries of type ${entryType}:`, error);
    return [];
  }
}

/**
 * Clear all performance marks and measures
 */
export function clearPerformanceData(): void {
  if (!isPerformanceAvailable) {
    return;
  }
  try {
    performance.clearMarks();
    performance.clearMeasures();
    if (__DEV__) {
      console.log('[Performance] Cleared all performance data');
    }
  } catch (error) {
    console.warn('[Performance] Failed to clear performance data:', error);
  }
}

/**
 * Measure cold start time from app initialization to interactive state
 * This should be called when the app is fully interactive (user can interact with UI)
 * 
 * Target: < 2 seconds (Requirement 20.1)
 * 
 * @returns Cold start duration in milliseconds, or null if measurement failed
 */
export function measureColdStart(): number | null {
  if (!isPerformanceAvailable) {
    return null;
  }
  try {
    // Mark the app as interactive
    markPerformance(PERFORMANCE_MARKS.APP_INTERACTIVE);
    
    // Measure from app start to interactive
    const duration = measurePerformance(
      PERFORMANCE_MEASURES.COLD_START,
      PERFORMANCE_MARKS.APP_START,
      PERFORMANCE_MARKS.APP_INTERACTIVE
    );
    
    if (duration !== null && __DEV__) {
      const targetTime = 2000; // 2 seconds target
      const status = duration < targetTime ? '✅ PASS' : '⚠️ SLOW';
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`[Performance] COLD START TIME: ${duration.toFixed(2)}ms ${status}`);
      console.log(`[Performance] Target: < ${targetTime}ms`);
      console.log(`[Performance] Difference: ${(duration - targetTime).toFixed(2)}ms`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Log breakdown if available
      logPerformanceBreakdown();
    }
    
    return duration;
  } catch (error) {
    console.error('[Performance] Failed to measure cold start:', error);
    return null;
  }
}

/**
 * Log a detailed breakdown of performance metrics
 */
export function logPerformanceBreakdown(): void {
  if (!isPerformanceAvailable || !__DEV__) {
    return;
  }
  try {
    console.log('[Performance] Breakdown:');
    
    // Auth initialization time
    const authDuration = measurePerformance(
      PERFORMANCE_MEASURES.AUTH_INIT,
      PERFORMANCE_MARKS.AUTH_INIT_START,
      PERFORMANCE_MARKS.AUTH_INIT_END
    );
    if (authDuration !== null) {
      console.log(`  - Auth Init: ${authDuration.toFixed(2)}ms`);
    }
    
    // Data fetch time
    const dataFetchDuration = measurePerformance(
      PERFORMANCE_MEASURES.DATA_FETCH,
      PERFORMANCE_MARKS.DATA_FETCH_START,
      PERFORMANCE_MARKS.DATA_FETCH_END
    );
    if (dataFetchDuration !== null) {
      console.log(`  - Data Fetch: ${dataFetchDuration.toFixed(2)}ms`);
    }
    
    // Time to interactive
    const ttiDuration = measurePerformance(
      PERFORMANCE_MEASURES.TIME_TO_INTERACTIVE,
      PERFORMANCE_MARKS.FIRST_RENDER,
      PERFORMANCE_MARKS.APP_INTERACTIVE
    );
    if (ttiDuration !== null) {
      console.log(`  - Time to Interactive: ${ttiDuration.toFixed(2)}ms`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.warn('[Performance] Failed to log breakdown:', error);
  }
}

/**
 * Setup performance observer to automatically log performance entries
 * This is useful for debugging and monitoring performance in development
 */
export function setupPerformanceObserver(): void {
  if (!isPerformanceAvailable || !PerformanceObserver) {
    return;
  }
  try {
    // Create observer for measures
    const observer = new PerformanceObserver((list: any) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.entryType === 'measure') {
          console.log(`[Performance Observer] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
        }
      });
    });
    
    // Observe measure entries
    observer.observe({ entryTypes: ['measure'] });
    
    console.log('[Performance] Observer setup complete');
  } catch (error) {
    console.warn('[Performance] Failed to setup observer:', error);
  }
}

/**
 * Get a summary of all performance metrics
 * @returns Object containing all measured metrics
 */
export function getPerformanceSummary(): {
  coldStart: number | null;
  authInit: number | null;
  dataFetch: number | null;
  timeToInteractive: number | null;
} {
  if (!isPerformanceAvailable) {
    return {
      coldStart: null,
      authInit: null,
      dataFetch: null,
      timeToInteractive: null,
    };
  }

  const measures = performance.getEntriesByType('measure');
  
  const findMeasure = (name: string): number | null => {
    const measure = measures.find((m: any) => m.name === name);
    return measure ? measure.duration : null;
  };
  
  return {
    coldStart: findMeasure(PERFORMANCE_MEASURES.COLD_START),
    authInit: findMeasure(PERFORMANCE_MEASURES.AUTH_INIT),
    dataFetch: findMeasure(PERFORMANCE_MEASURES.DATA_FETCH),
    timeToInteractive: findMeasure(PERFORMANCE_MEASURES.TIME_TO_INTERACTIVE),
  };
}

// Mark app start immediately when this module is imported
// This ensures we capture the earliest possible timestamp
// Wrapped in try-catch to handle environments where Performance API is not available
try {
  if (isPerformanceAvailable) {
    markPerformance(PERFORMANCE_MARKS.APP_START);
  }
} catch (e) {
  // Silently ignore - Performance API not available
}
