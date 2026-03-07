/**
 * Message Limit Service
 * 
 * Tracks daily message usage for free-tier users.
 * Free users: 5 messages per day per coach
 * Pro users: Unlimited
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DAILY_LIMIT_KEY = '@north_daily_messages';
const FREE_DAILY_LIMIT = 5;

interface DailyUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get today's message count
 */
export async function getDailyMessageCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_LIMIT_KEY);
    if (!raw) return 0;

    const usage: DailyUsage = JSON.parse(raw);
    if (usage.date !== getTodayKey()) return 0;

    return usage.count;
  } catch {
    return 0;
  }
}

/**
 * Increment today's message count
 */
export async function incrementDailyMessageCount(): Promise<number> {
  const today = getTodayKey();
  let count = 0;

  try {
    const raw = await AsyncStorage.getItem(DAILY_LIMIT_KEY);
    if (raw) {
      const usage: DailyUsage = JSON.parse(raw);
      if (usage.date === today) {
        count = usage.count;
      }
    }
  } catch {
    // Start fresh
  }

  count++;
  await AsyncStorage.setItem(DAILY_LIMIT_KEY, JSON.stringify({ date: today, count }));
  return count;
}

/**
 * Check if user can send a message
 */
export async function canSendMessage(isProUser: boolean): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  if (isProUser) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  const count = await getDailyMessageCount();
  const remaining = Math.max(0, FREE_DAILY_LIMIT - count);

  return {
    allowed: remaining > 0,
    remaining,
    limit: FREE_DAILY_LIMIT,
  };
}

/**
 * Get the daily limit for display
 */
export function getFreeDailyLimit(): number {
  return FREE_DAILY_LIMIT;
}
