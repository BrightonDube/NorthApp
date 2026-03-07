/**
 * Auth Callback Screen
 * 
 * Handles OAuth callback redirects from providers like Google and Apple.
 * Extracts tokens from the URL and sets the session.
 * Works on both web and native platforms.
 * 
 * On native, the deep link URL may arrive via:
 * 1. Linking.getInitialURL() — when the app was cold-started by the deep link
 * 2. Linking.addEventListener('url') — when the app was already running
 * Both paths are handled.
 */

import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STORAGE_KEY = '@north/session';
const USER_STORAGE_KEY = '@north/user';

async function extractAndSetSession(url: string, router: any) {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let code: string | null = null;

  // Check hash fragment (implicit grant)
  if (url.includes('#')) {
    const hashParams = new URLSearchParams(url.split('#')[1]);
    accessToken = hashParams.get('access_token');
    refreshToken = hashParams.get('refresh_token');
  }

  // Check query params
  if (url.includes('?')) {
    const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
    if (!accessToken) {
      accessToken = queryParams.get('access_token');
      refreshToken = queryParams.get('refresh_token');
    }
    code = queryParams.get('code');
  }

  if (accessToken && refreshToken) {
    console.log('[AuthCallback] Setting session with tokens');
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) console.error('[AuthCallback] setSession error:', error);
  } else if (code) {
    console.log('[AuthCallback] Exchanging PKCE code for session');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error('[AuthCallback] exchangeCode error:', error);
  }

  // Check final session state
  const { data: { session } } = await supabase.auth.getSession();
  console.log('[AuthCallback] Session:', session ? 'valid' : 'none');

  if (session) {
    // Fetch profile and update auth store directly
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', session.user.id)
      .single();

    const user = {
      id: session.user.id,
      email: session.user.email || '',
      name: profile?.name || '',
      createdAt: session.user.created_at || new Date().toISOString(),
    };
    const convertedSession = {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || 0,
    };

    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(convertedSession));
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    useAuthStore.setState({ user, session: convertedSession, isLoading: false, error: null });

    if (user.name && user.name.trim().length >= 2) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding');
    }
  } else {
    useAuthStore.setState({ isLoading: false });
    router.replace('/(auth)/login');
  }
}

export default function AuthCallback() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const processUrl = async (url: string) => {
      if (handled.current) return;
      handled.current = true;
      console.log('[AuthCallback] Processing URL:', url.substring(0, 80));
      try {
        await extractAndSetSession(url, router);
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        useAuthStore.setState({ isLoading: false });
        router.replace('/(auth)/login');
      }
    };

    const init = async () => {
      // 1. Try getInitialURL (cold start case)
      if (Platform.OS === 'web') {
        const url = typeof window !== 'undefined' ? window.location.href : null;
        if (url) { await processUrl(url); return; }
      } else {
        const url = await Linking.getInitialURL();
        if (url && url.includes('auth/callback')) {
          await processUrl(url);
          return;
        }
      }

      // 2. Listen for URL event (app was already running case)
      const subscription = Linking.addEventListener('url', ({ url }) => {
        if (url && url.includes('auth/callback')) {
          processUrl(url);
          subscription.remove();
        }
      });

      // 3. Safety timeout — if no URL arrives in 10s, check existing session or bail
      setTimeout(async () => {
        if (handled.current) return;
        handled.current = true;
        subscription.remove();
        console.log('[AuthCallback] Timeout — checking existing session');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', session.user.id)
            .single();
          if (profile?.name) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/onboarding');
          }
        } else {
          useAuthStore.setState({ isLoading: false });
          router.replace('/(auth)/login');
        }
      }, 10000);
    };

    init();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#6B7280', marginTop: 16 }}>Completing sign in...</Text>
      </View>
    </SafeAreaView>
  );
}
