/**
 * ChatInput Component
 * 
 * Input bar with send button, haptic feedback, and disabled state.
 * Handles message composition and submission with proper validation.
 * 
 * Validates: Requirements 10.3, 11.3, 11.4
 */

import { useState } from 'react';
import { View, TextInput, TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useIsOnline } from '@/stores/networkStore';

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

  const handleSend = () => {
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
  };

  const canSend = message.trim().length > 0 && !disabled && isOnline;

  return (
    <View
      className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3"
      accessible
      accessibilityRole="none"
    >
      <View className="flex-row items-end gap-2">
        <View className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-4 py-2">
          <TextInput
            value={message}
            onChangeText={setMessage}
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

        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            canSend
              ? 'bg-zinc-900 dark:bg-zinc-100'
              : 'bg-zinc-200 dark:bg-zinc-800'
          }`}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? (Platform.OS === 'ios' ? '#FFFFFF' : '#FFFFFF') : '#A1A1AA'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
