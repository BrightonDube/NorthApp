/**
 * FadeIn Animation Component
 * 
 * A calming entrance animation component that fades in content with an optional slide-up effect.
 * Implements the calm design system's gentle animation principles.
 * 
 * Features:
 * - Fade-in animation (opacity: 0 → 1)
 * - Optional slide-up animation (translateY: 8px → 0)
 * - 400ms duration with ease-gentle curve
 * - Stagger delays for list items (50-100ms)
 * - Respects reduced motion preferences
 * - Dark mode support
 * 
 * Validates: Requirements 3.4, 3.6
 * 
 * @example
 * ```tsx
 * // Basic fade-in
 * <FadeIn>
 *   <Text>Content appears smoothly</Text>
 * </FadeIn>
 * 
 * // Fade-in with slide-up
 * <FadeIn slideUp>
 *   <Card>Card slides up while fading in</Card>
 * </FadeIn>
 * 
 * // Staggered list items
 * {items.map((item, index) => (
 *   <FadeIn key={item.id} delay={index * 50} slideUp>
 *     <ListItem item={item} />
 *   </FadeIn>
 * ))}
 * 
 * // Custom delay and duration
 * <FadeIn delay={200} duration={600}>
 *   <Text>Delayed entrance</Text>
 * </FadeIn>
 * ```
 */

import React, { useEffect } from 'react';
import { View, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface FadeInProps extends ViewProps {
  /**
   * Child elements to animate
   */
  children: React.ReactNode;
  
  /**
   * Whether to include a slide-up animation
   * @default false
   */
  slideUp?: boolean;
  
  /**
   * Delay before animation starts (in milliseconds)
   * Useful for staggering multiple elements
   * @default 0
   */
  delay?: number;
  
  /**
   * Animation duration (in milliseconds)
   * @default 400
   */
  duration?: number;
  
  /**
   * Distance to slide up from (in pixels)
   * Only applies when slideUp is true
   * @default 8
   */
  slideDistance?: number;
  
  /**
   * Whether to disable the animation
   * @default false
   */
  disabled?: boolean;
}

/**
 * Custom easing function for gentle entrance animations
 * Matches the ease-gentle curve: cubic-bezier(0.4, 0.0, 0.2, 1)
 */
const easeGentle = Easing.bezier(0.4, 0.0, 0.2, 1);

/**
 * FadeIn Animation Component
 * 
 * Creates a calming entrance animation with fade-in and optional slide-up.
 * The animation uses a 400ms duration with the ease-gentle curve by default.
 * Supports stagger delays for animating lists of items.
 * 
 * Respects user's reduced motion preferences - animations are disabled
 * when the user has enabled reduced motion in their device settings.
 */
export function FadeIn({
  children,
  slideUp = false,
  delay = 0,
  duration = 400,
  slideDistance = 8,
  disabled = false,
  style,
  ...viewProps
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();
  
  // Shared values for animations
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(slideUp ? slideDistance : 0);
  
  useEffect(() => {
    // Skip animation if disabled or user prefers reduced motion
    if (disabled || prefersReducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    
    // Start fade-in animation
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration,
        easing: easeGentle,
      })
    );
    
    // Start slide-up animation if enabled
    if (slideUp) {
      translateY.value = withDelay(
        delay,
        withTiming(0, {
          duration,
          easing: easeGentle,
        })
      );
    }
  }, [opacity, translateY, delay, duration, slideUp, slideDistance, disabled, prefersReducedMotion]);
  
  // Animated style combining opacity and transform
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });
  
  // If reduced motion is enabled or animation is disabled, render without animation
  if (prefersReducedMotion || disabled) {
    return (
      <View style={style} {...viewProps}>
        {children}
      </View>
    );
  }
  
  return (
    <Animated.View style={[style, animatedStyle]} {...viewProps}>
      {children}
    </Animated.View>
  );
}

/**
 * Utility function to calculate stagger delays for list items
 * 
 * @param index - The index of the item in the list
 * @param staggerDelay - The delay between each item (default: 50ms)
 * @returns The calculated delay for the item
 * 
 * @example
 * ```tsx
 * {items.map((item, index) => (
 *   <FadeIn key={item.id} delay={getStaggerDelay(index)} slideUp>
 *     <ListItem item={item} />
 *   </FadeIn>
 * ))}
 * ```
 */
export function getStaggerDelay(index: number, staggerDelay: number = 50): number {
  return index * staggerDelay;
}

/**
 * Utility function to validate stagger delay is within acceptable range
 * According to design system, stagger delays should be 50-100ms
 * 
 * @param delay - The stagger delay to validate
 * @returns True if delay is within acceptable range (50-100ms)
 */
export function isValidStaggerDelay(delay: number): boolean {
  return delay >= 50 && delay <= 100;
}
