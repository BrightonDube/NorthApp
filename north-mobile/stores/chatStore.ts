/**
 * Chat Store
 * 
 * Manages chat sessions and messages using Zustand.
 * Implements optimistic updates with rollback on errors, persists to AsyncStorage,
 * and handles Server-Sent Events (SSE) streaming from the AI Edge Function.
 * 
 * Validates: Requirements 8.3-8.6, 9.1-9.6, 18.5
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { ChatSession, Message } from '@/types';

/**
 * Chat store state
 */
interface ChatState {
  sessions: Record<string, ChatSession>;
  messages: Record<string, Message[]>;
  streamingMessage: string | null;
  streamingSessionId: string | null;
  isSending: boolean;
  isLoading: boolean;
  error: string | null;
  lastSynced: number | null;
}

/**
 * Chat store actions
 */
interface ChatActions {
  fetchOrCreateSession: (coachId: string) => Promise<ChatSession>;
  fetchMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, coachId: string, content: string) => Promise<void>;
  appendStreamingToken: (token: string) => void;
  finalizeStreamingMessage: (messageId: string) => void;
  retryLastMessage: (sessionId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Complete chat store type
 */
type ChatStore = ChatState & ChatActions;

/**
 * Chat Store
 * 
 * Provides chat session and message management with the following features:
 * - Session creation and retrieval (one session per user-coach pair)
 * - Message CRUD operations
 * - Optimistic updates with rollback on errors
 * - Server-Sent Events (SSE) streaming for AI responses
 * - Persistence to AsyncStorage for offline access
 * - Retry functionality for failed messages
 * 
 * @example
 * ```typescript
 * import { useChatStore } from '@/stores/chatStore';
 * 
 * function ChatScreen({ coachId }: { coachId: string }) {
 *   const { 
 *     fetchOrCreateSession, 
 *     fetchMessages, 
 *     sendMessage,
 *     messages,
 *     streamingMessage,
 *     isSending
 *   } = useChatStore();
 *   
 *   useEffect(() => {
 *     const init = async () => {
 *       const session = await fetchOrCreateSession(coachId);
 *       await fetchMessages(session.id);
 *     };
 *     init();
 *   }, [coachId]);
 *   
 *   const handleSend = async (text: string) => {
 *     await sendMessage(sessionId, coachId, text);
 *   };
 *   
 *   return (
 *     <View>
 *       {messages[sessionId]?.map(msg => (
 *         <MessageBubble key={msg.id} message={msg} />
 *       ))}
 *       {streamingMessage && (
 *         <MessageBubble message={{ content: streamingMessage }} isStreaming />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // State
      // ============================================================================
      
      sessions: {},
      messages: {},
      streamingMessage: null,
      streamingSessionId: null,
      isSending: false,
      isLoading: false,
      error: null,
      lastSynced: null,

      // ============================================================================
      // Actions
      // ============================================================================

      /**
       * Fetch or create a chat session for a user-coach pair
       * 
       * Validates: Requirements 8.2, 8.3, 16.2
       * 
       * Each user-coach pair has exactly one chat session. This function
       * retrieves the existing session or creates a new one if it doesn't exist.
       * 
       * @param coachId - The coach ID
       * @returns The chat session
       * @throws Error if session creation/retrieval fails
       * 
       * @example
       * ```typescript
       * const session = await fetchOrCreateSession('coach-123');
       * console.log('Session ID:', session.id);
       * ```
       */
      fetchOrCreateSession: async (coachId) => {
        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        if (!isOnline) {
          set({
            error: "You're offline. Please check your connection.",
            isLoading: false,
          });
          throw new Error("You're offline. Please check your connection.");
        }

        set({ isLoading: true, error: null });

        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            throw new Error('User not authenticated');
          }

          // Check if session already exists
          const { data: existingSession, error: fetchError } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('coach_id', coachId)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is expected for new sessions
            throw fetchError;
          }

          if (existingSession) {
            // Session exists, return it
            const session: ChatSession = {
              id: existingSession.id,
              userId: existingSession.user_id,
              coachId: existingSession.coach_id,
              createdAt: existingSession.created_at,
              updatedAt: existingSession.updated_at,
            };

            set((state) => ({
              sessions: {
                ...state.sessions,
                [session.id]: session,
              },
              isLoading: false,
              lastSynced: Date.now(),
            }));

            return session;
          }

          // Session doesn't exist, create it
          const { data: newSession, error: createError } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              coach_id: coachId,
            })
            .select()
            .single();

          if (createError) throw createError;

          const session: ChatSession = {
            id: newSession.id,
            userId: newSession.user_id,
            coachId: newSession.coach_id,
            createdAt: newSession.created_at,
            updatedAt: newSession.updated_at,
          };

          set((state) => ({
            sessions: {
              ...state.sessions,
              [session.id]: session,
            },
            isLoading: false,
            lastSynced: Date.now(),
          }));

          return session;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch or create session',
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Fetch all messages for a chat session
       * 
       * Validates: Requirements 8.6, 16.2
       * 
       * Messages are ordered by created_at ascending (oldest first) for
       * chronological display in the chat interface.
       * 
       * @param sessionId - The chat session ID
       * @throws Error if fetch fails
       * 
       * @example
       * ```typescript
       * await fetchMessages('session-123');
       * const msgs = messages['session-123'];
       * ```
       */
      fetchMessages: async (sessionId) => {
        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        if (!isOnline) {
          set({
            error: "You're offline. Please check your connection.",
            isLoading: false,
          });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_session_id', sessionId)
            .order('created_at', { ascending: true });

          if (error) throw error;

          const messages: Message[] = (data || []).map((msg) => ({
            id: msg.id,
            chatSessionId: msg.chat_session_id,
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            createdAt: msg.created_at,
          }));

          set((state) => ({
            messages: {
              ...state.messages,
              [sessionId]: messages,
            },
            isLoading: false,
            lastSynced: Date.now(),
          }));
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch messages',
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Send a message and receive AI response with streaming
       * 
       * Validates: Requirements 8.4, 8.5, 9.1, 9.2, 9.4, 9.5, 9.6, 16.2
       * 
       * This function:
       * 1. Optimistically adds the user message to the UI
       * 2. Saves the user message to the database
       * 3. Calls the Edge Function to get AI response
       * 4. Streams the AI response token by token
       * 5. Saves the complete AI response to the database
       * 
       * If any step fails, appropriate rollback and error handling occurs.
       * 
       * @param sessionId - The chat session ID
       * @param coachId - The coach ID (for prompt composition)
       * @param content - The user's message content
       * @throws Error if send fails
       * 
       * @example
       * ```typescript
       * await sendMessage('session-123', 'coach-456', 'Hello, coach!');
       * ```
       */
      sendMessage: async (sessionId, coachId, content) => {
        // Check network status
        const { useNetworkStore } = require('./networkStore');
        const { isOnline } = useNetworkStore.getState();
        if (!isOnline) {
          set({ 
            error: "You're offline. Please check your connection.",
            isSending: false,
          });
          throw new Error("You're offline. Please check your connection.");
        }

        set({ isSending: true, error: null });

        const tempMessageId = `temp-${Date.now()}`;
        const userMessage: Message = {
          id: tempMessageId,
          chatSessionId: sessionId,
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
        };

        // Optimistic update - add user message immediately
        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: [...(state.messages[sessionId] || []), userMessage],
          },
        }));

        try {
          // Save user message to database
          const { data: savedUserMessage, error: saveError } = await supabase
            .from('messages')
            .insert({
              chat_session_id: sessionId,
              role: 'user',
              content,
            })
            .select()
            .single();

          if (saveError) throw saveError;

          // Replace temp message with saved message
          set((state) => ({
            messages: {
              ...state.messages,
              [sessionId]: state.messages[sessionId].map((msg) =>
                msg.id === tempMessageId
                  ? {
                      id: savedUserMessage.id,
                      chatSessionId: savedUserMessage.chat_session_id,
                      role: savedUserMessage.role as 'user' | 'assistant',
                      content: savedUserMessage.content,
                      createdAt: savedUserMessage.created_at,
                    }
                  : msg
              ),
            },
          }));

          // Get current session token for Edge Function auth
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No active session');
          }

          // Initialize streaming state
          set({
            streamingMessage: '',
            streamingSessionId: sessionId,
          });

          // Call Edge Function with SSE streaming
          const response = await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                sessionId,
                coachId,
                message: content,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Edge Function error: ${response.statusText}`);
          }

          // Handle SSE stream
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error('No response body');
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                
                if (data === '[DONE]') {
                  // Stream complete
                  continue;
                }

                try {
                  const event = JSON.parse(data);

                  if (event.type === 'token') {
                    // Append token to streaming message
                    get().appendStreamingToken(event.data);
                  } else if (event.type === 'done') {
                    // Finalize streaming message
                    get().finalizeStreamingMessage(event.data.messageId);
                  } else if (event.type === 'error') {
                    throw new Error(event.data.message);
                  }
                } catch (parseError) {
                  console.error('Error parsing SSE event:', parseError);
                }
              }
            }
          }

          set({ isSending: false });
        } catch (error) {
          // Rollback - remove temp user message on error
          set((state) => ({
            messages: {
              ...state.messages,
              [sessionId]: state.messages[sessionId].filter(
                (msg) => msg.id !== tempMessageId
              ),
            },
            streamingMessage: null,
            streamingSessionId: null,
            isSending: false,
            error: error instanceof Error 
              ? error.message 
              : "I'm having trouble responding right now. Please try again.",
          }));
          throw error;
        }
      },

      /**
       * Append a token to the streaming message
       * 
       * Validates: Requirements 9.5
       * 
       * This is called for each token received from the SSE stream.
       * Tokens are appended to build the complete AI response incrementally.
       * 
       * @param token - The token to append
       * 
       * @example
       * ```typescript
       * // Called internally by sendMessage during SSE streaming
       * appendStreamingToken('Hello');
       * appendStreamingToken(' ');
       * appendStreamingToken('world');
       * // streamingMessage is now "Hello world"
       * ```
       */
      appendStreamingToken: (token) => {
        set((state) => ({
          streamingMessage: (state.streamingMessage || '') + token,
        }));
      },

      /**
       * Finalize the streaming message and save it
       * 
       * Validates: Requirements 9.6
       * 
       * Called when the SSE stream completes. Takes the accumulated
       * streaming message and saves it as a complete assistant message.
       * 
       * @param messageId - The message ID from the Edge Function
       * 
       * @example
       * ```typescript
       * // Called internally by sendMessage when stream completes
       * finalizeStreamingMessage('msg-123');
       * ```
       */
      finalizeStreamingMessage: (messageId) => {
        const { streamingMessage, streamingSessionId } = get();
        
        if (streamingMessage && streamingSessionId) {
          const assistantMessage: Message = {
            id: messageId,
            chatSessionId: streamingSessionId,
            role: 'assistant',
            content: streamingMessage,
            createdAt: new Date().toISOString(),
          };

          set((state) => ({
            messages: {
              ...state.messages,
              [streamingSessionId]: [
                ...(state.messages[streamingSessionId] || []),
                assistantMessage,
              ],
            },
            streamingMessage: null,
            streamingSessionId: null,
            isSending: false,
          }));
        }
      },

      /**
       * Retry the last failed message
       * 
       * Validates: Requirements 9.7, 17.6
       * 
       * Finds the last user message in the session and resends it.
       * Useful for recovering from network errors or AI failures.
       * 
       * @param sessionId - The chat session ID
       * @throws Error if retry fails
       * 
       * @example
       * ```typescript
       * // User clicks retry button
       * await retryLastMessage('session-123');
       * ```
       */
      retryLastMessage: async (sessionId) => {
        const messages = get().messages[sessionId] || [];
        const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
        
        if (!lastUserMessage) {
          throw new Error('No message to retry');
        }

        // Remove any failed assistant message after the last user message
        const lastUserIndex = messages.findIndex((m) => m.id === lastUserMessage.id);
        const messagesUpToLastUser = messages.slice(0, lastUserIndex + 1);

        set((state) => ({
          messages: {
            ...state.messages,
            [sessionId]: messagesUpToLastUser,
          },
        }));

        // Get session to find coachId
        const session = get().sessions[sessionId];
        if (!session) {
          throw new Error('Session not found');
        }

        // Resend the message
        await get().sendMessage(sessionId, session.coachId, lastUserMessage.content);
      },

      /**
       * Clear error state
       * 
       * Useful for dismissing error messages in the UI.
       * 
       * @example
       * ```typescript
       * const { error, clearError } = useChatStore();
       * 
       * return (
       *   <View>
       *     {error && (
       *       <Alert>
       *         {error}
       *         <Button onPress={clearError}>Dismiss</Button>
       *       </Alert>
       *     )}
       *   </View>
       * );
       * ```
       */
      clearError: () => set({ error: null }),

      /**
       * Reset store to initial state
       * 
       * Useful for logout or testing scenarios.
       * 
       * @example
       * ```typescript
       * // On logout
       * reset();
       * ```
       */
      reset: () => {
        // Clear persisted storage first (synchronously start the operation)
        AsyncStorage.removeItem('north-chat-storage')?.catch((error) => {
          console.error('[ChatStore] Error clearing storage:', error);
        });
        // Then set state to initial values
        set({
          sessions: {},
          messages: {},
          streamingMessage: null,
          streamingSessionId: null,
          isSending: false,
          isLoading: false,
          error: null,
          lastSynced: null,
        });
      },
    }),
    {
      name: 'north-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist sessions, messages, and lastSynced, not streaming/loading states
      partialize: (state) => ({
        sessions: state.sessions,
        messages: state.messages,
        lastSynced: state.lastSynced,
      }),
    }
  )
);

const EMPTY_MESSAGES: Message[] = [];

/**
 * Helper hook to get messages for a specific session
 * 
 * @param sessionId - The chat session ID
 * @returns Array of messages for the session
 * 
 * @example
 * ```typescript
 * function MessageList({ sessionId }: { sessionId: string }) {
 *   const messages = useSessionMessages(sessionId);
 *   
 *   return (
 *     <FlatList
 *       data={messages}
 *       renderItem={({ item }) => <MessageBubble message={item} />}
 *     />
 *   );
 * }
 * ```
 */
export function useSessionMessages(sessionId: string): Message[] {
  return useChatStore((state) => state.messages[sessionId] || EMPTY_MESSAGES);
}

/**
 * Helper hook to get a specific session
 * 
 * @param sessionId - The chat session ID
 * @returns The chat session if found, undefined otherwise
 * 
 * @example
 * ```typescript
 * function ChatHeader({ sessionId }: { sessionId: string }) {
 *   const session = useSession(sessionId);
 *   
 *   if (!session) return null;
 *   
 *   return <Text>Chat with coach {session.coachId}</Text>;
 * }
 * ```
 */
export function useSession(sessionId: string): ChatSession | undefined {
  return useChatStore((state) => state.sessions[sessionId]);
}

/**
 * Helper hook to check if currently sending a message
 * 
 * @returns true if sending, false otherwise
 * 
 * @example
 * ```typescript
 * function ChatInput() {
 *   const isSending = useIsSending();
 *   
 *   return (
 *     <Button disabled={isSending}>
 *       {isSending ? 'Sending...' : 'Send'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useIsSending(): boolean {
  return useChatStore((state) => state.isSending);
}

/**
 * Helper hook to get the current streaming message
 * 
 * @returns The streaming message content or null
 * 
 * @example
 * ```typescript
 * function StreamingIndicator() {
 *   const streamingMessage = useStreamingMessage();
 *   
 *   if (!streamingMessage) return null;
 *   
 *   return <MessageBubble content={streamingMessage} isStreaming />;
 * }
 * ```
 */
export function useStreamingMessage(): string | null {
  return useChatStore((state) => state.streamingMessage);
}

/**
 * Helper hook to get message count for a session
 * 
 * @param sessionId - The chat session ID
 * @returns The number of messages in the session
 * 
 * @example
 * ```typescript
 * function ChatStats({ sessionId }: { sessionId: string }) {
 *   const count = useMessageCount(sessionId);
 *   
 *   return <Text>{count} messages</Text>;
 * }
 * ```
 */
export function useMessageCount(sessionId: string): number {
  return useChatStore((state) => state.messages[sessionId]?.length || 0);
}
