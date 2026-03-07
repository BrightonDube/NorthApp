/**
 * Deep Linking Integration Tests
 * 
 * Tests the complete deep linking flow including hook integration.
 */

import { parseDeepLink, handleDeepLink, createDeepLink } from '@/lib/deepLinking';

describe('Deep Linking Integration', () => {
  describe('End-to-End Flow', () => {
    it('should handle complete chat deep link flow', () => {
      const coachId = '550e8400-e29b-41d4-a716-446655440000';
      
      // 1. Create deep link
      const url = createDeepLink('chat', { coachId });
      expect(url).toBe(`north://chat/${coachId}`);
      
      // 2. Parse deep link
      const route = parseDeepLink(url);
      expect(route).not.toBeNull();
      expect(route?.screen).toBe('chat/[coachId]');
      expect(route?.params?.coachId).toBe(coachId);
    });

    it('should handle complete context deep link flow', () => {
      // 1. Create deep link
      const url = createDeepLink('context');
      expect(url).toBe('north://context');
      
      // 2. Parse deep link
      const route = parseDeepLink(url);
      expect(route).not.toBeNull();
      expect(route?.screen).toBe('(tabs)/context');
      expect(route?.params).toEqual({});
    });

    it('should handle complete settings deep link flow', () => {
      // 1. Create deep link
      const url = createDeepLink('settings');
      expect(url).toBe('north://settings');
      
      // 2. Parse deep link
      const route = parseDeepLink(url);
      expect(route).not.toBeNull();
      expect(route?.screen).toBe('(tabs)/settings');
      expect(route?.params).toEqual({});
    });

    it('should handle invalid deep link gracefully', () => {
      const invalidUrl = 'north://invalid-screen';
      
      // Should parse but return null
      const route = parseDeepLink(invalidUrl);
      expect(route).toBeNull();
    });

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'http://example.com',
        'north://',
        '',
        'north://chat', // Missing coach ID
      ];

      malformedUrls.forEach(url => {
        const route = parseDeepLink(url);
        expect(route).toBeNull();
      });
    });
  });

  describe('URL Scheme Validation', () => {
    it('should only accept north:// scheme', () => {
      const invalidSchemes = [
        'http://chat/coach-123',
        'https://chat/coach-123',
        'myapp://chat/coach-123',
        'ftp://chat/coach-123',
      ];

      invalidSchemes.forEach(url => {
        const route = parseDeepLink(url);
        expect(route).toBeNull();
      });
    });

    it('should accept valid north:// URLs', () => {
      const validUrls = [
        'north://chat/coach-123',
        'north://context',
        'north://settings',
      ];

      validUrls.forEach(url => {
        const route = parseDeepLink(url);
        expect(route).not.toBeNull();
      });
    });
  });

  describe('Coach ID Handling', () => {
    it('should handle various coach ID formats', () => {
      const coachIds = [
        '550e8400-e29b-41d4-a716-446655440000', // UUID
        'coach-123', // Simple ID
        'my-custom-coach', // Kebab case
        'coach_with_underscores', // Underscores
      ];

      coachIds.forEach(coachId => {
        const url = createDeepLink('chat', { coachId });
        const route = parseDeepLink(url);
        
        expect(route).not.toBeNull();
        expect(route?.params?.coachId).toBe(coachId);
      });
    });

    it('should preserve special characters in coach IDs', () => {
      const specialIds = [
        'coach-with-dashes',
        'coach_with_underscores',
        'coach.with.dots',
      ];

      specialIds.forEach(coachId => {
        const url = createDeepLink('chat', { coachId });
        const route = parseDeepLink(url);
        
        expect(route?.params?.coachId).toBe(coachId);
      });
    });
  });
});
