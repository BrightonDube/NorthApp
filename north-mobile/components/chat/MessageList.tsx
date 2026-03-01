/**
 * MessageList Component
 * 
 * Displays a scrollable list of messages with rock-solid auto-scroll.
 * Uses FlatList with onContentSizeChange/onLayout for precise bottom-anchoring.
 * 
 * Performance optimizations:
 * - Memoized MessageBubble components
 * - Optimized key extraction
 * - Message pagination (load 50 at a time)
 * - No getItemLayout (variable height messages need dynamic measurement)
 * 
 * Validates: Requirements 8.7, 11.5, 20.3 (Memory Management)
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { FlatList, View, Text, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator } from './StreamingIndicator';

export interface MessageListProps {
  messages: Message[];
  streamingMessage?: string | null;
  isLoading?: boolean;
  emptyMessage?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading = false,
  emptyMessage = 'No messages yet. Start the conversation!',
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}: MessageListProps) {
  const colors = useThemeColors();
  const flatListRef = useRef<FlatList>(null);
  const shouldAutoScroll = useRef(true);
  const contentHeight = useRef(0);
  const layoutHeight = useRef(0);
  const prevStreamRef = useRef<string | null | undefined>(null);

  // Scroll to bottom helper - only animates for small deltas (streaming tokens)
  const scrollToBottom = useCallback((animated = true) => {
    if (!shouldAutoScroll.current) return;
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  // Anchor to bottom when content size grows (covers streaming + new messages)
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    const grew = h > contentHeight.current;
    contentHeight.current = h;
    if (grew && shouldAutoScroll.current) {
      scrollToBottom(true);
    }
  }, [scrollToBottom]);

  // Track visible height for "is at bottom" calculation
  const handleLayout = useCallback((e: any) => {
    layoutHeight.current = e.nativeEvent.layout.height;
  }, []);

  // Detect if user has scrolled away from bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    shouldAutoScroll.current = distFromBottom < 80;
  }, []);

  // Fire haptic when AI finishes streaming
  useEffect(() => {
    const wasStreaming = prevStreamRef.current != null && prevStreamRef.current.length > 0;
    const stoppedStreaming = streamingMessage == null || streamingMessage.length === 0;
    if (wasStreaming && stoppedStreaming) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    prevStreamRef.current = streamingMessage;
  }, [streamingMessage]);

  // Initial scroll when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame to wait for layout
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [messages.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  ), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Render "Load More" button at the top
  const renderHeader = useCallback(() => {
    if (!hasMore || !onLoadMore) return null;

    return (
      <View className="py-4 items-center">
        {isLoadingMore ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onLoadMore();
            }}
            style={{ backgroundColor: colors.surface }}
            className="px-4 py-2 rounded-full"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Load more messages"
          >
            <Text style={{ color: colors.text }} className="text-sm font-medium">
              Load More
            </Text>
          </Pressable>
        )}
      </View>
    );
  }, [hasMore, onLoadMore, isLoadingMore, colors]);

  // Render empty state
  if (!isLoading && messages.length === 0 && !streamingMessage) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        accessible
        accessibilityRole="text"
        accessibilityLabel={emptyMessage}
      >
        <Text style={{ color: colors.textSecondary }} className="text-center text-base">
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
      removeClippedSubviews={Platform.OS !== 'web'}
      maxToRenderPerBatch={15}
      updateCellsBatchingPeriod={30}
      initialNumToRender={20}
      windowSize={12}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onContentSizeChange={handleContentSizeChange}
      onLayout={handleLayout}
      maintainVisibleContentPosition={
        Platform.OS === 'ios' ? { minIndexForVisible: 0 } : undefined
      }
      ListHeaderComponent={renderHeader}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
        flexGrow: 1,
        justifyContent: messages.length === 0 ? 'center' : 'flex-start',
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
