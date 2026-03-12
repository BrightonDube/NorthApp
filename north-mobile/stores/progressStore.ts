/**
 * Progress Store
 * 
 * Aggregates user progress data from check-ins, chat sessions, 
 * and action items to provide insights and statistics.
 */

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface WeeklySummary {
  sessionsCount: number;
  messagesCount: number;
  checkInsCount: number;
  actionItemsCompleted: number;
  actionItemsTotal: number;
  coachesUsed: string[];
  averageMood: number | null;
  averageEnergy: number | null;
}

export interface StreakDay {
  date: string;
  hasCheckIn: boolean;
  hasSession: boolean;
}

interface ProgressState {
  weeklySummary: WeeklySummary | null;
  streakCalendar: StreakDay[];
  totalCoachingMinutes: number;
  totalSessions: number;
  totalMessages: number;
  isLoading: boolean;
  error: string | null;
}

interface ProgressActions {
  fetchWeeklySummary: () => Promise<void>;
  fetchStreakCalendar: (days?: number) => Promise<void>;
  fetchTotalStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  clearError: () => void;
}

type ProgressStore = ProgressState & ProgressActions;

export const useProgressStore = create<ProgressStore>((set, get) => ({
  weeklySummary: null,
  streakCalendar: [],
  totalCoachingMinutes: 0,
  totalSessions: 0,
  totalMessages: 0,
  isLoading: false,
  error: null,

  fetchWeeklySummary: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      // Fetch weekly coaching sessions (ended in the last 7 days)
      const { data: coachingSessions, error: coachingSessionsError } = await supabase
        .from('coaching_sessions')
        .select('id, coach_id, end_time')
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .gte('end_time', weekAgoISO);
      if (coachingSessionsError) {
        throw coachingSessionsError;
      }

      // Fetch chat sessions (needed to attribute messages to the current user)
      const { data: chatSessions, error: chatSessionsError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id);
      if (chatSessionsError) {
        throw chatSessionsError;
      }

      // Fetch messages this week
      let messages: { id: string; chat_session_id: string }[] = [];
      const chatSessionIds = (chatSessions || []).map((s: any) => s.id).filter(Boolean);
      if (chatSessionIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id, chat_session_id, created_at')
          .in('chat_session_id', chatSessionIds)
          .gte('created_at', weekAgoISO);
        if (messagesError) {
          throw messagesError;
        }
        messages = (messagesData || []) as any;
      }

      // Fetch check-ins this week
      const { data: checkIns, error: checkInsError } = await supabase
        .from('check_ins')
        .select('mood, energy')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoISO);
      if (checkInsError) {
        throw checkInsError;
      }

      // Fetch action items created this week (total)
      const { data: actionItems, error: actionItemsError } = await supabase
        .from('action_items')
        .select('status, completed_at, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoISO);
      if (actionItemsError) {
        throw actionItemsError;
      }

      // Fetch action items completed this week (done)
      const { data: completedActionItems, error: completedActionItemsError } = await supabase
        .from('action_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgoISO);
      if (completedActionItemsError) {
        throw completedActionItemsError;
      }

      const coachIds = [...new Set((coachingSessions || []).map((s: any) => s.coach_id).filter(Boolean))];
      const moods = (checkIns || []).map(c => c.mood).filter(Boolean);
      const energies = (checkIns || []).map(c => c.energy).filter(Boolean);

      set({
        weeklySummary: {
          sessionsCount: (coachingSessions || []).length,
          messagesCount: (messages || []).length,
          checkInsCount: (checkIns || []).length,
          actionItemsCompleted: (completedActionItems || []).length,
          actionItemsTotal: (actionItems || []).length,
          coachesUsed: coachIds,
          averageMood: moods.length > 0
            ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10
            : null,
          averageEnergy: energies.length > 0
            ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10
            : null,
        },
      });
    } catch (err: any) {
      const msg = err?.message || 'Failed to load weekly summary';
      console.warn('[ProgressStore] Weekly summary error:', msg);
      set({ error: msg });
    }
  },

  fetchStreakCalendar: async (days = 30) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch check-in dates
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Fetch session dates
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      const checkInDates = new Set((checkIns || []).map(c => c.created_at.split('T')[0]));
      const sessionDates = new Set((sessions || []).map(s => s.created_at.split('T')[0]));

      const calendar: StreakDay[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        calendar.push({
          date: dateStr,
          hasCheckIn: checkInDates.has(dateStr),
          hasSession: sessionDates.has(dateStr),
        });
      }

      set({ streakCalendar: calendar.reverse() });
    } catch (err: any) {
      console.warn('[ProgressStore] Streak calendar error:', err.message);
    }
  },

  fetchTotalStats: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count: sessionsCount } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id);

      let messagesCount = 0;
      if (sessions && sessions.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_session_id', sessions.map(s => s.id));
        messagesCount = count || 0;
      }

      // Estimate coaching minutes (avg 2 min per message exchange)
      const estimatedMinutes = Math.round(messagesCount * 1);

      set({
        totalSessions: sessionsCount || 0,
        totalMessages: messagesCount,
        totalCoachingMinutes: estimatedMinutes,
      });
    } catch (err: any) {
      console.warn('[ProgressStore] Stats error:', err.message);
    }
  },

  refreshAll: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().fetchWeeklySummary(),
        get().fetchStreakCalendar(),
        get().fetchTotalStats(),
      ]);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
