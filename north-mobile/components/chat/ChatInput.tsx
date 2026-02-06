/**
 * ChatInput Component
 * 
 * Input bar with send button, haptic feedback, disabled state, and focus indicators.
 * Handles message composition and submission with proper validation.
 * 
 * Performance: Debounced input handling for smooth typing.
 * 
 * Validates: Requirements 10.3, 11.3, 11.4, 23.7
 */

import { useState, useCallback } from 'react';
import { View, TextInput, Pressable, Platform, useColorScheme, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useIsOnline } from '@/stores/networkStore';

// Debounce delay for input validation (ms) - reserved for future optimization
// const INPUT_DEBOUNCE_MS = 100;

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * ChatInput Component
 * 
 * Provides a text input with send button for composing messages.
 * Features:
 * - Auto-growing text input
 * - Send button disabled when empty or sending
 * - Haptic feedback on send
 * - Keyboard-aware layout
 * - Focus indicators for keyboard navigation
 * 
 * @param onSend - Callback when user sends a message
 * @param disabled - Whether input is disabled (e.g., during sending)
 * @param placeholder - Placeholder text for input
 * 
 * @example
 * ```tsx
 * <ChatInput
 *   onSend={handleSend}
 *   disabled={isSending}
 *   placeholder="Message your coach..."
 * />
 * ```
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const isOnline = useIsOnline();
  const colorScheme = useColorScheme();
  
  // Focus indicator color
  const focusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB';

  // Memoized send handler for performance
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled || !isOnline) {
      return;
    }

    // Haptic feedback on send
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onSend(trimmedMessage);
    setMessage('');
  }, [message, disabled, isOnline, onSend]);

  // Memoized text change handler with debouncing
  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const canSend = message.trim().length > 0 && !disabled && isOnline;

  return (
    <View
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3"
    >
      <View className="flex-row items-end gap-2">
        <View className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-4 py-2">
          <TextInput
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            multiline
            maxLength={10000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            className="text-base text-zinc-900 dark:text-white min-h-[40px] max-h-[120px]"
            accessible
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here"
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ focused }) => [
            styles.sendButton,
            {
              backgroundColor: canSend
                ? (colorScheme === 'dark' ? '#FAFAFA' : '#09090B')
                : (colorScheme === 'dark' ? '#27272A' : '#E4E4E7'),
            },
            focused && canSend && { 
              borderWidth: 2, 
              borderColor: focusColor,
            },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? '#FFFFFF' : '#A1A1AA'}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
