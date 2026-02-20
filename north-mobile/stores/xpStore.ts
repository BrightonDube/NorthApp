import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2500, 4000, 6000, 10000];

export function xpToNextLevel(totalXp: number): number {
  const level = calculateLevel(totalXp);
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return Math.max(0, next - totalXp);
}

export function calculateLevel(totalXp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function levelProgress(totalXp: number): number {
  const level = calculateLevel(totalXp);
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (next === current) return 1;
  return (totalXp - current) / (next - current);
}

interface XPState {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastLevelUp: number | null;
  isLoading: boolean;
  error: string | null;
}

interface XPActions {
  fetchXP: () => Promise<void>;
  awardXP: (eventType: string) => Promise<{ xpEarned: number; leveledUp: boolean } | null>;
  clearError: () => void;
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export const useXPStore = create<XPState & XPActions>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastLevelUp: null,
      isLoading: false,
      error: null,

      fetchXP: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.xp, {
            headers: buildAuthHeaders(token),
          });

          if (!response.ok) throw new Error(`Failed to fetch XP: ${response.status}`);

          const data = await response.json();
          set({
            totalXp: data.total_xp ?? 0,
            level: data.level ?? 1,
            isLoading: false,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to fetch XP';
          set({ error: msg, isLoading: false });
        }
      },

      awardXP: async (eventType: string) => {
        try {
          const token = await getAccessToken();
          if (!token) return null;

          const response = await fetch(api.xpAward, {
            method: 'POST',
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ event_type: eventType }),
          });

          if (!response.ok) return null;

          const data = await response.json();
          const prevLevel = get().level;
          const newLevel = data.level ?? prevLevel;
          const leveledUp = newLevel > prevLevel;

          set({
            totalXp: data.total_xp ?? get().totalXp,
            level: newLevel,
            lastLevelUp: leveledUp ? newLevel : get().lastLevelUp,
          });

          return {
            xpEarned: data.xp_earned ?? 0,
            leveledUp,
          };
        } catch {
          return null;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'xp-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        totalXp: state.totalXp,
        level: state.level,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
      }),
    }
  )
);
