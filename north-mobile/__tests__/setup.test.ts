/**
 * Test to verify Jest and testing infrastructure is set up correctly
 */

import fc from 'fast-check';
import { PBT_CONFIG, runPropertyTest, property } from './utils/property-helpers';

describe('Testing Infrastructure Setup', () => {
  describe('Jest Configuration', () => {
    it('should run basic unit tests', () => {
      expect(true).toBe(true);
    });

    it('should support async tests', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });

    it('should have access to testing utilities', () => {
      expect(jest).toBeDefined();
      expect(jest.fn).toBeDefined();
      expect(jest.mock).toBeDefined();
    });
  });

  describe('Property-Based Testing Setup', () => {
    it('should run property-based tests with fast-check', () => {
      runPropertyTest(
        property(fc.integer(), (n) => {
          expect(typeof n).toBe('number');
        })
      );
    });

    it('should use correct PBT configuration', () => {
      expect(PBT_CONFIG.numRuns).toBe(100);
    });

    it('should support custom arbitraries', () => {
      const result = fc.sample(fc.string(), 1);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('Mock Setup', () => {
    it('should have AsyncStorage mocked', () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      expect(AsyncStorage.getItem).toBeDefined();
      expect(AsyncStorage.setItem).toBeDefined();
    });

    it('should have Expo Router mocked', () => {
      const { useRouter } = require('expo-router');
      expect(useRouter).toBeDefined();
    });

    it('should have Supabase mocked', () => {
      const { createClient } = require('@supabase/supabase-js');
      expect(createClient).toBeDefined();
    });

    it('should have RevenueCat mocked', () => {
      const Purchases = require('react-native-purchases');
      expect(Purchases.configure).toBeDefined();
    });
  });
});
