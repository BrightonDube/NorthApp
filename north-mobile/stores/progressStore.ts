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

      // Fetch sessions this week
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id, coach_id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoISO);

      // Fetch messages this week  
      const { data: messages } = await supabase
        .from('messages')
        .select('id, chat_session_id')
        .in('chat_session_id', (sessions || []).map(s => s.id))
        .gte('created_at', weekAgoISO);

      // Fetch check-ins this week
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('mood, energy')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoISO);

      // Fetch action items
      const { data: actionItems } = await supabase
        .from('action_items')
        .select('status')
        .eq('user_id', user.id)
        .gte('created_at', weekAgoISO);

      const coachIds = [...new Set((sessions || []).map(s => s.coach_id))];
      const moods = (checkIns || []).map(c => c.mood).filter(Boolean);
      const energies = (checkIns || []).map(c => c.energy).filter(Boolean);
      const completed = (actionItems || []).filter(a => a.status === 'completed');

      set({
        weeklySummary: {
          sessionsCount: (sessions || []).length,
          messagesCount: (messages || []).length,
          checkInsCount: (checkIns || []).length,
          actionItemsCompleted: completed.length,
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
      console.warn('[ProgressStore] Weekly summary error:', err.message);
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
