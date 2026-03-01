/**
 * MessageBubble Component
 * 
 * Displays individual chat messages with role-based styling and streaming support.
 * User messages are right-aligned, assistant messages are left-aligned.
 * 
 * Validates: Requirements 8.7, 11.1, 11.2
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Message } from '@/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

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
  const isDark = useIsDark();

  // Animated blinking cursor for streaming
  const cursorOpacity = useSharedValue(1);
  useEffect(() => {
    if (isStreaming && !prefersReducedMotion) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 400 }),
          withTiming(1, { duration: 400 }),
        ),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = 1;
    }
  }, [isStreaming, prefersReducedMotion]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const enterAnim = prefersReducedMotion
    ? undefined
    : isUser
      ? FadeIn.duration(200)
      : FadeInDown.duration(280).springify();

  const bubbleShadow = isUser
    ? {}
    : isDark
      ? { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 }
      : { shadowColor: '#78716C', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2 };

  return (
    <Animated.View
      entering={enterAnim}
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
      testID={`message-bubble-${message.id}`}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? 'You' : 'Coach'} said: ${message.content}`}
      accessibilityLiveRegion={isStreaming ? 'polite' : 'none'}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser
              ? (isDark ? '#3B82F6' : '#1D4ED8')
              : (isDark ? '#1E1C1A' : '#FFFFFF'),
          },
          bubbleShadow,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isUser ? '#FFFFFF' : colors.text,
            },
          ]}
          selectable={!isStreaming}
        >
          {message.content}
          {isStreaming && (
            <Animated.View style={[styles.cursorWrap, cursorStyle]}>
              <Text style={[styles.cursor, { color: colors.primary }]}>{'|'}</Text>
            </Animated.View>
          )}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 6,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  cursorWrap: {
    display: 'flex',
    width: 10,
    height: 20,
    marginLeft: 1,
    ...Platform.select({ web: { display: 'inline-flex' as any } }),
  },
  cursor: {
    fontSize: 18,
    fontWeight: '300',
    lineHeight: 20,
  },
});

MessageBubble.displayName = 'MessageBubble';
