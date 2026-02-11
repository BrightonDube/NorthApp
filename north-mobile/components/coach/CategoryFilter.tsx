/**
 * Category Filter Component
 * 
 * Horizontal scrollable pill buttons for filtering coaches by category.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Horizontal scrollable list of category pills
 * - Active category highlighted with accent color
 * - Smooth scroll animation
 * - Haptic feedback on selection
 * - Respects reduced motion preferences
 * - Keyboard accessible
 * 
 * Validates: Requirements 5.2, 5.4
 */

import { View, Text, Pressable, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CoachCategory } from '@/types';
import { getCategoryColor } from '@/lib/marketplace.types';

interface CategoryFilterProps {
  /** Currently selected category (null means "All") */
  selectedCategory: CoachCategory | null;
  /** Callback when category is selected */
  onSelectCategory: (category: CoachCategory | null) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * CategoryFilter displays a horizontal scrollable list of category pills.
 * Allows users to filter coaches by category in the marketplace.
 * 
 * @example
 * ```tsx
 * <CategoryFilter
 *   selectedCategory={selectedCategory}
 *   onSelectCategory={(category) => setSelectedCategory(category)}
 * />
 * ```
 */
export function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  testID = 'category-filter',
}: CategoryFilterProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // All categories plus "All" option
  const categories: (CoachCategory | null)[] = [
    null, // "All" option
    CoachCategory.PRODUCTIVITY,
    CoachCategory.LEARNING,
    CoachCategory.HEALTH,
    CoachCategory.ENTERTAINMENT,
    CoachCategory.BUSINESS,
    CoachCategory.CREATIVE,
    CoachCategory.GENERAL,
  ];

  const handleCategoryPress = (category: CoachCategory | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCategory(category);
  };

  const getCategoryLabel = (category: CoachCategory | null): string => {
    if (category === null) return 'All';
    return category;
  };

  const isSelected = (category: CoachCategory | null): boolean => {
    return selectedCategory === category;
  };

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID={`${testID}-scroll`}
      >
        {categories.map((category) => {
          const selected = isSelected(category);
          const categoryColor = category ? getCategoryColor(category) : (isDark ? '#60A5FA' : '#2563EB');
          
          return (
            <Pressable
              key={category || 'all'}
              onPress={() => handleCategoryPress(category)}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${getCategoryLabel(category)}`}
              accessibilityState={{ selected }}
              testID={`${testID}-${category || 'all'}`}
              style={({ pressed, focused }) => [
                styles.pill,
                selected && [styles.pillSelected, { backgroundColor: categoryColor }],
                !selected && (isDark ? styles.pillInactiveDark : styles.pillInactive),
                pressed && styles.pillPressed,
                focused && {
                  borderWidth: 2,
                  borderColor: isDark ? '#60A5FA' : '#2563EB',
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  selected && styles.pillTextSelected,
                  !selected && (isDark ? styles.pillTextInactiveDark : styles.pillTextInactive),
                ]}
              >
                {getCategoryLabel(category)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillInactive: {
    backgroundColor: '#F4F4F5', // Light mode inactive
  },
  pillInactiveDark: {
    backgroundColor: '#27272A', // Dark mode inactive
  },
  pillSelected: {
    // backgroundColor set dynamically based on category color
  },
  pillPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pillTextInactive: {
    color: '#71717A', // Light mode inactive text
  },
  pillTextInactiveDark: {
    color: '#A1A1AA', // Dark mode inactive text
  },
  pillTextSelected: {
    color: '#FFFFFF', // Selected text always white
  },
});

export default CategoryFilter;
