/**
 * MessageBubble Component
 * 
 * Displays individual chat messages with role-based styling and streaming support.
 * User messages are right-aligned, assistant messages are left-aligned.
 * 
 * Validates: Requirements 8.7, 11.1, 11.2
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Message } from '@/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useThemeColors } from '@/contexts/ThemeContext';

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * MessageBubble Component
 * 
 * Renders a single message with appropriate styling based on role.
 * Supports streaming messages with a typing indicator.
 * 
 * Performance: Memoized to prevent unnecessary re-renders.
 * 
 * @param message - The message to display
 * @param isStreaming - Whether this message is currently streaming
 * 
 * @example
 * ```tsx
 * <MessageBubble 
 *   message={{ 
 *     id: '1', 
 *     role: 'user', 
 *     content: 'Hello!' 
 *   }} 
 * />
 * 
 * <MessageBubble 
 *   message={{ 
 *     id: '2', 
 *     role: 'assistant', 
 *     content: 'Hi there!' 
 *   }}
 *   isStreaming={true}
 * />
 * ```
 */
export const MessageBubble = React.memo(function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const prefersReducedMotion = useReducedMotion();
  const colors = useThemeColors();

  return (
    <Animated.View
      entering={prefersReducedMotion ? undefined : FadeIn}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
      testID={`message-bubble-${message.id}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? 'You' : 'Assistant'} said: ${message.content}`}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.messageSent : colors.messageReceived,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isUser ? colors.messageTextSent : colors.messageTextReceived,
            },
          ]}
          selectable
        >
          {message.content}
          {isStreaming && (
            <Text style={styles.cursor}> ▊</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  cursor: {
    opacity: 0.5,
  },
});

// Memoization comparison function - only re-render if content or streaming state changes
MessageBubble.displayName = 'MessageBubble';
