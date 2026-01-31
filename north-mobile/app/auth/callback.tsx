/**
 * Auth Callback Screen
 * 
 * Handles OAuth callback redirects from providers like Google and Apple.
 * Extracts tokens from the URL and sets the session.
 * Works on both web and native platforms.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        let url: string | null = null;
        
        // Get the URL based on platform
        if (Platform.OS === 'web') {
          // On web, get the full URL including hash
          url = typeof window !== 'undefined' ? window.location.href : null;
          console.log('Web callback URL:', url);
        } else {
          // On native, use Linking
          url = await Linking.getInitialURL();
          console.log('Native callback URL:', url);
        }
        
        if (url) {
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Check hash fragment (Supabase uses implicit grant by default)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            if (hashPart) {
              const hashParams = new URLSearchParams(hashPart);
              accessToken = hashParams.get('access_token');
              refreshToken = hashParams.get('refresh_token');
              console.log('Found tokens in hash fragment');
            }
          }
          
          // Check query params as fallback
          if (!accessToken && url.includes('?')) {
            const queryPart = url.split('?')[1]?.split('#')[0];
            if (queryPart) {
              const queryParams = new URLSearchParams(queryPart);
              accessToken = queryParams.get('access_token');
              refreshToken = queryParams.get('refresh_token');
              console.log('Found tokens in query params');
            }
          }
          
          if (accessToken && refreshToken) {
            console.log('Setting session with tokens...');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully');
            }
          }
        }
        
        // Check if we have a valid session now
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session check:', session ? 'Found session' : 'No session');
        
        if (session) {
          // Check if user has a profile with name
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
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/(auth)/login');
      }
    };

    handleCallback();
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
