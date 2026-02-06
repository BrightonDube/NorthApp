/**
 * ContextCard Component
 * 
 * Displays an individual context item with category-specific styling,
 * swipe-to-delete gesture, tap-to-edit functionality, and keyboard focus indicators.
 * 
 * Validates: Requirements 14.2, 14.6, 14.7, 23.7
 */

import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { UserContext } from '@/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ContextCardProps {
  context: UserContext;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Category-specific background colors
 * Different colors help users quickly identify context types
 */
const categoryColors = {
  values: 'bg-purple-100 dark:bg-purple-900/30',
  goals: 'bg-blue-100 dark:bg-blue-900/30',
  projects: 'bg-green-100 dark:bg-green-900/30',
  constraints: 'bg-orange-100 dark:bg-orange-900/30',
};

/**
 * Human-readable category labels
 */
const categoryLabels = {
  values: 'Value',
  goals: 'Goal',
  projects: 'Project',
  constraints: 'Constraint',
};

/**
 * ContextCard Component
 * 
 * Features:
 * - Category-specific styling with distinct colors
 * - Swipe-to-delete gesture with haptic feedback
 * - Tap to edit functionality
 * - Content preview (max 3 lines)
 * - Accessibility labels for screen readers
 * - Smooth animations on mount/unmount
 * - Keyboard focus indicators
 * 
 * @example
 * ```tsx
 * <ContextCard
 *   context={contextItem}
 *   onEdit={() => openEditModal(contextItem)}
 *   onDelete={() => handleDelete(contextItem.id)}
 * />
 * ```
 */
export function ContextCard({ context, onEdit, onDelete }: ContextCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();
  
  // Focus indicator color
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';

  /**
   * Handle swipe gesture open with haptic feedback
   * Provides tactile feedback when the delete action is revealed
   */
  const handleSwipeableOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Render the delete action that appears when swiping right
   * Includes haptic feedback for better UX
   */
  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete();
      }}
      style={({ focused }) => [
        styles.deleteButton,
        focused && { borderWidth: 2, borderColor: focusColor },
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Delete context item"
    >
      <Text className="text-white font-semibold">Delete</Text>
    </Pressable>
  );

  return (
    <Animated.View 
      entering={prefersReducedMotion ? undefined : FadeIn} 
      exiting={prefersReducedMotion ? undefined : FadeOut}
    >
      <Swipeable 
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeableOpen}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onEdit();
          }}
          style={({ focused }) => [
            styles.card,
            focused && { borderWidth: 2, borderColor: focusColor },
          ]}
          className={`p-4 rounded-xl mb-3 ${categoryColors[context.category]}`}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${categoryLabels[context.category]}: ${context.content}`}
          accessibilityHint="Double tap to edit"
        >
          <Text className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1">
            {categoryLabels[context.category]}
          </Text>
          <Text
            className="text-base text-zinc-900 dark:text-white"
            numberOfLines={3}
          >
            {context.content}
          </Text>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    minWidth: 80,
    minHeight: 48,
  },
});
