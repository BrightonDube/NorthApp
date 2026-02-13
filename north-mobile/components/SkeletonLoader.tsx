/**
 * Skeleton Loader Components
 * 
 * Provides skeleton loading states with calming shimmer effect.
 * Implements the Calm Design System loading patterns.
 * 
 * Features:
 * - Shimmer effect with gradient animation (1500ms linear)
 * - Surface colors with subtle highlight
 * - Multiple skeleton shapes (text, circle, rectangle)
 * - Dark mode support
 * - Respects reduced motion preferences
 * 
 * Validates: Requirements 7.3, 7.4, 7.5
 */

import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsDark } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
  /**
   * Width of the skeleton element
   * Can be a number (pixels) or percentage string
   */
  width?: number | string;
  
  /**
   * Height of the skeleton element
   */
  height?: number;
  
  /**
   * Border radius
   * @default 12
   */
  borderRadius?: number;
  
  /**
   * Shape variant
   * @default 'rectangle'
   */
  variant?: 'text' | 'circle' | 'rectangle';
  
  /**
   * Whether to animate the skeleton
   * @default true
   */
  animated?: boolean;
}

/**
 * Base Skeleton Component
 * 
 * A single skeleton element with shimmer animation.
 * Uses surface colors with subtle highlight for calming effect.
 * Implements 1500ms linear animation as per Calm Design System.
 * 
 * @example
 * ```typescript
 * <Skeleton width={200} height={20} variant="text" />
 * <Skeleton width={56} height={56} variant="circle" />
 * <Skeleton width="100%" height={100} variant="rectangle" borderRadius={16} />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius,
  variant = 'rectangle',
  animated = true,
}: SkeletonProps) {
  const isDark = useIsDark();
  const prefersReducedMotion = useReducedMotion();
  const shimmerPosition = useRef(new Animated.Value(-1)).current;

  // Determine border radius based on variant
  const effectiveBorderRadius = borderRadius ?? (
    variant === 'circle' ? 9999 :
    variant === 'text' ? 8 :
    12
  );

  // Calm Design System colors - surface with subtle highlight
  // Light mode: #F5F5F4 (surface) with #E7E5E4 (highlight)
  // Dark mode: #1C1917 (surface) with #292524 (highlight)
  const baseColor = isDark ? '#1C1917' : '#F5F5F4';
  const highlightColor = isDark ? '#292524' : '#E7E5E4';

  useEffect(() => {
    // Disable animation if user prefers reduced motion
    if (!animated || prefersReducedMotion) return;

    // Shimmer animation: 1500ms linear (as per Requirements 7.3)
    // Gradient sweeps from left to right continuously
    const animation = Animated.loop(
      Animated.timing(shimmerPosition, {
        toValue: 1,
        duration: 1500, // 1500ms as specified in requirements
        useNativeDriver: true,
        easing: (t) => t, // Linear easing
      })
    );

    animation.start();

    return () => animation.stop();
  }, [animated, prefersReducedMotion, shimmerPosition]);

  // Calculate shimmer gradient position
  // Interpolate from -100% to 100% for smooth sweep effect
  const translateX = shimmerPosition.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-100%', '100%'],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: effectiveBorderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
      ]}
    >
      {animated && !prefersReducedMotion && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              `${baseColor}00`, // Transparent base
              highlightColor,   // Subtle highlight
              `${baseColor}00`, // Transparent base
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Coach Card Skeleton
 * 
 * Skeleton loader for coach cards in the home screen.
 * Uses circle variant for avatar and text variant for labels.
 * 
 * @example
 * ```typescript
 * <CoachCardSkeleton />
 * ```
 */
export function CoachCardSkeleton() {
  return (
    <View style={styles.coachCard}>
      <Skeleton width={56} height={56} variant="circle" />
      <View style={styles.coachCardContent}>
        <Skeleton width="70%" height={18} variant="text" />
        <Skeleton width="50%" height={14} variant="text" />
      </View>
    </View>
  );
}

/**
 * Context Card Skeleton
 * 
 * Skeleton loader for context items.
 * Uses text variant for content lines.
 * 
 * @example
 * ```typescript
 * <ContextCardSkeleton />
 * ```
 */
export function ContextCardSkeleton() {
  return (
    <View style={styles.contextCard}>
      <Skeleton width="100%" height={16} variant="text" />
      <Skeleton width="90%" height={16} variant="text" />
      <Skeleton width="60%" height={16} variant="text" />
    </View>
  );
}

/**
 * Message Skeleton
 * 
 * Skeleton loader for chat messages.
 * Uses text variant for message content.
 * 
 * @example
 * ```typescript
 * <MessageSkeleton isUser={false} />
 * <MessageSkeleton isUser={true} />
 * ```
 */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <View style={[styles.message, isUser && styles.messageUser]}>
      <Skeleton width="80%" height={16} variant="text" />
      <Skeleton width="60%" height={16} variant="text" />
    </View>
  );
}

/**
 * Coach Grid Skeleton
 * 
 * Skeleton loader for the coach grid (2 columns).
 * 
 * @example
 * ```typescript
 * <CoachGridSkeleton count={4} />
 * ```
 */
export function CoachGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View 
      style={styles.grid}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading coaches"
      accessibilityLiveRegion="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.gridItem}>
          <CoachCardSkeleton />
        </View>
      ))}
    </View>
  );
}

/**
 * Context Section Skeleton
 * 
 * Skeleton loader for a context section with multiple items.
 * Uses rectangle variant for icon and text variant for title.
 * 
 * @example
 * ```typescript
 * <ContextSectionSkeleton count={2} />
 * ```
 */
export function ContextSectionSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View 
      style={styles.section}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading context items"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.sectionHeader}>
        <Skeleton width={32} height={32} variant="rectangle" borderRadius={8} />
        <Skeleton width={120} height={20} variant="text" />
      </View>
      {Array.from({ length: count }).map((_, index) => (
        <ContextCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Chat Loading Skeleton
 * 
 * Skeleton loader for the chat screen.
 * 
 * @example
 * ```typescript
 * <ChatLoadingSkeleton />
 * ```
 */
export function ChatLoadingSkeleton() {
  return (
    <View 
      style={styles.chatContainer}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading messages"
      accessibilityLiveRegion="polite"
    >
      <MessageSkeleton isUser={false} />
      <MessageSkeleton isUser={true} />
      <MessageSkeleton isUser={false} />
      <MessageSkeleton isUser={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  coachCardContent: {
    flex: 1,
    gap: 8,
  },
  contextCard: {
    padding: 16,
    gap: 8,
    borderRadius: 14,
    marginBottom: 10,
  },
  message: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6,
    maxWidth: '80%',
  },
  messageUser: {
    alignSelf: 'flex-end',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  chatContainer: {
    padding: 16,
  },
});
