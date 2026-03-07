/**
 * Deep Linking Unit Tests
 * 
 * Tests the deep link parsing and navigation utilities.
 */

import { parseDeepLink, createDeepLink, DeepLinkRoute } from '../deepLinking';

describe('Deep Linking', () => {
  describe('parseDeepLink', () => {
    it('should parse chat deep link with coach ID', () => {
      const url = 'north://chat/coach-123';
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: 'chat/[coachId]',
        params: { coachId: 'coach-123' },
      });
    });

    it('should parse context deep link', () => {
      const url = 'north://context';
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: '(tabs)/context',
        params: {},
      });
    });

    it('should parse settings deep link', () => {
      const url = 'north://settings';
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: '(tabs)/settings',
        params: {},
      });
    });

    it('should return null for invalid deep link', () => {
      const url = 'north://invalid';
      const result = parseDeepLink(url);
      
      expect(result).toBeNull();
    });

    it('should return null for malformed URL', () => {
      const url = 'not-a-url';
      const result = parseDeepLink(url);
      
      expect(result).toBeNull();
    });

    it('should handle chat deep link with hostname format', () => {
      const url = 'north://chat';
      const result = parseDeepLink(url);
      
      // Should return null since no coach ID provided
      expect(result).toBeNull();
    });

    it('should parse chat deep link with UUID coach ID', () => {
      const coachId = '550e8400-e29b-41d4-a716-446655440000';
      const url = `north://chat/${coachId}`;
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: 'chat/[coachId]',
        params: { coachId },
      });
    });
  });

  describe('createDeepLink', () => {
    it('should create chat deep link with coach ID', () => {
      const url = createDeepLink('chat', { coachId: 'coach-123' });
      expect(url).toBe('north://chat/coach-123');
    });

    it('should create context deep link', () => {
      const url = createDeepLink('context');
      expect(url).toBe('north://context');
    });

    it('should create settings deep link', () => {
      const url = createDeepLink('settings');
      expect(url).toBe('north://settings');
    });

    it('should create default deep link for unknown screen', () => {
      const url = createDeepLink('unknown');
      expect(url).toBe('north://');
    });

    it('should create chat deep link without coach ID', () => {
      const url = createDeepLink('chat');
      expect(url).toBe('north://chat');
    });
  });

  describe('Deep Link Scenarios', () => {
    it('should handle round-trip for chat link', () => {
      const coachId = 'test-coach-456';
      const url = createDeepLink('chat', { coachId });
      const parsed = parseDeepLink(url);
      
      expect(parsed).toEqual({
        screen: 'chat/[coachId]',
        params: { coachId },
      });
    });

    it('should handle round-trip for context link', () => {
      const url = createDeepLink('context');
      const parsed = parseDeepLink(url);
      
      expect(parsed).toEqual({
        screen: '(tabs)/context',
        params: {},
      });
    });

    it('should handle round-trip for settings link', () => {
      const url = createDeepLink('settings');
      const parsed = parseDeepLink(url);
      
      expect(parsed).toEqual({
        screen: '(tabs)/settings',
        params: {},
      });
    });
  });

  describe('Coach Installation Deep Links', () => {
    it('should parse coach installation deep link', () => {
      const url = 'northapp://coach/install/abc123';
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: '/coach/profile',
        params: { coachId: 'abc123' },
      });
    });

    it('should parse coach installation deep link with UUID', () => {
      const coachId = '550e8400-e29b-41d4-a716-446655440000';
      const url = `northapp://coach/install/${coachId}`;
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: '/coach/profile',
        params: { coachId },
      });
    });

    it('should return null for invalid coach installation link', () => {
      const url = 'northapp://coach/install/';
      const result = parseDeepLink(url);
      
      expect(result).toBeNull();
    });

    it('should create coach installation deep link', () => {
      const url = createDeepLink('coach/install', { coachId: 'abc123' });
      expect(url).toBe('northapp://coach/install/abc123');
    });

    it('should handle round-trip for coach installation link', () => {
      const coachId = 'test-coach-789';
      const url = createDeepLink('coach/install', { coachId });
      const parsed = parseDeepLink(url);
      
      expect(parsed).toEqual({
        screen: '/coach/profile',
        params: { coachId },
      });
    });

    it('should not parse coach installation link with wrong scheme', () => {
      const url = 'north://coach/install/abc123';
      const result = parseDeepLink(url);
      
      expect(result).toBeNull();
    });

    it('should parse coach installation link with hyphens and underscores', () => {
      const url = 'northapp://coach/install/coach-123_abc';
      const result = parseDeepLink(url);
      
      expect(result).toEqual({
        screen: '/coach/profile',
        params: { coachId: 'coach-123_abc' },
      });
    });
  });
});
