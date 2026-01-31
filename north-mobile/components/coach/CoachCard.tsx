/**
 * Coach Card Component
 * 
 * Displays a single coach in the Coach Marketplace.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Validates: Requirements 13.1, 13.2, 13.6
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Coach } from '@/types';

interface CoachCardProps {
  coach: Coach;
  onPress: () => void;
  testID?: string;
}

/**
 * CoachCard displays a coach with icon, name, and description.
 * Provides haptic feedback on press for premium feel.
 * 
 * @example
 * ```tsx
 * <CoachCard
 *   coach={strategyCoach}
 *   onPress={() => router.push(`/chat/${coach.id}`)}
 * />
 * ```
 */
export function CoachCard({ coach, onPress, testID }: CoachCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  // Extract first sentence of system prompt as description
  const description = coach.systemPrompt
    .split('.')[0]
    .replace(/^You are /i, '')
    .trim();

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${coach.name}`}
      accessibilityHint="Opens chat conversation with this coach"
      testID={testID}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{coach.icon}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {coach.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      </View>
      
      <View style={styles.arrowContainer}>
        <Text style={styles.arrow}>→</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4F4F5', // surface color from design system
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    // Subtle shadow for premium feel
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 28,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B', // text-primary from design system
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#71717A', // text-secondary from design system
    lineHeight: 18,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E4E4E7', // surface-highlight from design system
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 16,
    color: '#71717A',
  },
});

export default CoachCard;
