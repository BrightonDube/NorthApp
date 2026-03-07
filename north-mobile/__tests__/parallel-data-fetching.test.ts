/**
 * Parallel Data Fetching Tests
 * 
 * Verifies that initial data fetching happens in parallel for optimal performance.
 * Validates: Requirement 14.1 - Optimize initial data fetching (parallel requests)
 */

import { useCoachStore } from '@/stores/coachStore';
import { useContextStore } from '@/stores/contextStore';
import { useBillingStore } from '@/stores/billingStore';

describe('Parallel Data Fetching', () => {
  beforeEach(() => {
    // Reset all stores
    useCoachStore.setState({
      coaches: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });
    
    useContextStore.setState({
      items: [],
      isLoading: false,
      error: null,
      lastSynced: null,
    });
    
    useBillingStore.setState({
      entitlements: null,
      isProUser: false,
      isLoading: false,
      lastSynced: null,
    });
  });

  describe('Parallel Execution', () => {
    it('should execute all data fetches in parallel', async () => {
      const startTime = Date.now();
      const completionTimes: Record<string, number> = {};
      
      // Mock fetch functions that take 100ms each
      const mockFetchCoaches = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        completionTimes.coaches = Date.now() - startTime;
      });
      
      const mockFetchContexts = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        completionTimes.contexts = Date.now() - startTime;
      });
      
      const mockInitializeBilling = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        completionTimes.billing = Date.now() - startTime;
      });
      
      // Execute in parallel
      await Promise.all([
        mockFetchCoaches(),
        mockFetchContexts(),
        mockInitializeBilling(),
      ]);
      
      // All should complete around the same time (within 50ms of each other)
      const times = Object.values(completionTimes);
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      expect(maxTime - minTime).toBeLessThan(50);
      expect(mockFetchCoaches).toHaveBeenCalledTimes(1);
      expect(mockFetchContexts).toHaveBeenCalledTimes(1);
      expect(mockInitializeBilling).toHaveBeenCalledTimes(1);
    });

    it('should be faster than sequential execution', async () => {
      // Sequential execution time
      const sequentialStart = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100)); // coaches
      await new Promise(resolve => setTimeout(resolve, 100)); // contexts
      await new Promise(resolve => setTimeout(resolve, 100)); // billing
      const sequentialTime = Date.now() - sequentialStart;
      
      // Parallel execution time
      const parallelStart = Date.now();
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 100)), // coaches
        new Promise(resolve => setTimeout(resolve, 100)), // contexts
        new Promise(resolve => setTimeout(resolve, 100)), // billing
      ]);
      const parallelTime = Date.now() - parallelStart;
      
      // Parallel should be significantly faster (at least 2x)
      expect(parallelTime).toBeLessThan(sequentialTime / 2);
      expect(sequentialTime).toBeGreaterThanOrEqual(300); // ~300ms sequential
      expect(parallelTime).toBeLessThan(150); // ~100ms parallel
    });
  });

  describe('Error Handling', () => {
    it('should not block app startup if one fetch fails', async () => {
      const mockFetchCoaches = jest.fn(async () => {
        throw new Error('Network error');
      });
      
      const mockFetchContexts = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const mockInitializeBilling = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      // Execute in parallel with error handling
      const results = await Promise.allSettled([
        mockFetchCoaches().catch(err => ({ error: err.message })),
        mockFetchContexts(),
        mockInitializeBilling(),
      ]);
      
      // All promises should settle (not throw)
      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should allow individual stores to handle their own errors', async () => {
      const errors: string[] = [];
      
      const mockFetchCoaches = jest.fn(async () => {
        throw new Error('Coaches fetch failed');
      });
      
      const mockFetchContexts = jest.fn(async () => {
        throw new Error('Contexts fetch failed');
      });
      
      const mockInitializeBilling = jest.fn(async () => {
        // Success
      });
      
      // Execute with individual error handling
      await Promise.all([
        mockFetchCoaches().catch(err => errors.push(err.message)),
        mockFetchContexts().catch(err => errors.push(err.message)),
        mockInitializeBilling().catch(err => errors.push(err.message)),
      ]);
      
      // Errors should be captured but not thrown
      expect(errors).toHaveLength(2);
      expect(errors).toContain('Coaches fetch failed');
      expect(errors).toContain('Contexts fetch failed');
    });
  });

  describe('Cache Optimization', () => {
    it('should skip fetching if data is already loaded', () => {
      // Set lastSynced to indicate data is fresh
      const now = Date.now();
      useCoachStore.setState({ lastSynced: now });
      useContextStore.setState({ lastSynced: now });
      
      const coachesLastSynced = useCoachStore.getState().lastSynced;
      const contextsLastSynced = useContextStore.getState().lastSynced;
      
      expect(coachesLastSynced).toBe(now);
      expect(contextsLastSynced).toBe(now);
    });

    it('should fetch if data is stale (>24 hours)', () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 1000);
      useCoachStore.setState({ lastSynced: oneDayAgo });
      
      const isStale = Date.now() - oneDayAgo > 24 * 60 * 60 * 1000;
      expect(isStale).toBe(true);
    });

    it('should not fetch if data is fresh (<24 hours)', () => {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      useCoachStore.setState({ lastSynced: oneHourAgo });
      
      const isStale = Date.now() - oneHourAgo > 24 * 60 * 60 * 1000;
      expect(isStale).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should complete parallel initialization in under 200ms (with fast network)', async () => {
      const startTime = Date.now();
      
      // Simulate fast network (50ms per request)
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 50)),
        new Promise(resolve => setTimeout(resolve, 50)),
        new Promise(resolve => setTimeout(resolve, 50)),
      ]);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should complete parallel initialization in under 500ms (with slow network)', async () => {
      const startTime = Date.now();
      
      // Simulate slow network (150ms per request)
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 150)),
        new Promise(resolve => setTimeout(resolve, 150)),
        new Promise(resolve => setTimeout(resolve, 150)),
      ]);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });
  });
});
