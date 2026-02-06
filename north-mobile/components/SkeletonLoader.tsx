/**
 * Skeleton Loader Components
 * 
 * Provides skeleton loading states for different content types.
 * Implements subtle animations for a premium feel.
 * 
 * Features:
 * - Multiple skeleton types (card, list, text)
 * - Subtle pulse animation
 * - Consistent with app design system
 * - Dark mode support
 * 
 * Validates: Requirements 15.2, 19.1-19.7
 */

import { View, StyleSheet, Animated, useColorScheme } from 'react-native';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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
   * Whether to animate the skeleton
   * @default true
   */
  animated?: boolean;
}

/**
 * Base Skeleton Component
 * 
 * A single skeleton element with pulse animation.
 * 
 * @example
 * ```typescript
 * <Skeleton width={200} height={20} />
 * <Skeleton width="100%" height={100} borderRadius={16} />
 * ```
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 12,
  animated = true,
}: SkeletonProps) {
  const colorScheme = useColorScheme();
  const prefersReducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Disable animation if user prefers reduced motion
    if (!animated || prefersReducedMotion) return;

    // Subtle pulse animation (< 200ms transitions as per requirements)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animated, prefersReducedMotion, opacity]);

  const backgroundColor = colorScheme === 'dark' ? '#27272A' : '#F4F4F5';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor,
          opacity: (animated && !prefersReducedMotion) ? opacity : 1,
        },
      ]}
    />
  );
}

/**
 * Coach Card Skeleton
 * 
 * Skeleton loader for coach cards in the home screen.
 * 
 * @example
 * ```typescript
 * <CoachCardSkeleton />
 * ```
 */
export function CoachCardSkeleton() {
  return (
    <View style={styles.coachCard}>
      <Skeleton width={56} height={56} borderRadius={14} />
      <View style={styles.coachCardContent}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} />
      </View>
    </View>
  );
}

/**
 * Context Card Skeleton
 * 
 * Skeleton loader for context items.
 * 
 * @example
 * ```typescript
 * <ContextCardSkeleton />
 * ```
 */
export function ContextCardSkeleton() {
  return (
    <View style={styles.contextCard}>
      <Skeleton width="100%" height={16} />
      <Skeleton width="90%" height={16} />
      <Skeleton width="60%" height={16} />
    </View>
  );
}

/**
 * Message Skeleton
 * 
 * Skeleton loader for chat messages.
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
      <Skeleton width="80%" height={16} />
      <Skeleton width="60%" height={16} />
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
        <Skeleton width={32} height={32} borderRadius={8} />
        <Skeleton width={120} height={20} />
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
