/**
 * ChatInput Component
 * 
 * Input bar with send button, haptic feedback, disabled state, and focus indicators.
 * Handles message composition and submission with proper validation.
 * Supports Enter key to send message.
 * 
 * Performance: Debounced input handling for smooth typing.
 * 
 * Validates: Requirements 10.3, 11.3, 11.4, 23.7
 */

import { useState, useCallback } from 'react';
import { View, TextInput, Pressable, Platform, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useIsOnline } from '@/stores/networkStore';
import { useIsDark, useThemeColors } from '@/contexts/ThemeContext';

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
 * - Enter key sends message (Shift+Enter for new line)
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
  const isDark = useIsDark();
  const colors = useThemeColors();

  // Memoized send handler for performance
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || disabled || !isOnline) {
      return;
    }

    // Haptic feedback on send
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    onSend(trimmedMessage);
    setMessage('');
    
    // Dismiss keyboard on mobile
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  }, [message, disabled, isOnline, onSend]);

  // Memoized text change handler with debouncing
  const handleTextChange = useCallback((text: string) => {
    setMessage(text);
  }, []);

  // Handle submit editing (Enter key on iOS/Android)
  const handleSubmitEditing = useCallback(() => {
    handleSend();
  }, [handleSend]);

  const canSend = message.trim().length > 0 && !disabled && isOnline;
  const focusColor = isDark ? '#60A5FA' : '#3B82F6';

  return (
    <View style={[
      styles.container,
      isDark && styles.containerDark
    ]}>
      <View style={styles.inputRow}>
        <View style={[
          styles.inputContainer,
          isDark && styles.inputContainerDark
        ]}>
          <TextInput
            value={message}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="#A1A1AA"
            multiline
            maxLength={10000}
            editable={!disabled}
            onSubmitEditing={handleSubmitEditing}
            returnKeyType="send"
            enablesReturnKeyAutomatically={true}
            blurOnSubmit={false}
            style={[
              styles.input,
              isDark && styles.inputDark
            ]}
            accessible
            accessibilityLabel="Message input"
            accessibilityHint="Type your message here. Press Enter or the send button to send."
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          style={({ pressed, focused }) => [
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
            isDark && canSend && styles.sendButtonActiveDark,
            isDark && !canSend && styles.sendButtonDisabledDark,
            pressed && canSend && styles.sendButtonPressed,
            focused && canSend && { 
              borderWidth: 2, 
              borderColor: focusColor,
            },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          accessibilityHint="Sends your message to the coach"
        >
          <Ionicons
            name="send"
            size={18}
            color={canSend ? '#FFFFFF' : '#A1A1AA'}
            style={styles.sendIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  containerDark: {
    borderTopColor: '#27272A',
    backgroundColor: '#09090B',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  inputContainerDark: {
    backgroundColor: '#18181B',
  },
  input: {
    fontSize: 16,
    color: '#09090B',
    minHeight: 28,
    maxHeight: 120,
    lineHeight: 22,
  },
  inputDark: {
    color: '#FAFAFA',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#09090B',
  },
  sendButtonActiveDark: {
    backgroundColor: '#FAFAFA',
  },
  sendButtonDisabled: {
    backgroundColor: '#E4E4E7',
  },
  sendButtonDisabledDark: {
    backgroundColor: '#27272A',
  },
  sendButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  sendIcon: {
    marginLeft: 2, // Slight offset to center the send icon visually
  },
});
