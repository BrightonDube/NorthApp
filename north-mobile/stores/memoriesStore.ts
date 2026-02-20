import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

export interface Memory {
  id: string;
  content: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
  created_at: string;
}

interface MemoriesState {
  memories: Memory[];
  isLoading: boolean;
  error: string | null;
}

interface MemoriesActions {
  fetchMemories: () => Promise<void>;
  deleteMemory: (memoryId: string) => Promise<boolean>;
  clearError: () => void;
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export const useMemoriesStore = create<MemoriesState & MemoriesActions>()(
  (set) => ({
    memories: [],
    isLoading: false,
    error: null,

    fetchMemories: async () => {
      set({ isLoading: true, error: null });
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(api.memories, {
          headers: buildAuthHeaders(token),
        });

        if (!response.ok) throw new Error(`Failed to fetch memories: ${response.status}`);

        const memories: Memory[] = await response.json();
        set({ memories, isLoading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to fetch memories';
        set({ error: msg, isLoading: false });
      }
    },

    deleteMemory: async (memoryId: string) => {
      try {
        const token = await getAccessToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(api.memory(memoryId), {
          method: 'DELETE',
          headers: buildAuthHeaders(token),
        });

        if (!response.ok) throw new Error(`Failed to delete memory: ${response.status}`);

        set(state => ({
          memories: state.memories.filter(m => m.id !== memoryId),
        }));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to delete memory';
        set({ error: msg });
        return false;
      }
    },

    clearError: () => set({ error: null }),
  })
);
