/**
 * Legal Layout
 * 
 * Provides a simple stack layout for legal screens.
 * These screens are lazy loaded to improve app startup performance.
 * Animations: Subtle fade transitions (< 200ms)
 */

import { Stack } from 'expo-router';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function LegalLayout() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: prefersReducedMotion ? 'none' : 'fade',
        animationDuration: 180,
      }}
    >
      <Stack.Screen 
        name="privacy" 
        options={{ 
          animation: prefersReducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 180,
        }} 
      />
      <Stack.Screen 
        name="terms" 
        options={{ 
          animation: prefersReducedMotion ? 'none' : 'slide_from_right',
          animationDuration: 180,
        }} 
      />
    </Stack>
  );
}
