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
import { useBillingStore } from '@/stores/billingStore';
import { ChatHeader, MessageList, ChatInput, ContextUsageBar, GrowIndicator } from '@/components/chat';
import type { FileAttachment } from '@/components/chat/ChatInput';
import { SessionFileSelector } from '@/components/chat/SessionFileSelector';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ChatLoadingSkeleton } from '@/components/SkeletonLoader';
import { useThemeColors } from '@/contexts/ThemeContext';
import { canSendMessage, incrementDailyMessageCount, getDailyMessageCount, getFreeDailyLimit } from '@/lib/messageLimit';
import { Analytics } from '@/lib/analytics';
import { shareConversation } from '@/lib/conversationExport';
import type { Coach } from '@/types';
import { supabase } from '@/lib/supabase';
import { api, buildAuthHeaders } from '@/lib/api';


/**
 * Empty Chat State
 */
function EmptyChat({ coach }: { coach: Coach | undefined }) {
  const colors = useThemeColors();
  
  return (
    <View 
      className="flex-1 items-center justify-center px-8"
      accessible
      accessibilityRole="text"
    >
      <Text className="text-6xl mb-4">{coach?.icon || '🤖'}</Text>
      <Text 
        style={{ color: colors.text }}
        className="text-xl font-semibold mb-2"
        accessibilityRole="header"
      >
        Start a conversation
      </Text>
      <Text style={{ color: colors.textTertiary }} className="text-base text-center leading-6">
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
  const colors = useThemeColors();
  
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
  
  const { isProUser, showPaywall } = useBillingStore();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [growState, setGrowState] = useState<'goal' | 'reality' | 'options' | 'way_forward' | 'complete'>('goal');
  
  // Get messages for current session
  const messages = useSessionMessages(sessionId || '');
  const streamingMessage = useStreamingMessage();
  const isSending = useIsSending();

  // Pagination constants
  const PAGE_SIZE = 50;

  const refreshGrowState = useCallback(async (currentSessionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const response = await fetch(api.growState(currentSessionId), {
        method: 'GET',
        headers: buildAuthHeaders(accessToken),
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (payload?.state) {
        setGrowState(payload.state);
      }
    } catch (err) {
      console.warn('[ChatScreen] Failed to fetch GROW state:', err);
    }
  }, []);

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
        await refreshGrowState(session.id);
        
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
  }, [coachId, refreshGrowState]);

  useEffect(() => {
    if (!sessionId || isSending) return;
    refreshGrowState(sessionId);
  }, [sessionId, isSending, messages.length, refreshGrowState]);

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

  const handleSendMessage = useCallback(async (content: string, attachments?: FileAttachment[]) => {
    if (!sessionId || !coachId) return;
    
    // Check message limit for free users
    const limitCheck = await canSendMessage(isProUser);
    if (!limitCheck.allowed) {
      showPaywall('unlimited_messages');
      return;
    }
    
    try {
      await sendMessage(sessionId, coachId, content, attachments);
      await incrementDailyMessageCount();
      setDailyRemaining(limitCheck.remaining - 1);
      Analytics.messageSent(coachId, content.length);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [sessionId, coachId, sendMessage, isProUser, showPaywall]);

  const handleNewChat = useCallback(async () => {
    if (!coachId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Create a new session (force new by clearing current)
      const { sessions } = useChatStore.getState();
      if (sessionId && sessions[sessionId]) {
        // Clear messages for old session from local state
        useChatStore.setState((state) => {
          const newMessages = { ...state.messages };
          delete newMessages[sessionId];
          const newSessions = { ...state.sessions };
          delete newSessions[sessionId];
          return { messages: newMessages, sessions: newSessions };
        });
      }
      const session = await fetchOrCreateSession(coachId);
      setSessionId(session.id);
      setTotalLoaded(0);
      setHasMore(false);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  }, [coachId, sessionId, fetchOrCreateSession]);

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

  const handleExport = useCallback(() => {
    if (!isProUser) {
      showPaywall('conversation_export');
      return;
    }
    shareConversation(messages, coach || undefined, sessionId ? useChatStore.getState().sessions[sessionId]?.createdAt : undefined);
    Analytics.conversationExported('markdown');
  }, [messages, coach, sessionId, isProUser, showPaywall]);

  // Loading state
  if (isInitializing) {
    return (
      <SafeAreaView 
        style={{ flex: 1, backgroundColor: colors.background }}
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
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top']}
      >
        <View 
          className="flex-1 items-center justify-center px-8"
          accessible
          accessibilityRole="alert"
        >
          <Text className="text-6xl mb-4">🤔</Text>
          <Text 
            style={{ color: colors.text }}
            className="text-xl font-semibold mb-2"
            accessibilityRole="header"
          >
            Coach not found
          </Text>
          <Text style={{ color: colors.textTertiary }} className="text-base text-center">
            This coach doesn't exist or you don't have access to it.
          </Text>
          <Pressable
            onPress={handleBack}
            style={{ backgroundColor: colors.text }}
            className="mt-6 px-6 py-3 rounded-xl"
            accessibilityRole="button"
            accessibilityLabel="Go back to coach list"
          >
            <Text style={{ color: colors.background }} className="font-semibold">
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <OfflineIndicator />
      <ChatHeader 
        coach={coach} 
        onBack={handleBack}
        onExport={messages.length > 0 ? handleExport : undefined}
        onOpenFileSelector={sessionId ? handleOpenFileSelector : undefined}
      />
      <GrowIndicator state={growState} />
      <ContextUsageBar
        messages={messages}
        streamingMessage={streamingMessage}
        onNewChat={handleNewChat}
      />
      
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
          isProUser={isProUser}
          onShowPaywall={showPaywall}
        />
      </KeyboardAvoidingView>

      {/* File Selector Modal */}
      {sessionId && (
        <Modal
          visible={showFileSelector}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCloseFileSelector}
        >
          <SessionFileSelector
            sessionId={sessionId}
            onClose={handleCloseFileSelector}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}
