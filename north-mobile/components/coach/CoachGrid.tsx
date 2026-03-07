/**
 * CoachGrid Component
 * 
 * Displays coaches in a 2-column grid layout.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Staggered fade-in animations for cards
 * - Responsive 2-column layout
 * 
 * Validates: Requirements 13.1, 13.6, 19.7
 */

import { View } from 'react-native';
import { CoachCard } from './CoachCard';
import type { Coach } from '@/types';
import { useThemeColors } from '@/contexts/ThemeContext';

interface CoachGridProps {
  coaches: Coach[];
  onCoachPress: (coach: Coach) => void;
  onCoachLongPress?: (coach: Coach) => void;
  testID?: string;
}

/**
 * CoachGrid displays coaches in a single column layout with full-width cards.
 * Provides consistent spacing and layout for coach cards.
 * Cards animate in with a subtle stagger effect.
 * 
 * @example
 * ```tsx
 * <CoachGrid
 *   coaches={allCoaches}
 *   onCoachPress={(coach) => router.push(`/chat/${coach.id}`)}
 *   onCoachLongPress={(coach) => handleEditCoach(coach)}
 * />
 * ```
 */
export function CoachGrid({ 
  coaches, 
  onCoachPress, 
  onCoachLongPress,
  testID 
}: CoachGridProps) {
  const colors = useThemeColors();
  
  return (
    <View style={{ gap: 12 }} testID={testID}>
      {coaches.map((coach, index) => (
        <CoachCard
          key={coach.id}
          coach={coach}
          onPress={() => onCoachPress(coach)}
          onLongPress={onCoachLongPress ? () => onCoachLongPress(coach) : undefined}
          testID={`coach-card-${coach.id}`}
          index={index}
        />
      ))}
    </View>
  );
}

export default CoachGrid;
