/**
 * Auth Callback Layout
 * 
 * Handles OAuth callback redirects with minimal transitions
 */

import { Stack } from 'expo-router';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function AuthCallbackLayout() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: prefersReducedMotion ? 'none' : 'fade',
        animationDuration: 150, // Quick fade for callback
      }}
    />
  );
}
