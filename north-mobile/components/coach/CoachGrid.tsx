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

interface CoachGridProps {
  coaches: Coach[];
  onCoachPress: (coach: Coach) => void;
  onCoachLongPress?: (coach: Coach) => void;
  testID?: string;
}

/**
 * CoachGrid displays coaches in a responsive 2-column grid.
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
  // Group coaches into rows of 2
  const rows: Coach[][] = [];
  for (let i = 0; i < coaches.length; i += 2) {
    rows.push(coaches.slice(i, i + 2));
  }

  return (
    <View className="gap-4" testID={testID}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-4">
          {row.map((coach, colIndex) => {
            const index = rowIndex * 2 + colIndex;
            return (
              <CoachCard
                key={coach.id}
                coach={coach}
                onPress={() => onCoachPress(coach)}
                onLongPress={onCoachLongPress ? () => onCoachLongPress(coach) : undefined}
                testID={`coach-card-${coach.id}`}
                index={index}
              />
            );
          })}
          {/* Add spacer if odd number of coaches in last row */}
          {row.length === 1 && <View className="flex-1" />}
        </View>
      ))}
    </View>
  );
}

export default CoachGrid;
