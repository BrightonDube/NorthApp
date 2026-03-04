/**
 * Goals Screen
 * 
 * Full goals management with AI-powered planning.
 * Accessible from the Home screen quick action card.
 * 
 * Features:
 * - List active/completed goals
 * - Create goals manually or with AI planner
 * - Toggle subtask completion
 * - Delete goals
 * - Pull-to-refresh
 */

import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGoalsStore, GoalDifficulty } from '@/stores/goalsStore';
import { useBillingStore } from '@/stores/billingStore';
import { useThemeColors } from '@/contexts/ThemeContext';

type GoalPlan = {
  title: string;
  description: string;
  difficulty: GoalDifficulty;
  suggested_deadline: string;
  subtasks: { title: string; order_index: number; due_date?: string }[];
};

export default function GoalsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const {
    goals,
    isLoading,
    fetchGoals,
    createGoal,
    deleteGoal,
    updateGoal,
    addSubtask,
    updateSubtask,
    generatePlan,
  } = useGoalsStore();
  const { isProUser } = useBillingStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');

  // Create form state
  const [goalText, setGoalText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const filteredGoals = goals.filter(g =>
    filter === 'active' ? g.status === 'active' : g.status === 'completed'
  );

  const handleGeneratePlan = async () => {
    if (!goalText.trim()) return;
    setIsGenerating(true);
    setPlan(null);
    const result = await generatePlan(goalText.trim());
    if (result) {
      setPlan(result as GoalPlan);
    } else {
      Alert.alert('Error', 'Failed to generate plan. Try again.');
    }
    setIsGenerating(false);
  };

  const handleSaveGoal = async () => {
    if (!plan) return;
    setIsSaving(true);
    const goal = await createGoal({
      title: plan.title,
      description: plan.description,
      difficulty: plan.difficulty,
      deadline: plan.suggested_deadline,
    });
    if (goal) {
      // Add subtasks from the plan
      for (const st of plan.subtasks) {
        await addSubtask(goal.id, st.title, st.due_date);
      }
      setPlan(null);
      setGoalText('');
      setShowCreate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSaving(false);
  };

  const handleSaveManual = async () => {
    if (!goalText.trim()) return;
    setIsSaving(true);
    const goal = await createGoal({ title: goalText.trim() });
    if (goal) {
      setGoalText('');
      setShowCreate(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsSaving(false);
  };

  const handleDelete = (goalId: string, title: string) => {
    Alert.alert('Delete Goal', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteGoal(goalId),
      },
    ]);
  };

  const handleToggleComplete = async (goalId: string, isCompleted: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateGoal(goalId, { status: isCompleted ? 'active' : 'completed' });
  };

  const handleToggleSubtask = async (subtaskId: string, currentStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSubtask(subtaskId, currentStatus === 'completed' ? 'pending' : 'completed');
  };

  const difficultyColor = (d: GoalDifficulty) => {
    switch (d) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      case 'epic': return '#9C27B0';
      default: return colors.textSecondary;
    }
  };

  // Create Modal
  if (showCreate) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowCreate(false); setPlan(null); setGoalText(''); }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>New Goal</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={[styles.label, { color: colors.text }]}>Describe your goal</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={goalText}
              onChangeText={setGoalText}
              placeholder="e.g. Learn Spanish to conversational level in 3 months"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <Pressable
                onPress={handleSaveManual}
                disabled={!goalText.trim() || isSaving}
                style={[styles.secondaryBtn, { borderColor: colors.border, opacity: goalText.trim() ? 1 : 0.4 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Save Simple</Text>
              </Pressable>

              {isProUser && (
                <Pressable
                  onPress={handleGeneratePlan}
                  disabled={!goalText.trim() || isGenerating}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: goalText.trim() ? 1 : 0.4 }]}
                >
                  {isGenerating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}> AI Plan</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* AI Plan Preview */}
            {plan && (
              <View style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                <Text style={[styles.planDesc, { color: colors.textSecondary }]}>{plan.description}</Text>

                <View style={styles.planMeta}>
                  <View style={[styles.badge, { backgroundColor: difficultyColor(plan.difficulty) + '20' }]}>
                    <Text style={{ color: difficultyColor(plan.difficulty), fontSize: 12, fontWeight: '600' }}>
                      {plan.difficulty.toUpperCase()}
                    </Text>
                  </View>
                  {plan.suggested_deadline && (
                    <Text style={[styles.planDeadline, { color: colors.textSecondary }]}>
                      Due: {new Date(plan.suggested_deadline).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <Text style={[styles.subtasksHeader, { color: colors.text }]}>
                  Subtasks ({plan.subtasks.length})
                </Text>
                {plan.subtasks.map((st, i) => (
                  <View key={i} style={[styles.subtaskPreview, { borderBottomColor: colors.border }]}>
                    <Ionicons name="checkbox-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.subtaskText, { color: colors.text }]}>{st.title}</Text>
                  </View>
                ))}

                <Pressable
                  onPress={handleSaveGoal}
                  disabled={isSaving}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Create Goal with Subtasks</Text>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main goals list
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Goals</Text>
        <Pressable onPress={() => setShowCreate(true)}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['active', 'completed'] as const).map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterTab,
              filter === f && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f ? colors.primary : colors.textTertiary }]}>
              {f === 'active' ? 'Active' : 'Completed'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {isLoading && goals.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : filteredGoals.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>{filter === 'active' ? '🎯' : '🏆'}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'active' ? 'No active goals. Tap + to create one.' : 'No completed goals yet.'}
            </Text>
          </View>
        ) : (
          filteredGoals.map(goal => (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.goalHeader}>
                <Pressable onPress={() => handleToggleComplete(goal.id, goal.status === 'completed')}>
                  <Ionicons
                    name={goal.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={goal.status === 'completed' ? '#4CAF50' : colors.textTertiary}
                  />
                </Pressable>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.goalTitle, { color: colors.text, textDecorationLine: goal.status === 'completed' ? 'line-through' : 'none' }]}>
                    {goal.title}
                  </Text>
                  {goal.description && (
                    <Text style={[styles.goalDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {goal.description}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => handleDelete(goal.id, goal.title)}>
                  <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>

              {/* Meta */}
              <View style={styles.goalMeta}>
                <View style={[styles.badge, { backgroundColor: difficultyColor(goal.difficulty) + '20' }]}>
                  <Text style={{ color: difficultyColor(goal.difficulty), fontSize: 11, fontWeight: '600' }}>
                    {goal.difficulty.toUpperCase()}
                  </Text>
                </View>
                {goal.deadline && (
                  <Text style={[styles.deadlineText, { color: colors.textTertiary }]}>
                    {new Date(goal.deadline).toLocaleDateString()}
                  </Text>
                )}
                {goal.subtasks.length > 0 && (
                  <Text style={[styles.deadlineText, { color: colors.textTertiary }]}>
                    {goal.subtasks.filter(s => s.status === 'completed').length}/{goal.subtasks.length} tasks
                  </Text>
                )}
              </View>

              {/* Subtasks */}
              {goal.subtasks.length > 0 && (
                <View style={styles.subtasksList}>
                  {goal.subtasks.map(st => (
                    <Pressable
                      key={st.id}
                      style={styles.subtaskRow}
                      onPress={() => handleToggleSubtask(st.id, st.status)}
                    >
                      <Ionicons
                        name={st.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={st.status === 'completed' ? '#4CAF50' : colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.subtaskLabel,
                          { color: colors.text, textDecorationLine: st.status === 'completed' ? 'line-through' : 'none' },
                        ]}
                      >
                        {st.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Progress bar */}
              {goal.subtasks.length > 0 && (
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: colors.primary,
                        width: `${(goal.subtasks.filter(s => s.status === 'completed').length / goal.subtasks.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#33333320',
  },
  filterTab: {
    paddingVertical: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  goalCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginLeft: 36,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deadlineText: {
    fontSize: 12,
  },
  subtasksList: {
    marginTop: 10,
    marginLeft: 36,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  subtaskLabel: {
    fontSize: 13,
    flex: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginLeft: 36,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Create form
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 80,
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  // Plan preview
  planCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  planDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  planDeadline: {
    fontSize: 12,
  },
  subtasksHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtaskPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subtaskText: {
    fontSize: 13,
    flex: 1,
  },
});
