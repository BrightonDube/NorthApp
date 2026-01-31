/**
 * Auth Callback Screen
 * 
 * Handles OAuth callback redirects from providers like Google and Apple.
 * Extracts tokens from the URL and sets the session.
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL that opened this screen
        const url = await Linking.getInitialURL();
        
        if (url) {
          let accessToken: string | null = null;
          let refreshToken: string | null = null;
          
          // Check hash fragment
          if (url.includes('#')) {
            const hashParams = new URLSearchParams(url.split('#')[1]);
            accessToken = hashParams.get('access_token');
            refreshToken = hashParams.get('refresh_token');
          }
          
          // Check query params
          if (!accessToken && url.includes('?')) {
            const queryParams = new URLSearchParams(url.split('?')[1].split('#')[0]);
            accessToken = queryParams.get('access_token');
            refreshToken = queryParams.get('refresh_token');
          }
          
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
        
        // Check if we have a valid session now
        const { data: { session } } = await supabase.auth.getSession();
        
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
