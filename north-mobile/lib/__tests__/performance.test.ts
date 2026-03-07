/**
 * Performance Utilities Tests
 * 
 * Tests for performance measurement utilities including:
 * - Performance marking
 * - Performance measuring
 * - Cold start measurement
 * - Performance data retrieval
 */

// performance and PerformanceObserver are not exported from react-native
// They are available as globals in the JS environment
declare const performance: any;
declare const PerformanceObserver: any;
import {
  markPerformance,
  measurePerformance,
  getPerformanceEntries,
  clearPerformanceData,
  measureColdStart,
  getPerformanceSummary,
  PERFORMANCE_MARKS,
  PERFORMANCE_MEASURES,
} from '../performance';

// Mock the performance API
jest.mock('react-native', () => ({
  PerformanceObserver: jest.fn(),
  performance: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
}));

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Mock console methods
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe('Performance Utilities', () => {
  describe('markPerformance', () => {
    it('should create a performance mark', () => {
      const markName = 'test-mark';
      markPerformance(markName);
      
      expect(performance.mark).toHaveBeenCalledWith(markName);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`[Performance] Mark: ${markName}`)
      );
    });

    it('should handle errors gracefully', () => {
      (performance.mark as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      markPerformance('test-mark');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to mark'),
        expect.any(Error)
      );
    });
  });

  describe('measurePerformance', () => {
    it('should measure time between two marks', () => {
      const startMark = 'start-mark';
      const endMark = 'end-mark';
      const measureName = 'test-measure';
      const mockDuration = 123.45;
      
      (performance.getEntriesByName as jest.Mock).mockReturnValueOnce([
        { name: measureName, duration: mockDuration, entryType: 'measure' },
      ]);
      
      const duration = measurePerformance(measureName, startMark, endMark);
      
      expect(performance.measure).toHaveBeenCalledWith(measureName, startMark, endMark);
      expect(duration).toBe(mockDuration);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(`[Performance] ${measureName}: ${mockDuration.toFixed(2)}ms`)
      );
    });

    it('should return null if measurement fails', () => {
      (performance.measure as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      const duration = measurePerformance('test-measure', 'start', 'end');
      expect(duration).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should return null if no measure entry found', () => {
      (performance.getEntriesByName as jest.Mock).mockReturnValueOnce([]);
      
      const duration = measurePerformance('test-measure', 'start', 'end');
      expect(duration).toBeNull();
    });
  });

  describe('getPerformanceEntries', () => {
    it('should retrieve entries by type', () => {
      const mockEntries = [
        { name: 'mark1', entryType: 'mark' },
        { name: 'mark2', entryType: 'mark' },
      ];
      
      (performance.getEntriesByType as jest.Mock).mockReturnValueOnce(mockEntries);
      
      const entries = getPerformanceEntries('mark');
      expect(entries).toEqual(mockEntries);
      expect(performance.getEntriesByType).toHaveBeenCalledWith('mark');
    });

    it('should handle errors gracefully', () => {
      (performance.getEntriesByType as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      const entries = getPerformanceEntries('mark');
      expect(entries).toEqual([]);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('clearPerformanceData', () => {
    it('should clear all marks and measures', () => {
      clearPerformanceData();
      
      expect(performance.clearMarks).toHaveBeenCalled();
      expect(performance.clearMeasures).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleared all performance data')
      );
    });

    it('should handle errors gracefully', () => {
      (performance.clearMarks as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      clearPerformanceData();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('measureColdStart', () => {
    it('should measure cold start time under target', () => {
      const mockDuration = 1500; // 1.5 seconds - under 2s target
      
      // Mock getEntriesByName to return the measure
      (performance.getEntriesByName as jest.Mock).mockReturnValueOnce([
        { name: PERFORMANCE_MEASURES.COLD_START, duration: mockDuration, entryType: 'measure' },
      ]);
      
      const duration = measureColdStart();
      
      expect(performance.mark).toHaveBeenCalledWith(PERFORMANCE_MARKS.APP_INTERACTIVE);
      expect(performance.measure).toHaveBeenCalledWith(
        PERFORMANCE_MEASURES.COLD_START,
        PERFORMANCE_MARKS.APP_START,
        PERFORMANCE_MARKS.APP_INTERACTIVE
      );
      expect(duration).toBe(mockDuration);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('COLD START TIME:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ PASS')
      );
    });

    it('should indicate slow cold start over target', () => {
      const mockDuration = 2500; // 2.5 seconds - over 2s target
      
      (performance.getEntriesByName as jest.Mock).mockReturnValueOnce([
        { name: PERFORMANCE_MEASURES.COLD_START, duration: mockDuration, entryType: 'measure' },
      ]);
      
      measureColdStart();
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ SLOW')
      );
    });

    it('should handle measurement failure', () => {
      (performance.measure as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mock error');
      });
      
      const duration = measureColdStart();
      expect(duration).toBeNull();
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return summary of all metrics', () => {
      const mockMeasures = [
        { name: PERFORMANCE_MEASURES.COLD_START, duration: 1800 },
        { name: PERFORMANCE_MEASURES.AUTH_INIT, duration: 500 },
        { name: PERFORMANCE_MEASURES.DATA_FETCH, duration: 300 },
        { name: PERFORMANCE_MEASURES.TIME_TO_INTERACTIVE, duration: 200 },
      ];
      
      (performance.getEntriesByType as jest.Mock).mockReturnValueOnce(mockMeasures);
      
      const summary = getPerformanceSummary();
      
      expect(summary.coldStart).toBe(1800);
      expect(summary.authInit).toBe(500);
      expect(summary.dataFetch).toBe(300);
      expect(summary.timeToInteractive).toBe(200);
    });

    it('should return null for unmeasured metrics', () => {
      (performance.getEntriesByType as jest.Mock).mockReturnValueOnce([]);
      
      const summary = getPerformanceSummary();
      
      expect(summary.coldStart).toBeNull();
      expect(summary.authInit).toBeNull();
      expect(summary.dataFetch).toBeNull();
      expect(summary.timeToInteractive).toBeNull();
    });
  });

  describe('Performance Constants', () => {
    it('should have all required mark constants', () => {
      expect(PERFORMANCE_MARKS.APP_START).toBe('app-start');
      expect(PERFORMANCE_MARKS.AUTH_INIT_START).toBe('auth-init-start');
      expect(PERFORMANCE_MARKS.AUTH_INIT_END).toBe('auth-init-end');
      expect(PERFORMANCE_MARKS.DATA_FETCH_START).toBe('data-fetch-start');
      expect(PERFORMANCE_MARKS.DATA_FETCH_END).toBe('data-fetch-end');
      expect(PERFORMANCE_MARKS.APP_INTERACTIVE).toBe('app-interactive');
      expect(PERFORMANCE_MARKS.FIRST_RENDER).toBe('first-render');
    });

    it('should have all required measure constants', () => {
      expect(PERFORMANCE_MEASURES.COLD_START).toBe('cold-start-time');
      expect(PERFORMANCE_MEASURES.AUTH_INIT).toBe('auth-init-time');
      expect(PERFORMANCE_MEASURES.DATA_FETCH).toBe('data-fetch-time');
      expect(PERFORMANCE_MEASURES.TIME_TO_INTERACTIVE).toBe('time-to-interactive');
    });
  });
});
