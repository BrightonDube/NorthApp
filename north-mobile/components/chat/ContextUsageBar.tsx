/**
 * ContextUsageBar Component
 * 
 * Shows token usage percentage and a "New Chat" button.
 * Estimates tokens using ~4 chars per token heuristic.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';
import type { Message } from '@/types';

const MAX_CONTEXT_TOKENS = 131072; // llama-3.3-70b-versatile context window

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ContextUsageBarProps {
  messages: Message[];
  streamingMessage: string | null;
  onNewChat: () => void;
}

export function ContextUsageBar({ messages, streamingMessage, onNewChat }: ContextUsageBarProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();

  const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0)
    + (streamingMessage ? estimateTokens(streamingMessage) : 0);

  const usagePercent = Math.min(Math.round((totalTokens / MAX_CONTEXT_TOKENS) * 100), 100);
  const barColor = usagePercent > 80 ? '#EF4444' : usagePercent > 50 ? '#F59E0B' : '#22C55E';

  return (
    <View style={[styles.container, { borderBottomColor: isDark ? '#2A2725' : '#E7E5E4' }]}>
      <View style={styles.leftSection}>
        <View style={[styles.barBackground, { backgroundColor: isDark ? '#292524' : '#E7E5E4' }]}>
          <View style={[styles.barFill, { width: `${Math.max(usagePercent, 1)}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {usagePercent}% context
        </Text>
      </View>
      <Pressable
        onPress={onNewChat}
        style={[styles.newChatButton, { backgroundColor: isDark ? '#292524' : '#F5F5F4' }]}
        accessibilityRole="button"
        accessibilityLabel="Start new chat"
      >
        <Ionicons name="add-circle-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.newChatText, { color: colors.textSecondary }]}>New Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  barBackground: {
    width: 80,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  newChatText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
