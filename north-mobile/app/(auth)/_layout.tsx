/**
 * Auth Layout
 * 
 * Layout for authentication screens (login, onboarding)
 */

import { Stack } from 'expo-router';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function AuthLayout() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: prefersReducedMotion ? 'none' : 'fade',
        animationDuration: 180, // Keep animations under 200ms per requirements
      }}
    >
      <Stack.Screen 
        name="login" 
        options={{ 
          animation: prefersReducedMotion ? 'none' : 'fade',
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          animation: prefersReducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          animation: prefersReducedMotion ? 'none' : 'fade',
        }} 
      />
    </Stack>
  );
}
