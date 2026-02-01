/**
 * MessageList Component
 * 
 * Displays a scrollable list of messages with auto-scroll to latest.
 * Uses FlatList for virtualization and performance.
 * 
 * Validates: Requirements 8.7, 11.5
 */

import { useRef, useEffect } from 'react';
import { FlatList, View, Text } from 'react-native';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

export interface MessageListProps {
  messages: Message[];
  streamingMessage?: string | null;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * MessageList Component
 * 
 * Renders a virtualized list of messages with auto-scroll behavior.
 * Automatically scrolls to the bottom when new messages arrive.
 * Shows a streaming indicator when AI is responding.
 * 
 * @param messages - Array of messages to display
 * @param streamingMessage - Current streaming message content (if any)
 * @param isLoading - Whether messages are being loaded
 * @param emptyMessage - Message to show when list is empty
 * 
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   streamingMessage={streamingMessage}
 *   isLoading={isLoading}
 *   emptyMessage="Start a conversation with your coach"
 * />
 * ```
 */
export function MessageList({
  messages,
  streamingMessage,
  isLoading = false,
  emptyMessage = 'No messages yet. Start the conversation!',
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 || streamingMessage) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingMessage]);

  // Render empty state
  if (!isLoading && messages.length === 0 && !streamingMessage) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        accessible
        accessibilityRole="text"
        accessibilityLabel={emptyMessage}
      >
        <Text className="text-center text-zinc-500 dark:text-zinc-400 text-base">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MessageBubble message={item} />}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
      }}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        streamingMessage ? (
          <MessageBubble
            message={{
              id: 'streaming',
              chatSessionId: '',
              role: 'assistant',
              content: streamingMessage,
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        ) : streamingMessage === '' ? (
          <StreamingIndicator />
        ) : null
      }
      accessible
      accessibilityRole="list"
      accessibilityLabel="Message list"
    />
  );
}
