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
  TextInput, 
  FlatList, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef, useEffect, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useChatStore, useSessionMessages, useStreamingMessage, useIsSending } from '@/stores/chatStore';
import { useCoachStore, useCoachById } from '@/stores/coachStore';
import type { Message, Coach } from '@/types';

/**
 * Chat Header Component
 */
function ChatHeader({ coach, onBack }: { coach: Coach | undefined; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable 
        onPress={onBack} 
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backArrow}>←</Text>
      </Pressable>
      <View style={styles.headerContent}>
        <Text style={styles.coachIcon}>{coach?.icon || '🤖'}</Text>
        <View style={styles.headerText}>
          <Text style={styles.coachName} numberOfLines={1}>
            {coach?.name || 'Coach'}
          </Text>
          <Text style={styles.coachStatus}>Online</Text>
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message, isStreaming }: { message: Message | { content: string; role: string }; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  
  return (
    <View style={[
      styles.messageBubbleContainer,
      isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
    ]}>
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userMessageText : styles.assistantMessageText,
        ]}>
          {message.content}
          {isStreaming && <Text style={styles.cursor}>▊</Text>}
        </Text>
      </View>
    </View>
  );
}

/**
 * Chat Input Component
 */
function ChatInput({ 
  onSend, 
  disabled 
}: { 
  onSend: (message: string) => void; 
  disabled: boolean;
}) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const handleSend = () => {
    if (text.trim() && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor="#A1A1AA"
          multiline
          maxLength={10000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel="Message input"
          accessibilityHint="Type your message here"
        />
        <Pressable
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          style={({ pressed }) => [
            styles.sendButton,
            (!text.trim() || disabled) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {disabled ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>↑</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Empty Chat State
 */
function EmptyChat({ coach }: { coach: Coach | undefined }) {
  return (
    <View style={styles.emptyChat}>
      <Text style={styles.emptyChatIcon}>{coach?.icon || '🤖'}</Text>
      <Text style={styles.emptyChatTitle}>Start a conversation</Text>
      <Text style={styles.emptyChatSubtitle}>
        {coach?.name || 'Your coach'} is ready to help. Type a message below to begin.
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  
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
  
  // Get messages for current session
  const messages = useSessionMessages(sessionId || '');
  const streamingMessage = useStreamingMessage();
  const isSending = useIsSending();

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
        
        // Fetch existing messages
        await fetchMessages(session.id);
      } catch (err) {
        console.error('Failed to initialize chat:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeChat();
  }, [coachId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 || streamingMessage) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingMessage]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!sessionId || !coachId) return;
    
    try {
      await sendMessage(sessionId, coachId, content);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [sessionId, coachId, sendMessage]);

  // Prepare data for FlatList including streaming message
  const renderMessages = useCallback(() => {
    const allMessages: (Message | { id: string; content: string; role: string })[] = [...messages];
    
    if (streamingMessage) {
      allMessages.push({
        id: 'streaming',
        content: streamingMessage,
        role: 'assistant',
      });
    }
    
    return allMessages;
  }, [messages, streamingMessage]);

  // Loading state
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ChatHeader coach={coach} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#09090B" />
          <Text style={styles.loadingText}>Setting up chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayMessages = renderMessages();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ChatHeader coach={coach} onBack={handleBack} />
      
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {displayMessages.length === 0 ? (
          <EmptyChat coach={coach} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble 
                message={item} 
                isStreaming={item.id === 'streaming'}
              />
            )}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          />
        )}

        {/* Error Banner */}
        {error && (
          <Pressable onPress={clearError} style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorDismiss}>Tap to dismiss</Text>
          </Pressable>
        )}

        <ChatInput 
          onSend={handleSendMessage} 
          disabled={isSending || !sessionId}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#71717A',
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 24,
    color: '#09090B',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  coachIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  coachName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#09090B',
  },
  coachStatus: {
    fontSize: 13,
    color: '#71717A',
  },
  headerSpacer: {
    width: 40,
  },

  // Message list styles
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageBubbleContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
  },
  assistantBubbleContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#09090B',
  },
  assistantBubble: {
    backgroundColor: '#F4F4F5',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: '#09090B',
  },
  cursor: {
    color: '#71717A',
    opacity: 0.7,
  },

  // Empty chat styles
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyChatIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 8,
  },
  emptyChatSubtitle: {
    fontSize: 15,
    color: '#71717A',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Input styles
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F4F4F5',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#09090B',
    maxHeight: 120,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D4D4D8',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Error banner styles
  errorBanner: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 2,
  },
  errorDismiss: {
    fontSize: 12,
    color: '#991B1B',
    opacity: 0.7,
  },
});
