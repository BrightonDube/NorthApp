/**
 * MessageList Component
 * 
 * Displays a scrollable list of messages with auto-scroll to latest.
 * Uses FlatList for virtualization and performance.
 * 
 * Performance optimizations:
 * - FlatList with getItemLayout for instant scrolling
 * - Memoized MessageBubble components
 * - Optimized key extraction
 * - Message pagination (load 50 at a time)
 * 
 * Validates: Requirements 8.7, 11.5, 20.3 (Memory Management)
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator } from 'react-native';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

// Estimated item height for getItemLayout optimization
// This improves scroll performance significantly
const ESTIMATED_ITEM_HEIGHT = 80;

export interface MessageListProps {
  messages: Message[];
  streamingMessage?: string | null;
  isLoading?: boolean;
  emptyMessage?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

/**
 * MessageList Component
 * 
 * Renders a virtualized list of messages with auto-scroll behavior.
 * Automatically scrolls to the bottom when new messages arrive.
 * Shows a streaming indicator when AI is responding.
 * Supports pagination with "Load More" button for chat history.
 * 
 * @param messages - Array of messages to display
 * @param streamingMessage - Current streaming message content (if any)
 * @param isLoading - Whether messages are being loaded
 * @param emptyMessage - Message to show when list is empty
 * @param hasMore - Whether there are more messages to load
 * @param onLoadMore - Callback to load more messages
 * @param isLoadingMore - Whether more messages are currently being loaded
 * 
 * @example
 * ```tsx
 * <MessageList
 *   messages={messages}
 *   streamingMessage={streamingMessage}
 *   isLoading={isLoading}
 *   emptyMessage="Start a conversation with your coach"
 *   hasMore={hasMore}
 *   onLoadMore={loadMoreMessages}
 *   isLoadingMore={isLoadingMore}
 * />
 * ```
 */
export function MessageList({
  messages,
  streamingMessage,
  isLoading = false,
  emptyMessage = 'No messages yet. Start the conversation!',
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);
  const shouldAutoScroll = useRef(true);

  // Auto-scroll to bottom when messages change (only if user is at bottom)
  useEffect(() => {
    if (shouldAutoScroll.current && (messages.length > 0 || streamingMessage)) {
      // Small delay to ensure layout is complete
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingMessage]);

  // Memoized render function for better performance
  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  ), []);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Message) => item.id, []);

  // getItemLayout for instant scrolling (performance optimization)
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    shouldAutoScroll.current = isAtBottom;
  }, []);

  // Render "Load More" button at the top
  const renderHeader = useCallback(() => {
    if (!hasMore || !onLoadMore) return null;

    return (
      <View className="py-4 items-center">
        {isLoadingMore ? (
          <ActivityIndicator size="small" className="text-zinc-500 dark:text-zinc-400" />
        ) : (
          <Pressable
            onPress={onLoadMore}
            className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Load more messages"
          >
            <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Load More
            </Text>
          </Pressable>
        )}
      </View>
    );
  }, [hasMore, onLoadMore, isLoadingMore]);

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
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={15}
      windowSize={10}
      onScroll={handleScroll}
      scrollEventThrottle={400}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={{
        paddingHorizontal: 24, // Updated to screen-margin-x (24px)
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
