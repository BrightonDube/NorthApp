/**
 * Deep Linking Hook
 * 
 * Manages deep link handling throughout the app lifecycle.
 * Handles both initial app launch with deep link and deep links
 * received while the app is running.
 */

import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import { handleDeepLink, parseDeepLink, DeepLinkRoute } from '@/lib/deepLinking';
import { useAuthStore } from '@/stores/authStore';

export function useDeepLinking() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuthStore();
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);

  // Handle initial deep link when app is opened
  useEffect(() => {
    const handleInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          console.log('Initial deep link:', url);
          
          // Wait for root layout to be ready
          // The error "Attempted to navigate before mounting the Root Layout component"
          // happens if we try to navigate too early.
          // Storing it as pending is safer than immediate handling during mount.
          setPendingDeepLink(url);
        }
      } catch (error) {
        console.error('Error handling initial URL:', error);
      }
    };

    handleInitialURL();
  }, []);

  // Handle deep links received while app is running
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link received:', url);
      
      // Always store auth callback deep links — they need to be processed
      // even during loading (e.g., when loginWithGoogle is running)
      if (url && url.includes('auth/callback')) {
        setPendingDeepLink(url);
        return;
      }

      // If user is not authenticated, store the deep link for later
      if (!user && !isLoading) {
        setPendingDeepLink(url);
      } else if (user) {
        // User is authenticated, handle immediately
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user, isLoading]);

  // Handle pending deep link after authentication
  useEffect(() => {
    // Only handle if user is authenticated OR if we are on the root path (ready to navigate)
    if (pendingDeepLink && !isLoading) {
      // Use a longer timeout to ensure layout is mounted
      const timer = setTimeout(() => {
        console.log('Handling pending deep link:', pendingDeepLink);
        handleDeepLink(pendingDeepLink);
        setPendingDeepLink(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [pendingDeepLink, user, isLoading]);

  return {
    pendingDeepLink,
    hasPendingDeepLink: !!pendingDeepLink,
  };
}
