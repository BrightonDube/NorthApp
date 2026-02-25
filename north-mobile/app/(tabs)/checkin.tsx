/**
 * Check-In Screen
 * 
 * Daily check-in for mood, energy, priorities, and reflections.
 * Tracks streaks and provides entry point for coaching.
 * 
 * Free: 3 check-ins/week | Pro: Unlimited
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCheckInStore } from '@/stores/checkInStore';
import { useBillingStore } from '@/stores/billingStore';
import { PaywallModal } from '@/components/billing/PaywallModal';
import { useThemeColors } from '@/contexts/ThemeContext';

const MOOD_LABELS = ['😫', '😕', '😐', '🙂', '😄'];
const ENERGY_LABELS = ['🔋', '🔋', '🔋', '🔋', '⚡'];
const ENERGY_TEXTS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

export default function CheckInScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const {
    checkIns,
    currentStreak,
    longestStreak,
    weeklyCount,
    isLoading,
    fetchCheckIns,
    submitCheckIn,
    canCheckIn,
    getMoodTrend,
  } = useCheckInStore();
  const { isProUser, showPaywall } = useBillingStore();
  
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [priorities, setPriorities] = useState('');
  const [reflection, setReflection] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [checkInType, setCheckInType] = useState<'morning' | 'evening'>(
    new Date().getHours() < 14 ? 'morning' : 'evening'
  );
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCheckIns();
    setRefreshing(false);
  }, [fetchCheckIns]);

  const handleStartCheckIn = () => {
    if (!canCheckIn(isProUser)) {
      setShowPaywallModal(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await submitCheckIn({
        mood,
        energy,
        priorities: priorities.split('\n').filter(p => p.trim()),
        reflection,
        gratitude,
        type: checkInType,
      });
      
      setShowForm(false);
      setMood(3);
      setEnergy(3);
      setPriorities('');
      setReflection('');
      setGratitude('');

      const updatedStreak = useCheckInStore.getState().currentStreak;
      Alert.alert('✅ Check-in Complete!', `Your streak: ${updatedStreak} days 🔥`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit check-in');
    }
  };

  const moodTrend = getMoodTrend(7);
  const todayDate = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = checkIns.some(
    c => c.createdAt.split('T')[0] === todayDate
  );

  // Check-in form
  if (showForm) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setShowForm(false)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {checkInType === 'morning' ? '🌅 Morning Check-In' : '🌙 Evening Reflection'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <Pressable
              style={[
                styles.typeBtn,
                { backgroundColor: checkInType === 'morning' ? colors.primary : colors.surface },
              ]}
              onPress={() => setCheckInType('morning')}
            >
              <Text style={{ color: checkInType === 'morning' ? '#fff' : colors.text, fontWeight: '600' }}>
                🌅 Morning
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeBtn,
                { backgroundColor: checkInType === 'evening' ? colors.primary : colors.surface },
              ]}
              onPress={() => setCheckInType('evening')}
            >
              <Text style={{ color: checkInType === 'evening' ? '#fff' : colors.text, fontWeight: '600' }}>
                🌙 Evening
              </Text>
            </Pressable>
          </View>

          {/* Mood */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How are you feeling?</Text>
            <View style={styles.scaleRow}>
              {MOOD_LABELS.map((emoji, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setMood(i + 1); Haptics.selectionAsync(); }}
                  style={[
                    styles.scaleItem,
                    {
                      backgroundColor: mood === i + 1 ? colors.primary : colors.surface,
                      borderColor: mood === i + 1 ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Energy */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Energy Level</Text>
            <View style={styles.scaleRow}>
              {ENERGY_TEXTS.map((label, i) => (
                <Pressable
                  key={i}
                  onPress={() => { setEnergy(i + 1); Haptics.selectionAsync(); }}
                  style={[
                    styles.energyItem,
                    {
                      backgroundColor: energy >= i + 1 ? colors.primary : colors.surface,
                      borderColor: energy >= i + 1 ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 10, color: energy >= i + 1 ? '#fff' : colors.textSecondary }}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.scaleLabel, { color: colors.textSecondary }]}>
              {ENERGY_TEXTS[energy - 1]}
            </Text>
          </View>

          {/* Priorities (morning) or Reflection (evening) */}
          {checkInType === 'morning' ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Top Priorities Today
              </Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                One per line. What matters most?
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={priorities}
                onChangeText={setPriorities}
                placeholder="1. Ship the feature\n2. Call mentor\n3. Exercise"
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                What went well today?
              </Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                value={reflection}
                onChangeText={setReflection}
                placeholder="Reflect on your wins and lessons..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Gratitude */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Gratitude</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={gratitude}
              onChangeText={setGratitude}
              placeholder="What are you grateful for?"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitText}>
              {isLoading ? 'Saving...' : '✅ Complete Check-In'}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main check-in dashboard
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
        <Text style={[styles.screenTitle, { color: colors.text }]}>Check-In</Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
          Track your mood, energy, and progress
        </Text>

        {/* Streak Card */}
        <View style={[styles.streakCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.primary }]}>{currentStreak}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Day Streak 🔥</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.text }]}>{longestStreak}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>Best Streak</Text>
            </View>
            <View style={[styles.streakDivider, { backgroundColor: colors.border }]} />
            <View style={styles.streakItem}>
              <Text style={[styles.streakNumber, { color: colors.text }]}>{weeklyCount}/7</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>This Week</Text>
            </View>
          </View>
        </View>

        {/* Check-In Button */}
        <Pressable
          style={[
            styles.checkInButton,
            {
              backgroundColor: hasCheckedInToday ? colors.surface : colors.primary,
              borderColor: hasCheckedInToday ? colors.border : colors.primary,
            },
          ]}
          onPress={handleStartCheckIn}
        >
          <Ionicons
            name={hasCheckedInToday ? 'checkmark-circle' : 'add-circle'}
            size={24}
            color={hasCheckedInToday ? colors.textSecondary : '#fff'}
          />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              marginLeft: 8,
              color: hasCheckedInToday ? colors.textSecondary : '#fff',
            }}
          >
            {hasCheckedInToday ? 'Add Another Check-In' : 'Start Check-In'}
          </Text>
        </Pressable>

        {!isProUser && (
          <Text style={[styles.limitText, { color: colors.textTertiary }]}>
            {3 - weeklyCount > 0 ? `${3 - weeklyCount} free check-ins remaining this week` : 'Weekly limit reached'}
          </Text>
        )}

        {/* Mood Trend (last 7 days) */}
        {moodTrend.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mood Trend (7 days)</Text>
            <View style={[styles.trendContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.trendRow}>
                {moodTrend.map((day, i) => (
                  <View key={i} style={styles.trendItem}>
                    <View style={styles.trendBar}>
                      <View
                        style={[
                          styles.trendBarFill,
                          {
                            height: `${(day.mood / 5) * 100}%`,
                            backgroundColor: day.mood >= 4 ? '#22C55E' : day.mood >= 3 ? colors.primary : '#EF4444',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.trendDate, { color: colors.textTertiary }]}>
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'narrow' })}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Recent Check-Ins */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Check-Ins</Text>
          {checkIns.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 32 }}>📝</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No check-ins yet. Start your first one!
              </Text>
            </View>
          ) : (
            checkIns.slice(0, 10).map(checkIn => (
              <View
                key={checkIn.id}
                style={[styles.checkInCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.checkInHeader}>
                  <Text style={{ fontSize: 20 }}>{MOOD_LABELS[checkIn.mood - 1]}</Text>
                  <Text style={[styles.checkInDate, { color: colors.textSecondary }]}>
                    {new Date(checkIn.createdAt).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <View style={[styles.typeBadge, { backgroundColor: colors.background }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>
                      {checkIn.type === 'morning' ? '🌅' : '🌙'}
                    </Text>
                  </View>
                </View>
                {checkIn.gratitude ? (
                  <Text style={[styles.checkInText, { color: colors.textSecondary }]} numberOfLines={2}>
                    🙏 {checkIn.gratitude}
                  </Text>
                ) : null}
                {checkIn.priorities.length > 0 ? (
                  <Text style={[styles.checkInText, { color: colors.textSecondary }]} numberOfLines={2}>
                    🎯 {checkIn.priorities.join(', ')}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <PaywallModal
        visible={showPaywallModal}
        feature="unlimited_checkins"
        onClose={() => setShowPaywallModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 15,
    marginBottom: 20,
  },
  streakCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  streakLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  streakDivider: {
    width: 1,
    height: 40,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  limitText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHint: {
    fontSize: 13,
    marginBottom: 8,
  },
  trendContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  trendItem: {
    alignItems: 'center',
    flex: 1,
  },
  trendBar: {
    width: 20,
    height: 60,
    borderRadius: 4,
    backgroundColor: 'rgba(128,128,128,0.15)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  trendDate: {
    fontSize: 10,
    marginTop: 4,
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  checkInCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInDate: {
    fontSize: 13,
    flex: 1,
  },
  checkInText: {
    fontSize: 13,
    marginTop: 6,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: 12,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scaleItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  energyItem: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scaleLabel: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
  },
  submitBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
