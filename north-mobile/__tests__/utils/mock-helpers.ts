/**
 * Mock helpers for testing
 */

/**
 * Mock Supabase client with common responses
 */
export function createMockSupabaseClient(overrides?: any) {
  const mockClient = {
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      ...overrides?.auth,
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      ...overrides?.from?.[table],
    })),
    ...overrides,
  };

  return mockClient;
}

/**
 * Mock RevenueCat with common responses
 */
export function createMockRevenueCat(overrides?: any) {
  return {
    configure: jest.fn(),
    getCustomerInfo: jest.fn().mockResolvedValue({
      entitlements: {
        active: {},
      },
    }),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
    setDebugLogsEnabled: jest.fn(),
    ...overrides,
  };
}

/**
 * Mock router for navigation testing
 */
export function createMockRouter(overrides?: any) {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    ...overrides,
  };
}

/**
 * Mock AsyncStorage
 */
export function createMockAsyncStorage() {
  const storage: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((key) => [key, storage[key] || null]))
    ),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
    multiRemove: jest.fn((keys: string[]) => {
      keys.forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: any, ok: boolean = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };
  const mocks = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(() => {
    global.console = { ...console, ...mocks };
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  return mocks;
}

/**
 * Create a mock timer for testing time-dependent code
 */
export function useMockTimers() {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
}
