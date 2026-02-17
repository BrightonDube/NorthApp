import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';

/**
 * Schedule a daily reminder notification
 * @param hour - Hour of day (0-23)
 * @param minute - Minute of hour (0-59)
 * @param title - Notification title
 * @param body - Notification body
 * @returns Notification ID
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<string> {
  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    repeats: true,
  };

  return await useNotificationStore.getState().scheduleLocalNotification(
    title,
    body,
    trigger
  );
}

/**
 * Schedule a notification after a delay
 * @param seconds - Delay in seconds
 * @param title - Notification title
 * @param body - Notification body
 * @returns Notification ID
 */
export async function scheduleDelayedNotification(
  seconds: number,
  title: string,
  body: string
): Promise<string> {
  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats: false,
  };

  return await useNotificationStore.getState().scheduleLocalNotification(
    title,
    body,
    trigger
  );
}

/**
 * Send an immediate local notification
 * @param title - Notification title
 * @param body - Notification body
 * @returns Notification ID
 */
export async function sendImmediateNotification(
  title: string,
  body: string
): Promise<string> {
  return await useNotificationStore.getState().scheduleLocalNotification(
    title,
    body
  );
}

/**
 * Get all scheduled notifications
 * @returns Array of scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await useNotificationStore.getState().cancelAllNotifications();
}

/**
 * Send push token to backend for remote notifications
 * @param token - Expo push token
 * @param userId - User ID
 */
export async function registerPushTokenWithBackend(
  token: string,
  userId: string
): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      // Table may not exist yet - log but don't crash
      console.warn('[Notifications] Could not store push token:', error.message);
    } else {
      console.log('[Notifications] Push token registered with backend');
    }
  } catch (err) {
    console.warn('[Notifications] Failed to register push token:', err);
  }
}

/**
 * Notification templates for common use cases
 */
export const NotificationTemplates = {
  dailyPrompt: {
    title: 'Daily Check-in',
    body: 'How are you progressing on your goals today?',
  },
  coachReminder: (coachName: string) => ({
    title: `Message from ${coachName}`,
    body: 'Your coach has insights to share with you.',
  }),
  goalReminder: (goalName: string) => ({
    title: 'Goal Reminder',
    body: `Don't forget about: ${goalName}`,
  }),
  weeklyReview: {
    title: 'Weekly Review',
    body: 'Time to reflect on your progress this week.',
  },
};
