/**
 * Jest Setup for Integration Tests
 * 
 * This setup file is used for integration tests that connect to real services.
 * Unlike the regular jest.setup.js, this does NOT mock Supabase or other external services.
 */

// Load environment variables from .env file for tests
require('dotenv').config();

// Mock only AsyncStorage (still needed for React Native compatibility)
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo Router (not needed for integration tests)
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: ({ children }) => children,
  Redirect: () => null,
  Stack: {
    Screen: () => null,
  },
  Tabs: {
    Screen: () => null,
  },
}));

// Mock RevenueCat (not needed for database integration tests)
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getCustomerInfo: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  setDebugLogsEnabled: jest.fn(),
}));

// DO NOT mock Supabase - we want to use the real client for integration tests

// Silence console warnings in tests (but keep errors)
const originalWarn = console.warn;
const originalError = console.error;

global.console = {
  ...console,
  warn: jest.fn((...args) => {
    // Only suppress specific warnings, log others
    const message = args[0]?.toString() || '';
    if (!message.includes('Warning:') && !message.includes('Deprecation')) {
      originalWarn(...args);
    }
  }),
  error: jest.fn((...args) => {
    // Log all errors in integration tests
    originalError(...args);
  }),
};

// Set up global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);
