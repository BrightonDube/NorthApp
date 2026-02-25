/**
 * Check-In Store
 * 
 * Manages daily check-ins (mood, energy, priorities, reflections).
 * Tracks streaks and provides check-in history for progress dashboard.
 * 
 * Free tier: 3 check-ins per week
 * Pro tier: Unlimited check-ins
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface CheckIn {
  id: string;
  userId: string;
  mood: number; // 1-5
  energy: number; // 1-5
  priorities: string[];
  reflection: string;
  gratitude: string;
  type: 'morning' | 'evening';
  createdAt: string;
}

interface CheckInState {
  checkIns: CheckIn[];
  currentStreak: number;
  longestStreak: number;
  weeklyCount: number;
  isLoading: boolean;
  error: string | null;
  lastCheckInDate: string | null;
}

interface CheckInActions {
  fetchCheckIns: (limit?: number) => Promise<void>;
  submitCheckIn: (data: {
    mood: number;
    energy: number;
    priorities?: string[];
    reflection?: string;
    gratitude?: string;
    type: 'morning' | 'evening';
  }) => Promise<void>;
  canCheckIn: (isProUser: boolean) => boolean;
  getWeeklyCheckIns: () => CheckIn[];
  getMoodTrend: (days?: number) => { date: string; mood: number; energy: number }[];
  calculateStreak: () => void;
  clearError: () => void;
  reset: () => void;
}

type CheckInStore = CheckInState & CheckInActions;

const FREE_WEEKLY_LIMIT = 3;

function normalizeDateString(value?: string | null): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function computeWeeklyCount(checkIns: CheckIn[]): number {
  const weekStart = getStartOfWeek();
  return checkIns.filter(c => {
    const createdAt = new Date(normalizeDateString(c.createdAt));
    return createdAt >= weekStart;
  }).length;
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function isConsecutiveDay(d1: Date, d2: Date): boolean {
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.abs(d1.getTime() - d2.getTime());
  return diff >= oneDay && diff < oneDay * 2;
}

export const useCheckInStore = create<CheckInStore>()(
  persist(
    (set, get) => ({
      checkIns: [],
      currentStreak: 0,
      longestStreak: 0,
      weeklyCount: 0,
      isLoading: false,
      error: null,
      lastCheckInDate: null,

      fetchCheckIns: async (limit = 30) => {
        set({ isLoading: true, error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data, error } = await supabase
            .from('check_ins')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            // Table may not exist yet (PostgREST schema cache miss or SQL relation missing)
            if (error.code === '42P01' || error.code === 'PGRST205') {
              set({ isLoading: false });
              return;
            }
            throw error;
          }

          const checkIns: CheckIn[] = (data || []).map(row => ({
            id: row.id,
            userId: row.user_id,
            mood: row.mood,
            energy: row.energy,
            priorities: row.priorities || [],
            reflection: row.reflection || '',
            gratitude: row.gratitude || '',
            type: row.type || 'morning',
            createdAt: normalizeDateString(row.created_at),
          }));

          set({ checkIns, isLoading: false });
          get().calculateStreak();
        } catch (err: any) {
          console.error('[CheckInStore] Fetch error:', err);
          set({ error: err.message, isLoading: false });
        }
      },

      submitCheckIn: async (data) => {
        set({ isLoading: true, error: null });

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          const { data: inserted, error } = await supabase
            .from('check_ins')
            .insert({
              user_id: user.id,
              mood: data.mood,
              energy: data.energy,
              priorities: data.priorities || [],
              reflection: data.reflection || '',
              gratitude: data.gratitude || '',
              type: data.type,
            })
            .select()
            .single();

          if (error) {
            // If table doesn't exist, store locally
            if (error.code === '42P01' || error.code === 'PGRST205') {
              const localCheckIn: CheckIn = {
                id: `local-${Date.now()}`,
                userId: user.id,
                mood: data.mood,
                energy: data.energy,
                priorities: data.priorities || [],
                reflection: data.reflection || '',
                gratitude: data.gratitude || '',
                type: data.type,
                createdAt: normalizeDateString(new Date().toISOString()),
              };

              set(state => ({
                checkIns: [localCheckIn, ...state.checkIns],
                lastCheckInDate: new Date().toISOString().split('T')[0],
                isLoading: false,
              }));
              get().calculateStreak();
              return;
            }
            throw error;
          }

          const checkIn: CheckIn = {
            id: inserted.id,
            userId: inserted.user_id,
            mood: inserted.mood,
            energy: inserted.energy,
            priorities: inserted.priorities || [],
            reflection: inserted.reflection || '',
            gratitude: inserted.gratitude || '',
            type: inserted.type || data.type,
            createdAt: normalizeDateString(inserted.created_at),
          };

          set(state => ({
            checkIns: [checkIn, ...state.checkIns],
            lastCheckInDate: new Date().toISOString().split('T')[0],
            isLoading: false,
          }));
          get().calculateStreak();
          await get().fetchCheckIns();

          // Award XP for check-in (fire-and-forget, non-blocking)
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
              const apiUrl = process.env.EXPO_PUBLIC_API_URL;
              if (apiUrl) {
                fetch(`${apiUrl}/v1/xp/award`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ event_type: 'check_in' }),
                }).catch(() => {});
              }
            }
          } catch {
            // XP award failure is non-critical
          }
        } catch (err: any) {
          console.error('[CheckInStore] Submit error:', err);
          const message = err?.message || 'Failed to submit check-in';
          set({ error: message, isLoading: false });
          throw new Error(message);
        }
      },

      canCheckIn: (isProUser: boolean) => {
        if (isProUser) return true;
        const weeklyCheckIns = get().getWeeklyCheckIns();
        return weeklyCheckIns.length < FREE_WEEKLY_LIMIT;
      },

      getWeeklyCheckIns: () => {
        const weekStart = getStartOfWeek();
        return get().checkIns.filter(c => new Date(normalizeDateString(c.createdAt)) >= weekStart);
      },

      getMoodTrend: (days = 14) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const dailyMap = new Map<string, { moods: number[]; energies: number[] }>();
        
        get().checkIns
          .filter(c => new Date(c.createdAt) >= cutoff)
          .forEach(c => {
            const dateKey = c.createdAt.split('T')[0];
            const existing = dailyMap.get(dateKey) || { moods: [], energies: [] };
            existing.moods.push(c.mood);
            existing.energies.push(c.energy);
            dailyMap.set(dateKey, existing);
          });

        return Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date,
            mood: Math.round(data.moods.reduce((a, b) => a + b, 0) / data.moods.length * 10) / 10,
            energy: Math.round(data.energies.reduce((a, b) => a + b, 0) / data.energies.length * 10) / 10,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      },

      calculateStreak: () => {
        const { checkIns } = get();
        if (checkIns.length === 0) {
          set({ currentStreak: 0, longestStreak: 0, weeklyCount: get().getWeeklyCheckIns().length });
          return;
        }

        // Get unique days with check-ins
        const uniqueDays = [...new Set(
          checkIns.map(c => normalizeDateString(c.createdAt).split('T')[0])
        )].sort().reverse();

        // Calculate current streak
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Must have checked in today or yesterday to have active streak
        if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < uniqueDays.length; i++) {
            const curr = new Date(uniqueDays[i - 1]);
            const prev = new Date(uniqueDays[i]);
            if (isConsecutiveDay(curr, prev)) {
              streak++;
            } else {
              break;
            }
          }
        }

        // Calculate longest streak
        let longest = 1;
        let current = 1;
        for (let i = 1; i < uniqueDays.length; i++) {
          const curr = new Date(uniqueDays[i - 1]);
          const prev = new Date(uniqueDays[i]);
          if (isConsecutiveDay(curr, prev)) {
            current++;
            longest = Math.max(longest, current);
          } else {
            current = 1;
          }
        }

        set({
          currentStreak: streak,
          longestStreak: Math.max(longest, streak),
          weeklyCount: computeWeeklyCount(checkIns),
        });
      },

      clearError: () => set({ error: null }),

      reset: () => {
        AsyncStorage.removeItem('north-checkin-storage').catch(() => {});
        set({
          checkIns: [],
          currentStreak: 0,
          longestStreak: 0,
          weeklyCount: 0,
          isLoading: false,
          error: null,
          lastCheckInDate: null,
        });
      },
    }),
    {
      name: 'north-checkin-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        checkIns: state.checkIns.slice(0, 30), // Cache last 30
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastCheckInDate: state.lastCheckInDate,
      }),
    }
  )
);
