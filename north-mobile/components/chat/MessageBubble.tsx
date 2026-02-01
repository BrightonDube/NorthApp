/**
 * MessageBubble Component
 * 
 * Displays individual chat messages with role-based styling and streaming support.
 * User messages are right-aligned, assistant messages are left-aligned.
 * 
 * Validates: Requirements 8.7, 11.1, 11.2
 */

import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Message } from '@/types';

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
export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className={`mb-4 ${isUser ? 'items-end' : 'items-start'}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? 'You' : 'Assistant'} said: ${message.content}`}
    >
      <View
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-zinc-900 dark:bg-zinc-100'
            : 'bg-zinc-100 dark:bg-zinc-800'
        }`}
      >
        <Text
          className={`text-base leading-6 ${
            isUser
              ? 'text-white dark:text-zinc-900'
              : 'text-zinc-900 dark:text-white'
          }`}
          selectable
        >
          {message.content}
          {isStreaming && (
            <Text className="opacity-50"> ▊</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}
