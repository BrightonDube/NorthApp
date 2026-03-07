/**
 * Conversation Export
 * 
 * Export coaching conversations as markdown or plain text.
 * Pro feature.
 */

import { Share, Alert } from 'react-native';
import type { Message } from '@/types';
import type { Coach } from '@/types';

/**
 * Format messages as markdown text
 */
export function formatConversationAsMarkdown(
  messages: Message[],
  coach?: Coach,
  sessionDate?: string
): string {
  const lines: string[] = [];
  
  lines.push(`# Coaching Session${coach ? ` with ${coach.name}` : ''}`);
  if (sessionDate) {
    lines.push(`*${new Date(sessionDate).toLocaleDateString('en', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}*`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const sender = msg.role === 'user' ? '**You**' : `**${coach?.name || 'Coach'}**`;
    const time = new Date(msg.createdAt).toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    lines.push(`${sender} (${time}):`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Exported from North AI Coaching • ${messages.length} messages*`);

  return lines.join('\n');
}

/**
 * Format messages as plain text
 */
export function formatConversationAsText(
  messages: Message[],
  coach?: Coach
): string {
  const lines: string[] = [];
  
  lines.push(`Coaching Session${coach ? ` with ${coach.name}` : ''}`);
  lines.push('');

  for (const msg of messages) {
    const sender = msg.role === 'user' ? 'You' : (coach?.name || 'Coach');
    lines.push(`[${sender}] ${msg.content}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Share conversation via system share sheet
 */
export async function shareConversation(
  messages: Message[],
  coach?: Coach,
  sessionDate?: string
): Promise<void> {
  if (messages.length === 0) {
    Alert.alert('Nothing to Export', 'Start a conversation first!');
    return;
  }

  const markdown = formatConversationAsMarkdown(messages, coach, sessionDate);
  
  try {
    await Share.share({
      message: markdown,
      title: `Coaching Session${coach ? ` with ${coach.name}` : ''}`,
    });
  } catch (err) {
    // User cancelled or share failed silently
  }
}
