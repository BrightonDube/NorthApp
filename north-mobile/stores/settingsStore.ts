import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

interface SettingsState {
  firmnessLevel: number;
  voiceEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

interface SettingsActions {
  fetchSettings: () => Promise<void>;
  updateFirmness: (level: number) => Promise<boolean>;
  setVoiceEnabled: (enabled: boolean) => Promise<boolean>;
  clearError: () => void;
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      firmnessLevel: 5,
      voiceEnabled: false,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.settings, {
            headers: buildAuthHeaders(token),
          });

          if (!response.ok) throw new Error(`Failed to fetch settings: ${response.status}`);

          const data = await response.json();
          set({
            firmnessLevel: data.firmness_level ?? 5,
            voiceEnabled: data.voice_enabled ?? false,
            isLoading: false,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to fetch settings';
          set({ error: msg, isLoading: false });
        }
      },

      setVoiceEnabled: async (enabled: boolean) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.settings, {
            method: 'PATCH',
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ voice_enabled: enabled }),
          });

          if (response.status === 403) {
            set({ error: 'Voice features require a Pro subscription' });
            return false;
          }
          if (!response.ok) throw new Error(`Failed to update voice setting: ${response.status}`);

          set({ voiceEnabled: enabled });
          return true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to update voice setting';
          set({ error: msg });
          return false;
        }
      },

      updateFirmness: async (level: number) => {
        const clamped = Math.max(0, Math.min(10, level));
        set({ firmnessLevel: clamped });
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.settings, {
            method: 'PATCH',
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ firmness_level: clamped }),
          });

          if (!response.ok) throw new Error(`Failed to update settings: ${response.status}`);

          return true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to update settings';
          set({ error: msg });
          return false;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ firmnessLevel: state.firmnessLevel, voiceEnabled: state.voiceEnabled }),
    }
  )
);
