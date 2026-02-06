/**
 * Jest Configuration for Integration Tests
 * 
 * This configuration is used for integration tests that need to connect
 * to real external services (Supabase, etc.) without mocks.
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-web-browser|expo-auth-session|expo-crypto|expo-modules-core|@supabase|zustand|react-native-purchases)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '**/__tests__/**/*.integration.test.(ts|tsx|js)',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Longer timeout for integration tests
  testTimeout: 30000,
};
