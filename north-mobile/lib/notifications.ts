import * as Notifications from 'expo-notifications';
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
 * Send push token to backend (for remote notifications)
 * @param token - Expo push token
 * @param userId - User ID
 */
export async function registerPushTokenWithBackend(
  token: string,
  userId: string
): Promise<void> {
  // TODO: Implement backend API call to store push token
  // This would typically be a Supabase function or direct database insert
  console.log('Registering push token with backend:', { token, userId });
  
  // Example implementation:
  // await supabase
  //   .from('push_tokens')
  //   .upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
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
