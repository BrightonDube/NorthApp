/**
 * Progress Screen
 * 
 * Shows coaching progress, stats, streaks, and insights.
 * 
 * Free: Basic stats | Pro: Full dashboard + AI insights
 */

import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useProgressStore } from '@/stores/progressStore';
import { useCheckInStore } from '@/stores/checkInStore';
import { useBillingStore } from '@/stores/billingStore';
import { useThemeColors } from '@/contexts/ThemeContext';
import { api, buildAuthHeaders } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function ProgressScreen() {
  const colors = useThemeColors();
  const {
    weeklySummary,
    streakCalendar,
    totalCoachingMinutes,
    totalSessions,
    totalMessages,
    isLoading,
    refreshAll,
  } = useProgressStore();
  const { currentStreak, longestStreak } = useCheckInStore();
  const { isProUser } = useBillingStore();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<{ id: string; insight: string; confidence: number; created_at: string }[]>([]);

  const fetchInsights = useCallback(async () => {
    if (!isProUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${api.insights}?limit=5`, { headers: buildAuthHeaders(session.access_token) });
      if (res.ok) setInsights(await res.json());
    } catch {}
  }, [isProUser]);

  useEffect(() => {
    refreshAll();
    fetchInsights();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAll(), fetchInsights()]);
    setRefreshing(false);
  }, [refreshAll, fetchInsights]);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `🧭 My North coaching stats:\n🔥 ${currentStreak} day streak\n💬 ${totalMessages} messages\n📊 ${totalSessions} coaching sessions\n\nTracking my growth with North AI Coaching!`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Progress</Text>
            <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
              Your coaching journey
            </Text>
          </View>
          <Pressable onPress={handleShare} style={[styles.shareBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {/* Total Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak 🔥</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalMessages}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Messages</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalCoachingMinutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutes</Text>
          </View>
        </View>

        {/* Weekly Summary */}
        {weeklySummary && (
          <View style={[styles.weeklyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>This Week</Text>
            <View style={styles.weeklyGrid}>
              <WeeklyStat icon="💬" value={weeklySummary.sessionsCount} label="Sessions" colors={colors} />
              <WeeklyStat icon="📝" value={weeklySummary.checkInsCount} label="Check-ins" colors={colors} />
              <WeeklyStat icon="✅" value={weeklySummary.actionItemsCompleted} label="Tasks Done" colors={colors} />
              <WeeklyStat
                icon="😊"
                value={weeklySummary.averageMood ? `${weeklySummary.averageMood}/5` : '—'}
                label="Avg Mood"
                colors={colors}
              />
            </View>
          </View>
        )}

        {/* Streak Calendar */}
        {streakCalendar.length > 0 && (
          <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Activity Calendar</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Last 30 days
            </Text>
            <View style={styles.calendarGrid}>
              {streakCalendar.map((day, i) => {
                const hasActivity = day.hasCheckIn || day.hasSession;
                return (
                  <View
                    key={i}
                    style={[
                      styles.calendarDay,
                      {
                        backgroundColor: hasActivity
                          ? day.hasCheckIn && day.hasSession
                            ? colors.primary
                            : `${colors.primary}80`
                          : `${colors.textTertiary}20`,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.calendarLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: `${colors.textTertiary}20` }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>No activity</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: `${colors.primary}80` }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>Some activity</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>Full activity</Text>
              </View>
            </View>
          </View>
        )}

        {/* Records */}
        <View style={[styles.recordsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Records</Text>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>🏆 Longest Streak</Text>
            <Text style={[styles.recordValue, { color: colors.text }]}>{longestStreak} days</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>💬 Total Messages</Text>
            <Text style={[styles.recordValue, { color: colors.text }]}>{totalMessages}</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>📊 Total Sessions</Text>
            <Text style={[styles.recordValue, { color: colors.text }]}>{totalSessions}</Text>
          </View>
        </View>

        {/* AI Insights (Pro) */}
        {isProUser && insights.length > 0 && (
          <View style={[styles.insightsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>AI Insights</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Key takeaways from your sessions
            </Text>
            {insights.map((item) => (
              <View key={item.id} style={[styles.insightRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.insightText, { color: colors.text }]}>{item.insight}</Text>
                <Text style={[styles.insightDate, { color: colors.textTertiary }]}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pro Upsell */}
        {!isProUser && (
          <View style={[styles.proCard, { backgroundColor: `${colors.primary}10`, borderColor: colors.primary }]}>
            <Ionicons name="diamond" size={24} color={colors.primary} />
            <Text style={[styles.proTitle, { color: colors.text }]}>
              Unlock AI Insights
            </Text>
            <Text style={[styles.proDesc, { color: colors.textSecondary }]}>
              Pro users get weekly AI-generated coaching insights and personalized growth recommendations.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WeeklyStat({ icon, value, label, colors }: { icon: string; value: string | number; label: string; colors: any }) {
  return (
    <View style={styles.weeklyStatItem}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[styles.weeklyStatValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.weeklyStatLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  weeklyCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weeklyStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  weeklyStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  weeklyStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calendarDay: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  calendarLegend: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
  },
  recordsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recordLabel: {
    fontSize: 14,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  insightsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  insightRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
  insightDate: {
    fontSize: 11,
    marginTop: 4,
  },
  proCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  proTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  proDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
