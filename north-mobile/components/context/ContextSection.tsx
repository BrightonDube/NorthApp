/**
 * ContextSection Component
 * 
 * Groups context items by category with a section header.
 * Displays an empty state when no items exist in the category.
 * 
 * Validates: Requirements 14.1, 14.6
 */

import { View, Text } from 'react-native';
import { ContextCard } from './ContextCard';
import type { UserContext, ContextCategory } from '@/types';
import { useThemeColors } from '@/contexts/ThemeContext';

interface ContextSectionProps {
  category: ContextCategory;
  items: UserContext[];
  onEdit: (context: UserContext) => void;
  onDelete: (id: string) => void;
}

/**
 * Category display names for section headers
 */
const categoryTitles = {
  values: 'Values',
  goals: 'Goals',
  projects: 'Projects',
  constraints: 'Constraints',
};

/**
 * Category descriptions for empty states
 */
const categoryDescriptions = {
  values: 'Core principles and beliefs that guide your decisions',
  goals: 'Objectives and aspirations you\'re working towards',
  projects: 'Current active work and initiatives',
  constraints: 'Limitations and boundaries to consider',
};

/**
 * ContextSection Component
 * 
 * Features:
 * - Section header with category name
 * - List of ContextCard components
 * - Empty state with helpful description
 * - Proper spacing and layout
 * 
 * @example
 * ```tsx
 * <ContextSection
 *   category="values"
 *   items={valueItems}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 * ```
 */
export function ContextSection({
  category,
  items,
  onEdit,
  onDelete,
}: ContextSectionProps) {
  const colors = useThemeColors();
  
  return (
    <View className="mb-6">
      {/* Section Header */}
      <Text style={{ color: colors.text }} className="text-xl font-bold mb-3">
        {categoryTitles[category]}
      </Text>

      {/* Context Items or Empty State */}
      {items.length > 0 ? (
        <View>
          {items.map((item) => (
            <ContextCard
              key={item.id}
              context={item}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}
        </View>
      ) : (
        <View
          style={{ 
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
          className="p-4 rounded-xl border"
          accessible
          accessibilityRole="text"
          accessibilityLabel={`No ${categoryTitles[category].toLowerCase()} yet`}
        >
          <Text style={{ color: colors.textSecondary }} className="text-sm text-center">
            No {categoryTitles[category].toLowerCase()} yet
          </Text>
          <Text style={{ color: colors.textTertiary }} className="text-xs text-center mt-1">
            {categoryDescriptions[category]}
          </Text>
        </View>
      )}
    </View>
  );
}
