/**
 * Reports List Screen
 * 
 * Displays all session reports for the user with filtering and search.
 * Accessible from the Settings or Home screen.
 * 
 * Features:
 * - Paginated list of session reports
 * - Filter by coach
 * - Search by keyword
 * - Pull-to-refresh
 * - Navigate to report detail
 * 
 * Validates: Requirements 4.1-4.7, 7.1, 7.2
 */

import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useReportStore } from '@/stores/reportStore';
import { useCoachStore } from '@/stores/coachStore';
import type { SessionReport } from '@/lib/database.types';

function ReportCard({ report, onPress }: { report: SessionReport; onPress: () => void }) {
  const colors = useThemeColors();
  const { coaches } = useCoachStore();
  const coach = coaches.find((c) => c.id === report.coach_id);

  const date = new Date(report.session_date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const topics = Array.isArray(report.topics) ? report.topics : [];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Report from ${formattedDate} with ${coach?.name || 'coach'}`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
          <View style={[styles.confidenceBadge, {
            backgroundColor: report.confidence === 'high' ? '#10B98120' :
              report.confidence === 'medium' ? '#F59E0B20' : '#EF444420',
          }]}>
            <Text style={[styles.confidenceText, {
              color: report.confidence === 'high' ? '#10B981' :
                report.confidence === 'medium' ? '#F59E0B' : '#EF4444',
            }]}>{report.confidence}</Text>
          </View>
        </View>
        <Text style={[styles.cardCoach, { color: colors.primary }]}>
          {coach?.icon} {coach?.name || 'Coach'}
        </Text>
      </View>

      <Text style={[styles.cardSummary, { color: colors.text }]} numberOfLines={3}>
        {report.summary}
      </Text>

      {topics.length > 0 && (
        <View style={styles.topicsRow}>
          {topics.slice(0, 3).map((topic, i) => (
            <View key={i} style={[styles.topicChip, { backgroundColor: colors.backgroundTertiary }]}>
              <Text style={[styles.topicText, { color: colors.textSecondary }]}>{String(topic)}</Text>
            </View>
          ))}
          {topics.length > 3 && (
            <Text style={[styles.moreTopics, { color: colors.textTertiary }]}>+{topics.length - 3}</Text>
          )}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          {report.message_count} messages · {Math.round(report.session_duration / 60)}min
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

function EmptyReports() {
  const colors = useThemeColors();

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Reports Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Session reports are generated automatically after your coaching conversations.
        Start chatting with a coach to see reports here.
      </Text>
    </View>
  );
}

export default function ReportsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const {
    reports,
    isLoading,
    error,
    hasMore,
    fetchReports,
    setFilters,
    clearError,
  } = useReportStore();

  useEffect(() => {
    fetchReports(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports(true);
    setRefreshing(false);
  }, [fetchReports]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchReports(false);
    }
  }, [hasMore, isLoading, fetchReports]);

  const handleSearch = useCallback(() => {
    setFilters({ searchQuery: searchText || undefined });
  }, [searchText, setFilters]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Session Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search reports..."
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => { setSearchText(''); setFilters({}); }}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {error && (
        <Pressable onPress={clearError} style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.errorText}>{error}</Text>
        </Pressable>
      )}

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReportCard
            report={item}
            onPress={() => router.push(`/report/${item.id}`)}
          />
        )}
        ListEmptyComponent={!isLoading ? <EmptyReports /> : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: { color: '#DC2626', fontSize: 14 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { marginBottom: 8 },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardDate: { fontSize: 13 },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardCoach: { fontSize: 14, fontWeight: '600' },
  cardSummary: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  topicChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  topicText: { fontSize: 12 },
  moreTopics: { fontSize: 12, alignSelf: 'center' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
