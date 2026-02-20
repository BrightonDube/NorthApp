import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';

export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'abandoned';
export type SubtaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface Subtask {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  status: SubtaskStatus;
  order_index: number;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  deadline: string | null;
  status: GoalStatus;
  difficulty: GoalDifficulty;
  progress: number;
  coach_id: string | null;
  created_at: string;
  updated_at: string;
  subtasks: Subtask[];
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category?: string;
  deadline?: string;
  difficulty?: GoalDifficulty;
  coach_id?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  status?: GoalStatus;
  progress?: number;
  deadline?: string;
}

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
}

interface GoalsActions {
  fetchGoals: (status?: GoalStatus) => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<Goal | null>;
  updateGoal: (goalId: string, input: UpdateGoalInput) => Promise<Goal | null>;
  deleteGoal: (goalId: string) => Promise<boolean>;
  addSubtask: (goalId: string, title: string, dueDate?: string) => Promise<Subtask | null>;
  updateSubtask: (subtaskId: string, status: SubtaskStatus) => Promise<Subtask | null>;
  generatePlan: (goalDescription: string) => Promise<object | null>;
  clearError: () => void;
}

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export const useGoalsStore = create<GoalsState & GoalsActions>()(
  persist(
    (set, get) => ({
      goals: [],
      isLoading: false,
      error: null,

      fetchGoals: async (status?: GoalStatus) => {
        set({ isLoading: true, error: null });
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const url = status ? `${api.goals}?status=${status}` : api.goals;
          const response = await fetch(url, {
            headers: buildAuthHeaders(token),
          });

          if (!response.ok) throw new Error(`Failed to fetch goals: ${response.status}`);

          const goals: Goal[] = await response.json();
          set({ goals, isLoading: false });
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to fetch goals';
          set({ error: msg, isLoading: false });
        }
      },

      createGoal: async (input: CreateGoalInput) => {
        set({ isLoading: true, error: null });
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.goals, {
            method: 'POST',
            headers: buildAuthHeaders(token),
            body: JSON.stringify(input),
          });

          if (!response.ok) throw new Error(`Failed to create goal: ${response.status}`);

          const goal: Goal = await response.json();
          set(state => ({ goals: [goal, ...state.goals], isLoading: false }));
          return goal;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to create goal';
          set({ error: msg, isLoading: false });
          return null;
        }
      },

      updateGoal: async (goalId: string, input: UpdateGoalInput) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.goal(goalId), {
            method: 'PATCH',
            headers: buildAuthHeaders(token),
            body: JSON.stringify(input),
          });

          if (!response.ok) throw new Error(`Failed to update goal: ${response.status}`);

          const updated: Goal = await response.json();
          set(state => ({
            goals: state.goals.map(g => g.id === goalId ? updated : g),
          }));
          return updated;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to update goal';
          set({ error: msg });
          return null;
        }
      },

      deleteGoal: async (goalId: string) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.goal(goalId), {
            method: 'DELETE',
            headers: buildAuthHeaders(token),
          });

          if (!response.ok) throw new Error(`Failed to delete goal: ${response.status}`);

          set(state => ({ goals: state.goals.filter(g => g.id !== goalId) }));
          return true;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to delete goal';
          set({ error: msg });
          return false;
        }
      },

      addSubtask: async (goalId: string, title: string, dueDate?: string) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const body: Record<string, string> = { title };
          if (dueDate) body.due_date = dueDate;

          const response = await fetch(api.goalSubtasks(goalId), {
            method: 'POST',
            headers: buildAuthHeaders(token),
            body: JSON.stringify(body),
          });

          if (!response.ok) throw new Error(`Failed to add subtask: ${response.status}`);

          const subtask: Subtask = await response.json();
          set(state => ({
            goals: state.goals.map(g =>
              g.id === goalId
                ? { ...g, subtasks: [...g.subtasks, subtask] }
                : g
            ),
          }));
          return subtask;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to add subtask';
          set({ error: msg });
          return null;
        }
      },

      updateSubtask: async (subtaskId: string, status: SubtaskStatus) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.subtask(subtaskId), {
            method: 'PATCH',
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ status }),
          });

          if (!response.ok) throw new Error(`Failed to update subtask: ${response.status}`);

          const updated: Subtask = await response.json();
          set(state => ({
            goals: state.goals.map(g => ({
              ...g,
              subtasks: g.subtasks.map(s => s.id === subtaskId ? updated : s),
            })),
          }));
          return updated;
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to update subtask';
          set({ error: msg });
          return null;
        }
      },

      generatePlan: async (goalDescription: string) => {
        try {
          const token = await getAccessToken();
          if (!token) throw new Error('Not authenticated');

          const response = await fetch(api.agentPlan, {
            method: 'POST',
            headers: buildAuthHeaders(token),
            body: JSON.stringify({ goal_description: goalDescription }),
          });

          if (!response.ok) throw new Error(`Failed to generate plan: ${response.status}`);

          return await response.json();
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to generate plan';
          set({ error: msg });
          return null;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'goals-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ goals: state.goals }),
    }
  )
);
