/**
 * Marketplace Screen
 * 
 * Main discovery interface for browsing and installing public coaches.
 * Follows Simon's brief: "Beautiful, minimal, clean" design.
 * 
 * Features:
 * - Search bar for filtering coaches
 * - Category filter for browsing by category
 * - Featured section (horizontal scroll, max 5 coaches)
 * - Grid layout for all public coaches
 * - Pull-to-refresh functionality
 * - Tap to preview coach before installing
 * - Share button on coach cards
 * - Empty states and loading skeletons
 * 
 * Validates: Requirements 1.1, 1.2, 5.2, 6.1, 7.1, 9.1
 */

import { View, Text, ScrollView, TextInput, RefreshControl, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { CoachCard, CategoryFilter } from '@/components/coach';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { CoachGridSkeleton } from '@/components/SkeletonLoader';
import { Logo } from '@/components/Logo';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/supabase';
import { searchEngine } from '@/lib/searchEngine';
import { coachDeepLinkGenerator } from '@/lib/coachDeepLinkGenerator';
import { dbCoachToCoach, filterByCategory } from '@/lib/marketplace.types';
import { useTheme } from '@/lib/theme';
import type { PublicCoach, CoachCategory } from '@/types';

/**
 * App Logo Component
 */
function AppLogo() {
  const { colors } = useTheme();
  return (
    <View style={styles.logoContainer}>
      <Logo size={40} />
      <Text style={[styles.logoText, { color: colors.text }]}>Marketplace</Text>
    </View>
  );
}

/**
 * Search Bar Component
 */
function SearchBar({ 
  value, 
  onChangeText, 
  onClear 
}: { 
  value: string; 
  onChangeText: (text: string) => void; 
  onClear: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.searchContainer, { backgroundColor: colors.input }]}>
      <Ionicons 
        name="search" 
        size={20} 
        color={colors.textTertiary} 
        style={styles.searchIcon} 
      />
      <TextInput
        style={[styles.searchInput, { color: colors.inputText }]}
        placeholder="Search coaches..."
        placeholderTextColor={colors.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessible
        accessibilityLabel="Search coaches"
        accessibilityHint="Type to search by name, description, or creator"
      />
      {value.length > 0 && (
        <Pressable 
          onPress={onClear}
          style={styles.clearButton}
          accessible
          accessibilityLabel="Clear search"
          accessibilityRole="button"
        >
          <Ionicons 
            name="close-circle" 
            size={20} 
            color={colors.textTertiary} 
          />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Featured Section Component
 */
function FeaturedSection({ 
  coaches, 
  onCoachPress,
  onShare
}: { 
  coaches: PublicCoach[]; 
  onCoachPress: (coach: PublicCoach) => void;
  onShare: (coachId: string) => void;
}) {
  const { colors } = useTheme();

  if (coaches.length === 0) {
    return null;
  }

  return (
    <View style={styles.featuredSection}>
      <Text 
        style={[styles.sectionTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        Featured Coaches
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.featuredScroll}
        testID="featured-coaches-scroll"
      >
        {coaches.map((coach, index) => (
          <View key={coach.id} style={styles.featuredCard}>
            <CoachCard
              coach={coach}
              onPress={() => onCoachPress(coach)}
              onShare={onShare}
              showShareButton={true}
              variant="marketplace"
              testID={`featured-coach-${index}`}
              index={index}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Empty State Component
 */
function EmptyState({ 
  searchQuery, 
  selectedCategory 
}: { 
  searchQuery: string; 
  selectedCategory: CoachCategory | null;
}) {
  const { colors } = useTheme();

  const message = searchQuery 
    ? `No coaches found for "${searchQuery}"`
    : selectedCategory
    ? `No coaches in ${selectedCategory} category`
    : 'No public coaches available';

  return (
    <View 
      style={styles.emptyState}
      accessible
      accessibilityRole="text"
      accessibilityLabel={message}
    >
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text 
        style={[styles.emptyTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        {message}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {searchQuery ? 'Try a different search term' : 'Check back later for new coaches'}
      </Text>
    </View>
  );
}

/**
 * Error State Component
 */
function ErrorState({ 
  message, 
  onRetry 
}: { 
  message: string; 
  onRetry: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View 
      style={styles.emptyState}
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text 
        style={[styles.emptyTitle, { color: colors.text }]}
        accessibilityRole="header"
      >
        Something went wrong
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
        {message}
      </Text>
      <Pressable 
        onPress={onRetry} 
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading coaches"
      >
        <Text style={[styles.retryText, { color: colors.primaryText }]}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  
  // State
  const [coaches, setCoaches] = useState<PublicCoach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CoachCategory | null>(null);

  // Debounce search query (300ms) to avoid excessive filtering
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch public coaches from Supabase
  const fetchPublicCoaches = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch public coaches
      const { data: coachesData, error: fetchError } = await supabase
        .from('coaches')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Fetch creator profiles for all coaches
      const creatorIds = [...new Set(
        (coachesData || [])
          .map(c => c.creator_id)
          .filter((id): id is string => id !== null)
      )];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', creatorIds);

      // Create a map of creator IDs to names
      const creatorMap = new Map(
        (profilesData || []).map(p => [p.id, p.name])
      );

      // Transform database coaches to PublicCoach type
      const publicCoaches: PublicCoach[] = (coachesData || []).map(dbCoach => ({
        ...dbCoachToCoach(dbCoach),
        creatorName: dbCoach.creator_id ? (creatorMap.get(dbCoach.creator_id) || 'Unknown') : 'North',
      }));

      setCoaches(publicCoaches);
    } catch (err) {
      console.error('Error fetching public coaches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load coaches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPublicCoaches();
  }, [fetchPublicCoaches]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPublicCoaches();
    setRefreshing(false);
  }, [fetchPublicCoaches]);

  // Filter coaches by search and category
  const filteredCoaches = useMemo(() => {
    let result = coaches;

    // Apply search filter using debounced query
    if (debouncedSearchQuery.trim()) {
      result = searchEngine.search(result, debouncedSearchQuery);
    }

    // Apply category filter
    if (selectedCategory) {
      result = filterByCategory(result, selectedCategory);
    }

    return result;
  }, [coaches, debouncedSearchQuery, selectedCategory]);

  // Get featured coaches (max 5)
  const featuredCoaches = useMemo(() => {
    return coaches
      .filter(coach => coach.isFeatured)
      .slice(0, 5);
  }, [coaches]);

  // Handle coach press - navigate to preview
  const handleCoachPress = (coach: PublicCoach) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/coach/preview?coachId=${coach.id}`);
  };

  // Handle share button
  const handleShare = async (coachId: string) => {
    try {
      const link = coachDeepLinkGenerator.generateCoachLink(coachId);
      await coachDeepLinkGenerator.openShareDialog(link);
    } catch (err) {
      console.error('Error sharing coach:', err);
    }
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Show loading state on initial load
  if (isLoading && coaches.length === 0 && !refreshing) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        edges={['top']}
      >
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <AppLogo />
        </View>
        <View style={styles.content}>
          <View style={styles.searchSection}>
            <SearchBar 
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={handleClearSearch}
            />
          </View>
          <CoachGridSkeleton count={6} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      edges={['top']}
    >
      <OfflineIndicator />
      
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <AppLogo />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        showsVerticalScrollIndicator={false}
        testID="marketplace-scroll"
      >
        {/* Search Bar */}
        <View style={styles.searchSection}>
          <SearchBar 
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={handleClearSearch}
          />
        </View>

        {/* Category Filter */}
        <View style={styles.categorySection}>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </View>

        {/* Error State */}
        {error && coaches.length === 0 ? (
          <ErrorState message={error} onRetry={onRefresh} />
        ) : (
          <>
            {/* Featured Section - only show if no search/filter active */}
            {!debouncedSearchQuery && !selectedCategory && featuredCoaches.length > 0 && (
              <FeaturedSection
                coaches={featuredCoaches}
                onCoachPress={handleCoachPress}
                onShare={handleShare}
              />
            )}

            {/* All Coaches Grid */}
            {filteredCoaches.length > 0 ? (
              <View style={styles.gridSection}>
                <Text 
                  style={[styles.sectionTitle, { color: colors.text }]}
                  accessibilityRole="header"
                >
                  {searchQuery || selectedCategory ? 'Results' : 'All Coaches'}
                </Text>
                <View style={styles.grid}>
                  {filteredCoaches.map((coach, index) => (
                    <View key={coach.id} style={styles.gridItem}>
                      <CoachCard
                        coach={coach}
                        onPress={() => handleCoachPress(coach)}
                        onShare={handleShare}
                        showShareButton={true}
                        variant="marketplace"
                        testID={`coach-card-${index}`}
                        index={index}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState 
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
              />
            )}
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  categorySection: {
    marginBottom: 16,
  },
  featuredSection: {
    marginBottom: 32,
    paddingLeft: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuredScroll: {
    paddingRight: 24,
    gap: 16,
  },
  featuredCard: {
    width: 280,
  },
  gridSection: {
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
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
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minHeight: 48,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
