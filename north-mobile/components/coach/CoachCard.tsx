/**
 * Coach Card Component
 * 
 * Displays a single coach in the Coach Marketplace or user's coach list.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Subtle fade-in animation on mount
 * - Haptic feedback on press
 * - Respects reduced motion preferences
 * - Keyboard focus indicators for accessibility
 * - Share button for public coaches (marketplace mode)
 * - Category badge display
 * - Creator name display (marketplace mode)
 * - Description truncation (marketplace mode)
 * 
 * Validates: Requirements 1.2, 2.5, 9.2, 13.1, 13.2, 13.6, 19.7, 23.7
 */

import { View, Text, Pressable, StyleSheet, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { Coach, PublicCoach } from '@/types';
import { getCategoryColor } from '@/lib/marketplace.types';

interface CoachCardProps {
  coach: Coach | PublicCoach;
  onPress: () => void;
  onLongPress?: () => void;
  onShare?: (coachId: string) => void;
  showShareButton?: boolean;
  variant?: 'default' | 'marketplace';
  testID?: string;
  index?: number; // For staggered animations
}

/**
 * Check if coach is a PublicCoach with creator information
 */
function isPublicCoach(coach: Coach | PublicCoach): coach is PublicCoach {
  return 'creatorName' in coach;
}

/**
 * CoachCard displays a coach with icon, name, and optional marketplace details.
 * Provides haptic feedback on press for premium feel.
 * 
 * @example
 * ```tsx
 * // Default mode (user's coaches)
 * <CoachCard
 *   coach={strategyCoach}
 *   onPress={() => router.push(`/chat/${coach.id}`)}
 *   onLongPress={() => handleEditCoach(coach)}
 *   index={0}
 * />
 * 
 * // Marketplace mode (public coaches)
 * <CoachCard
 *   coach={publicCoach}
 *   variant="marketplace"
 *   onPress={() => handlePreview(coach.id)}
 *   onShare={(id) => handleShare(id)}
 *   showShareButton={true}
 *   index={0}
 * />
 * ```
 */
export function CoachCard({ 
  coach, 
  onPress, 
  onLongPress, 
  onShare,
  showShareButton = false,
  variant = 'default',
  testID, 
  index = 0 
}: CoachCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const handleShare = (e: any) => {
    // Stop propagation to prevent card press (if available in event)
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (onShare && coach.isPublic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onShare(coach.id);
    }
  };

  // Focus indicator color
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';
  
  // Category badge color
  const categoryColor = getCategoryColor(coach.category);

  // Determine if we should show marketplace details
  const isMarketplaceMode = variant === 'marketplace';
  const publicCoach = isPublicCoach(coach) ? coach : null;

  return (
    <Animated.View
      entering={prefersReducedMotion ? undefined : FadeIn.duration(400).delay(index * 50)}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${isMarketplaceMode ? 'Preview' : 'Chat with'} ${coach.name}`}
        accessibilityHint={onLongPress ? "Long press to edit" : isMarketplaceMode ? "Opens coach preview" : "Opens chat conversation with this coach"}
        testID={testID}
        style={({ pressed, focused }) => [
          styles.card,
          colorScheme === 'dark' && styles.cardDark,
          isMarketplaceMode && styles.marketplaceCard,
          pressed && styles.pressed,
          focused && { 
            borderWidth: 2, 
            borderColor: focusColor,
          },
        ]}
      >
        {/* Share button - top right corner */}
        {showShareButton && coach.isPublic && onShare && (
          <Pressable
            onPress={handleShare}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Share ${coach.name}`}
            accessibilityHint="Opens share dialog"
            style={styles.shareButton}
            testID={`${testID}-share-button`}
          >
            <Text style={styles.shareIcon}>↗️</Text>
          </Pressable>
        )}

        {/* Coach icon */}
        <Text className="text-5xl mb-3">{coach.icon}</Text>

        {/* Coach name */}
        <Text 
          className="text-base font-semibold text-zinc-900 dark:text-white leading-5 mb-2"
          numberOfLines={1}
        >
          {coach.name}
        </Text>

        {/* Marketplace-specific content */}
        {isMarketplaceMode && publicCoach && (
          <>
            {/* Description */}
            <Text 
              className="text-sm text-zinc-600 dark:text-zinc-400 leading-5 mb-3"
              numberOfLines={2}
            >
              {publicCoach.systemPrompt}
            </Text>

            {/* Creator name */}
            <Text 
              className="text-xs text-zinc-500 dark:text-zinc-500 mb-2"
              numberOfLines={1}
            >
              by {publicCoach.creatorName}
            </Text>

            {/* Category badge */}
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
              <Text style={styles.categoryText}>{coach.category}</Text>
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F4F4F5', // Light mode
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minHeight: 130,
    position: 'relative',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#18181B', // Dark mode
    shadowOpacity: 0.3,
  },
  marketplaceCard: {
    minHeight: 220,
    padding: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  shareButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for share button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  shareIcon: {
    fontSize: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default CoachCard;
