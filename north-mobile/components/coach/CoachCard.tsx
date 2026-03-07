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
 * - Coach role/description label for clarity
 * 
 * Validates: Requirements 1.2, 2.5, 9.2, 13.1, 13.2, 13.6, 19.7, 23.7
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useThemeColors } from '@/contexts/ThemeContext';
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
 * Get a short description for default coaches based on their name
 */
function getCoachDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'Strategy': 'Business planning & decisions',
    'Marketing': 'Growth & brand strategy',
    'Finance': 'Money & investments',
    'Tech': 'Technology guidance',
    'Leadership': 'Team & management',
    'Wellness': 'Health & balance',
    'Career': 'Professional growth',
    'Creative': 'Ideas & innovation',
  };
  return descriptions[name] || 'Tap to start chatting';
}

/**
 * Check if coach is a PublicCoach with creator information
 */
function isPublicCoach(coach: Coach | PublicCoach): coach is PublicCoach {
  return 'creatorName' in coach;
}

/**
 * CoachCard displays a coach with icon, name, description, and optional marketplace details.
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
  const colors = useThemeColors();

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

  // Category badge color
  const categoryColor = getCategoryColor(coach.category);
  
  // Choose a colored border (not white/black/grey) - deterministic based on coach id
  const cardBorderColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
  const colorIndex = coach.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % cardBorderColors.length;
  const borderColor = cardBorderColors[colorIndex];

  // Determine if we should show marketplace details
  const isMarketplaceMode = variant === 'marketplace';
  const publicCoach = isPublicCoach(coach) ? coach : null;
  
  // Get coach description
  const coachDescription = coach.systemPrompt || getCoachDescription(coach.name);

  return (
    <Animated.View
      entering={prefersReducedMotion ? undefined : FadeIn.duration(400).delay(index * 50)}
    >
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${isMarketplaceMode ? 'Open' : 'Chat with'} ${coach.name}. ${coachDescription}`}
        accessibilityHint={onLongPress ? "Long press to edit" : isMarketplaceMode ? "Opens coach profile" : "Opens chat conversation with this coach"}
        testID={testID}
        style={({ pressed }: { pressed: boolean }) => [
          styles.card,
          { 
            backgroundColor: colors.card,
            borderColor: borderColor,
          },
          isMarketplaceMode && styles.marketplaceCard,
          pressed && styles.pressed,
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

        {/* Coach icon - left side */}
        <View style={styles.iconContainer}>
          <Text style={styles.coachIcon}>{coach.icon}</Text>
        </View>

        {/* Coach info - right side */}
        <View style={{ flex: 1 }}>
          {/* Coach name */}
          <Text 
            style={[styles.coachName, { color: colors.text }]}
            numberOfLines={1}
          >
            {coach.name}
          </Text>

          {/* Coach description/role label - always show for clarity */}
          {!isMarketplaceMode && (
            <Text 
              style={[styles.coachDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {coachDescription}
            </Text>
          )}

          {/* Marketplace-specific content */}
          {isMarketplaceMode && publicCoach && (
            <>
              {/* Description */}
              <Text 
                style={[styles.marketplaceDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {publicCoach.systemPrompt}
              </Text>

              {/* Creator name */}
              <Text 
                style={[styles.creatorName, { color: colors.textTertiary }]}
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
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    minHeight: 100,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  marketplaceCard: {
    minHeight: 220,
    padding: 16,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  shareButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  coachIcon: {
    fontSize: 32,
  },
  coachName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    flex: 1,
  },
  coachDescription: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  marketplaceDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorName: {
    fontSize: 12,
    marginBottom: 8,
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
