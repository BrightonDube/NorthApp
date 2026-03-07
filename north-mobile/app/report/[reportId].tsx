/**
 * Report Detail Screen
 * 
 * Displays a single session report with full details including:
 * - Summary, insights, decisions, topics
 * - Action items with status management
 * - Session metadata (duration, message count, confidence)
 * 
 * Validates: Requirements 5.2, 7.3, 7.4, 7.5
 */

import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useReportStore } from '@/stores/reportStore';
import { useCoachStore } from '@/stores/coachStore';
import type { ActionItem } from '@/lib/database.types';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InsightItem({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.insightRow}>
      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
      <Text style={[styles.insightText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

function ActionItemRow({ item, onToggle }: { item: ActionItem; onToggle: () => void }) {
  const colors = useThemeColors();
  const isCompleted = item.status === 'completed';

  return (
    <Pressable onPress={onToggle} style={styles.actionItemRow}>
      <Ionicons
        name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={isCompleted ? '#10B981' : colors.textTertiary}
      />
      <Text
        style={[
          styles.actionItemText,
          { color: isCompleted ? colors.textTertiary : colors.text },
          isCompleted && styles.actionItemCompleted,
        ]}
      >
        {item.text}
      </Text>
    </Pressable>
  );
}

export default function ReportDetailScreen() {
  const router = useRouter();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const colors = useThemeColors();
  const { coaches } = useCoachStore();

  const {
    selectedReport: report,
    actionItems,
    isLoading,
    fetchReportById,
    fetchActionItems,
    updateActionItemStatus,
    deleteReport,
  } = useReportStore();

  useEffect(() => {
    if (reportId) {
      fetchReportById(reportId);
      fetchActionItems();
    }
  }, [reportId]);

  const coach = report ? coaches.find((c) => c.id === report.coach_id) : null;
  const reportActionItems = actionItems.filter((a) => a.report_id === reportId);

  const handleToggleAction = async (item: ActionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    await updateActionItemStatus(item.id, newStatus);
  };

  const handleDelete = () => {
    Alert.alert('Delete Report', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (reportId) {
            await deleteReport(reportId);
            router.back();
          }
        },
      },
    ]);
  };

  if (isLoading || !report) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Report</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
            {isLoading ? 'Loading report...' : 'Report not found'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const date = new Date(report.session_date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const insights = Array.isArray(report.key_insights) ? report.key_insights : [];
  const decisions = Array.isArray(report.decisions) ? report.decisions : [];
  const topics = Array.isArray(report.topics) ? report.topics : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Report</Text>
        <Pressable onPress={handleDelete} style={styles.backButton}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meta */}
        <View style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metaCoach, { color: colors.primary }]}>
            {coach?.icon} {coach?.name || 'Coach'}
          </Text>
          <Text style={[styles.metaDate, { color: colors.textSecondary }]}>{formattedDate}</Text>
          <View style={styles.metaStats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{report.message_count}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>messages</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{Math.round(report.session_duration / 60)}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>minutes</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{report.confidence}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>confidence</Text>
            </View>
          </View>
        </View>

        {/* Summary */}
        <Section title="Summary" icon="📝">
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{report.summary}</Text>
        </Section>

        {/* Topics */}
        {topics.length > 0 && (
          <Section title="Topics" icon="🏷️">
            <View style={styles.topicsRow}>
              {topics.map((topic, i) => (
                <View key={i} style={[styles.topicChip, { backgroundColor: colors.backgroundTertiary }]}>
                  <Text style={[styles.topicText, { color: colors.textSecondary }]}>{String(topic)}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <Section title="Key Insights" icon="💡">
            {insights.map((insight, i) => (
              <InsightItem key={i} text={String(insight)} />
            ))}
          </Section>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <Section title="Decisions Made" icon="🎯">
            {decisions.map((decision, i) => (
              <InsightItem key={i} text={String(decision)} />
            ))}
          </Section>
        )}

        {/* Action Items */}
        {reportActionItems.length > 0 && (
          <Section title="Action Items" icon="✅">
            {reportActionItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onToggle={() => handleToggleAction(item)}
              />
            ))}
          </Section>
        )}
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16 },
  metaCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  metaCoach: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  metaDate: { fontSize: 14, marginBottom: 16 },
  metaStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 32 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  summaryText: { fontSize: 15, lineHeight: 24 },
  topicsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  topicText: { fontSize: 13 },
  insightRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  insightText: { fontSize: 15, lineHeight: 22, flex: 1 },
  actionItemRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 },
  actionItemText: { fontSize: 15, flex: 1, lineHeight: 22 },
  actionItemCompleted: { textDecorationLine: 'line-through' },
});
