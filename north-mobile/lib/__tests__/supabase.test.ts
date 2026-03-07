/**
 * Supabase Client Tests
 * 
 * Tests for the Supabase client configuration and helper functions.
 * Validates: Requirements 1.1 (User Authentication and Session Management)
 */

import { supabase, getCurrentUser, getCurrentSession, signOut } from '../supabase';

describe('Supabase Client', () => {
  describe('Client Configuration', () => {
    it('should be properly initialized', () => {
      expect(supabase).toBeDefined();
      expect(supabase.auth).toBeDefined();
      expect(supabase.from).toBeDefined();
    });

    it('should have auth methods available', () => {
      expect(typeof supabase.auth.signInWithPassword).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
      expect(typeof supabase.auth.getUser).toBe('function');
      expect(typeof supabase.auth.getSession).toBe('function');
    });

    it('should have database query methods available', () => {
      const query = supabase.from('profiles');
      expect(query).toBeDefined();
      expect(typeof query.select).toBe('function');
      expect(typeof query.insert).toBe('function');
      expect(typeof query.update).toBe('function');
      expect(typeof query.delete).toBe('function');
    });
  });

  describe('Helper Functions', () => {
    describe('getCurrentUser', () => {
      it('should return null when not authenticated', async () => {
        // Mock the auth.getUser to return no user
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: null },
          error: null,
        } as any);

        const user = await getCurrentUser();
        expect(user).toBeNull();
      });

      it('should return user when authenticated', async () => {
        const mockUser = {
          id: 'test-user-id',
          email: 'test@example.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };

        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: mockUser },
          error: null,
        } as any);

        const user = await getCurrentUser();
        expect(user).toEqual(mockUser);
      });

      it('should handle errors gracefully', async () => {
        const mockError = new Error('Network error');
        jest.spyOn(supabase.auth, 'getUser').mockResolvedValueOnce({
          data: { user: null },
          error: mockError,
        } as any);

        // Mock console.error to avoid test output pollution
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const user = await getCurrentUser();
        expect(user).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error getting current user:',
          mockError.message
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe('getCurrentSession', () => {
      it('should return null when no session exists', async () => {
        jest.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
          data: { session: null },
          error: null,
        } as any);

        const session = await getCurrentSession();
        expect(session).toBeNull();
      });

      it('should return session when authenticated', async () => {
        const mockSession = {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          },
        };

        jest.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        } as any);

        const session = await getCurrentSession();
        expect(session).toEqual(mockSession);
      });

      it('should handle errors gracefully', async () => {
        const mockError = new Error('Session error');
        jest.spyOn(supabase.auth, 'getSession').mockResolvedValueOnce({
          data: { session: null },
          error: mockError,
        } as any);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const session = await getCurrentSession();
        expect(session).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error getting current session:',
          mockError.message
        );

        consoleErrorSpy.mockRestore();
      });
    });

    describe('signOut', () => {
      it('should call supabase.auth.signOut', async () => {
        const signOutSpy = jest.spyOn(supabase.auth, 'signOut').mockResolvedValueOnce({
          error: null,
        });

        await signOut();
        expect(signOutSpy).toHaveBeenCalled();
      });

      it('should throw error when sign out fails', async () => {
        const mockError = new Error('Sign out failed');
        jest.spyOn(supabase.auth, 'signOut').mockResolvedValueOnce({
          error: mockError,
        } as any);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(signOut()).rejects.toThrow('Sign out failed');
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error signing out:',
          mockError.message
        );

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe database queries', () => {
      // This test verifies that TypeScript types are working correctly
      // The actual type checking happens at compile time
      
      const profilesQuery = supabase.from('profiles');
      const contextQuery = supabase.from('user_context');
      const coachesQuery = supabase.from('coaches');
      const sessionsQuery = supabase.from('chat_sessions');
      const messagesQuery = supabase.from('messages');

      expect(profilesQuery).toBeDefined();
      expect(contextQuery).toBeDefined();
      expect(coachesQuery).toBeDefined();
      expect(sessionsQuery).toBeDefined();
      expect(messagesQuery).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('should have required environment variables', () => {
      expect(process.env.EXPO_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    });

    it('should use correct Supabase URL format', () => {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
    });
  });
});
