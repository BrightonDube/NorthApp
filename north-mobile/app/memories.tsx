/**
 * Memory Management Screen
 * 
 * Allows users to view and manage their stored memories.
 * Memories are automatically extracted facts about the user (values, goals, 
 * preferences, constraints) that help personalize future coaching conversations.
 * 
 * Features:
 * - List all memories with category badges
 * - Search/filter by content or category
 * - Delete individual memories with confirmation
 * - Empty state for new users
 * 
 * Validates: Requirements 2.2 (Long-Term Memory)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemoriesStore } from '@/stores/memoriesStore';
import { useThemeColors } from '@/contexts/ThemeContext';

// Category display configuration
const CATEGORY_CONFIG = {
  values: { label: 'Values', icon: '💎', color: '#3B82F6' },
  goals: { label: 'Goals', icon: '🎯', color: '#10B981' },
  projects: { label: 'Projects', icon: '📋', color: '#F59E0B' },
  constraints: { label: 'Constraints', icon: '⚠️', color: '#EF4444' },
  preferences: { label: 'Preferences', icon: '⭐', color: '#8B5CF6' },
};

export default function MemoriesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { memories, isLoading, error, fetchMemories, deleteMemory, clearError } = useMemoriesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleDeleteMemory = (memoryId: string, content: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Delete Memory',
      `Are you sure you want to delete this memory?\n\n"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMemory(memoryId);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  const handleCategoryFilter = (category: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  // Filter memories based on search and category
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchQuery.trim() === '' || 
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || memory.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group memories by category for display
  const categoryCounts = memories.reduce((acc, memory) => {
    acc[memory.category] = (acc[memory.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable 
          onPress={handleBack} 
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Memories</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search memories..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search memories"
            accessibilityHint="Filter memories by content"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
          const count = categoryCounts[key] || 0;
          const isSelected = selectedCategory === key;
          
          return (
            <Pressable
              key={key}
              onPress={() => handleCategoryFilter(key)}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: isSelected ? config.color : colors.backgroundSecondary,
                  borderColor: isSelected ? config.color : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${config.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.categoryIcon}>{config.icon}</Text>
              <Text style={[
                styles.categoryLabel,
                { color: isSelected ? '#FFFFFF' : colors.text },
              ]}>
                {config.label}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : colors.border },
                ]}>
                  <Text style={[
                    styles.categoryBadgeText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading memories...
          </Text>
        </View>
      ) : filteredMemories.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>
            {searchQuery || selectedCategory ? '🔍' : '🧠'}
          </Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {searchQuery || selectedCategory ? 'No matches found' : 'No memories yet'}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {searchQuery || selectedCategory
              ? 'Try adjusting your search or filters'
              : 'Start chatting with your coach to build your memory bank'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
          </Text>

          {filteredMemories.map((memory) => {
            const categoryConfig = CATEGORY_CONFIG[memory.category as keyof typeof CATEGORY_CONFIG] || {
              label: memory.category,
              icon: '📝',
              color: colors.textSecondary,
            };

            return (
              <View
                key={memory.id}
                style={[styles.memoryCard, { backgroundColor: colors.backgroundSecondary }]}
              >
                <View style={styles.memoryHeader}>
                  <View style={[styles.categoryTag, { backgroundColor: `${categoryConfig.color}20` }]}>
                    <Text style={styles.categoryTagIcon}>{categoryConfig.icon}</Text>
                    <Text style={[styles.categoryTagText, { color: categoryConfig.color }]}>
                      {categoryConfig.label}
                    </Text>
                  </View>
                  
                  <Pressable
                    onPress={() => handleDeleteMemory(memory.id, memory.content)}
                    style={[styles.deleteButton, { backgroundColor: colors.background }]}
                    accessibilityRole="button"
                    accessibilityLabel="Delete memory"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>

                <Text style={[styles.memoryContent, { color: colors.text }]}>
                  {memory.content}
                </Text>

                <View style={styles.memoryFooter}>
                  <Text style={[styles.memoryDate, { color: colors.textTertiary }]}>
                    {new Date(memory.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  
                  {memory.importance && (
                    <View style={styles.importanceBadge}>
                      <Text style={[styles.importanceText, { color: colors.textSecondary }]}>
                        {memory.importance === 'high' && '⭐⭐⭐'}
                        {memory.importance === 'medium' && '⭐⭐'}
                        {memory.importance === 'low' && '⭐'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  resultCount: {
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  memoryCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryTagIcon: {
    fontSize: 14,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  memoryContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  memoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memoryDate: {
    fontSize: 12,
  },
  importanceBadge: {
    flexDirection: 'row',
  },
  importanceText: {
    fontSize: 12,
  },
});
