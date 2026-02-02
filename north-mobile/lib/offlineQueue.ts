import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineActionType =
  | 'create_context' 
  | 'update_context' 
  | 'delete_context'
  | 'create_coach'
  | 'update_coach'
  | 'delete_coach'
  | 'send_message';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  payload: any;
  createdAt: number;
  retryCount: number;
}

interface OfflineQueueState {
  queue: OfflineAction[];
  isProcessing: boolean;
}

interface OfflineQueueActions {
  enqueue: (type: OfflineActionType, payload: any) => void;
  remove: (id: string) => void;
  processQueue: () => Promise<void>;
  clear: () => void;
}

type OfflineQueueStore = OfflineQueueState & OfflineQueueActions;

export const useOfflineQueue = create<OfflineQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      isProcessing: false,

      enqueue: (type, payload) => {
        const action: OfflineAction = {
          id: Math.random().toString(36).substring(7),
          type,
          payload,
          createdAt: Date.now(),
          retryCount: 0,
        };
        
        set((state) => ({ queue: [...state.queue, action] }));
      },

      remove: (id) => {
        set((state) => ({
          queue: state.queue.filter((action) => action.id !== id),
        }));
      },

      clear: () => set({ queue: [] }),

      processQueue: async () => {
        const { queue, isProcessing } = get();
        if (queue.length === 0 || isProcessing) return;

        // Dynamically import stores to avoid circular dependencies
        const { useContextStore } = require('@/stores/contextStore');
        const { useCoachStore } = require('@/stores/coachStore');
        // const { useChatStore } = require('@/stores/chatStore'); // Future use

        set({ isProcessing: true });

        // Clone queue to avoid mutation issues during iteration
        const currentQueue = [...queue];

        for (const action of currentQueue) {
          try {
            switch (action.type) {
              case 'create_context':
                await useContextStore.getState().createContext(action.payload.category, action.payload.content, action.payload.optimisticId);
                break;
              case 'update_context':
                await useContextStore.getState().updateContext(action.payload.id, action.payload.content);
                break;
              case 'delete_context':
                await useContextStore.getState().deleteContext(action.payload.id);
                break;
              case 'create_coach':
                await useCoachStore.getState().createCoach(
                  action.payload.name, 
                  action.payload.icon, 
                  action.payload.systemPrompt, 
                  action.payload.optimisticId,
                  action.payload.isProUser
                );
                break;
              case 'update_coach':
                await useCoachStore.getState().updateCoach(action.payload.id, action.payload.updates);
                break;
              case 'delete_coach':
                await useCoachStore.getState().deleteCoach(action.payload.id);
                break;
              // Add other cases as needed
            }
            
            // If successful, remove from queue
            get().remove(action.id);
            
          } catch (error) {
            console.error(`Failed to process offline action ${action.type}:`, error);
            // Decide whether to keep in queue, increment retry, or discard
            // For now, we keep it if it looks like a network error, otherwise maybe remove?
            // Simple approach: Increment retry, keep it. 
            // In a real app, check error type.
          }
        }

        set({ isProcessing: false });
      },
    }),
    {
      name: 'north-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ queue: state.queue }),
    }
  )
);
