/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client with proper configuration
 * for authentication and database operations.
 * 
 * Validates: Requirements 1.1 (User Authentication and Session Management)
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './database.types';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that required environment variables are present
// Log error instead of throwing to prevent app crash at module load time
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing environment variables. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file or EAS secrets.'
  );
  console.error('[Supabase] URL present:', !!supabaseUrl, '| Key present:', !!supabaseAnonKey);
}

/**
 * Configured Supabase client instance
 * 
 * Features:
 * - Automatic session persistence using AsyncStorage
 * - Auto-refresh of expired tokens
 * - Type-safe database operations
 * - Authentication helpers
 * 
 * Usage:
 * ```typescript
 * import { supabase } from '@/lib/supabase';
 * 
 * // Authentication
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password'
 * });
 * 
 * // Database operations
 * const { data: contexts } = await supabase
 *   .from('user_context')
 *   .select('*')
 *   .eq('user_id', userId);
 * ```
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for session persistence across app restarts
    // This enables automatic session restoration (Requirement 1.3)
    storage: AsyncStorage,
    
    // Automatically refresh tokens when they expire
    autoRefreshToken: true,
    
    // Persist session to storage
    persistSession: true,
    
    // Detect session from URL (useful for OAuth flows)
    detectSessionInUrl: false,
  },
});

/**
 * Helper function to get the current authenticated user
 * 
 * @returns The current user or null if not authenticated
 * 
 * @example
 * ```typescript
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * }
 * ```
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error.message);
    return null;
  }
  
  return user;
}

/**
 * Helper function to get the current session
 * 
 * @returns The current session or null if not authenticated
 * 
 * @example
 * ```typescript
 * const session = await getCurrentSession();
 * if (session) {
 *   console.log('Access token:', session.access_token);
 * }
 * ```
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting current session:', error.message);
    return null;
  }
  
  return session;
}

/**
 * Helper function to sign out the current user
 * 
 * This clears the session from storage and signs out from Supabase
 * 
 * @example
 * ```typescript
 * await signOut();
 * // User is now signed out
 * ```
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

/**
 * Type-safe database client
 * 
 * This provides full TypeScript support for database operations
 * based on the generated database types.
 */
export type SupabaseClient = typeof supabase;

/**
 * Auth state change listener type
 * 
 * Use this to listen for authentication state changes:
 * 
 * @example
 * ```typescript
 * supabase.auth.onAuthStateChange((event, session) => {
 *   if (event === 'SIGNED_IN') {
 *     console.log('User signed in:', session?.user.email);
 *   } else if (event === 'SIGNED_OUT') {
 *     console.log('User signed out');
 *   }
 * });
 * ```
 */
export type AuthChangeEvent = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';
