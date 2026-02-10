/**
 * Chat Screen
 * 
 * Dynamic chat screen for conversations with AI coaches.
 * Implements streaming AI responses with Simon's "frictionless" UX.
 * 
 * Route: /chat/[coachId]
 * 
 * Features:
 * - Real-time message streaming (SSE)
 * - Optimistic message updates
 * - Auto-scroll to bottom
 * - Retry on failure
 * - Haptic feedback
 * 
 * Validates: Requirements 8.3-8.6, 9.1-9.6, 11.1-11.6
 */

import { 
  View, 
  Text, 
  KeyboardAvoidingView, 
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChatStore, useSessionMessages, useStreamingMessage, useIsSending } from '@/stores/chatStore';
import { useCoachStore, useCoachById } from '@/stores/coachStore';
import { ChatHeader, MessageList, ChatInput } from '@/components/chat';
import { SessionFileSelector } from '@/components/chat/SessionFileSelector';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ChatLoadingSkeleton } from '@/components/SkeletonLoader';
import type { Coach } from '@/types';


/**
 * Empty Chat State
 */
function EmptyChat({ coach }: { coach: Coach | undefined }) {
  return (
    <View 
      className="flex-1 items-center justify-center px-8"
      accessible
      accessibilityRole="text"
    >
      <Text className="text-6xl mb-4">{coach?.icon || '🤖'}</Text>
      <Text 
        className="text-xl font-semibold text-zinc-900 dark:text-white mb-2"
        accessibilityRole="header"
      >
        Start a conversation
      </Text>
      <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center leading-6">
        {coach?.name || 'Your coach'} is ready to help. Type a message below to begin.
      </Text>
    </View>
  );
}

/**
 * Error Banner Component
 */
function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <Pressable 
      onPress={onDismiss} 
      className="bg-red-100 dark:bg-red-900/30 px-4 py-3 mx-4 mb-2 rounded-xl"
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${error}`}
    >
      <Text className="text-sm text-red-900 dark:text-red-100 mb-1">
        {error}
      </Text>
      <Text className="text-xs text-red-900/70 dark:text-red-100/70">
        Tap to dismiss
      </Text>
    </Pressable>
  );
}

export default function ChatScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const router = useRouter();
  
  // Get coach info
  const coach = useCoachById(coachId || '');
  const { fetchCoaches } = useCoachStore();
  
  // Chat state
  const { 
    fetchOrCreateSession, 
    fetchMessages, 
    sendMessage,
    error,
    clearError,
  } = useChatStore();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [showFileSelector, setShowFileSelector] = useState(false);
  
  // Get messages for current session
  const messages = useSessionMessages(sessionId || '');
  const streamingMessage = useStreamingMessage();
  const isSending = useIsSending();

  // Pagination constants
  const PAGE_SIZE = 50;

  // Initialize session on mount
  useEffect(() => {
    const initializeChat = async () => {
      if (!coachId) return;
      
      setIsInitializing(true);
      try {
        // Ensure coaches are loaded
        await fetchCoaches();
        
        // Get or create session
        const session = await fetchOrCreateSession(coachId);
        setSessionId(session.id);
        
        // Fetch initial messages (first page)
        await fetchMessages(session.id, PAGE_SIZE, 0);
        setTotalLoaded(PAGE_SIZE);
        
        // Check if there might be more messages
        // We'll know for sure after the first fetch
        setHasMore(true);
      } catch (err) {
        console.error('Failed to initialize chat:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [coachId]);

  // Update hasMore based on messages loaded
  useEffect(() => {
    if (messages.length < PAGE_SIZE) {
      setHasMore(false);
    } else if (messages.length >= totalLoaded) {
      setHasMore(true);
    }
  }, [messages.length, totalLoaded]);

  // Load more messages (pagination)
  const handleLoadMore = useCallback(async () => {
    if (!sessionId || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      // Fetch next page of messages
      const currentCount = messages.length;
      await fetchMessages(sessionId, PAGE_SIZE, currentCount);
      
      // Update total loaded count
      setTotalLoaded(currentCount + PAGE_SIZE);
      
      // If we got fewer messages than requested, there are no more
      const newMessages = useChatStore.getState().messages[sessionId] || [];
      if (newMessages.length - currentCount < PAGE_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sessionId, messages.length, isLoadingMore, hasMore, fetchMessages]);

  const handleBack = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!sessionId || !coachId) return;
    
    try {
      await sendMessage(sessionId, coachId, content);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [sessionId, coachId, sendMessage]);

  const handleOpenFileSelector = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFileSelector(true);
  }, []);

  const handleCloseFileSelector = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowFileSelector(false);
  }, []);

  // Loading state
  if (isInitializing) {
    return (
      <SafeAreaView 
        className="flex-1 bg-white dark:bg-zinc-950" 
        edges={['top']}
      >
        {coach && <ChatHeader coach={coach} onBack={handleBack} />}
        <ChatLoadingSkeleton />
      </SafeAreaView>
    );
  }

  // Coach not found
  if (!coach) {
    return (
      <SafeAreaView 
        className="flex-1 bg-white dark:bg-zinc-950" 
        edges={['top']}
      >
        <View 
          className="flex-1 items-center justify-center px-8"
          accessible
          accessibilityRole="alert"
        >
          <Text className="text-6xl mb-4">🤔</Text>
          <Text 
            className="text-xl font-semibold text-zinc-900 dark:text-white mb-2"
            accessibilityRole="header"
          >
            Coach not found
          </Text>
          <Text className="text-base text-zinc-500 dark:text-zinc-400 text-center">
            This coach doesn't exist or you don't have access to it.
          </Text>
          <Pressable
            onPress={handleBack}
            className="mt-6 bg-zinc-900 dark:bg-zinc-100 px-6 py-3 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel="Go back to coach list"
          >
            <Text className="text-white dark:text-zinc-900 font-semibold">
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      className="flex-1 bg-white dark:bg-zinc-950" 
      edges={['top', 'bottom']}
    >
      <OfflineIndicator />
      <ChatHeader coach={coach} onBack={handleBack} />
      
      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && !streamingMessage ? (
          <EmptyChat coach={coach} />
        ) : (
          <MessageList
            messages={messages}
            streamingMessage={streamingMessage}
            isLoading={false}
            emptyMessage={`Start a conversation with ${coach.name}`}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        )}

        {/* Error Banner */}
        {error && (
          <ErrorBanner error={error} onDismiss={clearError} />
        )}

        <ChatInput 
          onSend={handleSendMessage} 
          disabled={isSending || !sessionId}
          placeholder={`Message ${coach.name}...`}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
