import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useNotificationStore } from '@/stores/notificationStore';
import { useAuthStore } from '@/stores/authStore';
import { registerPushTokenWithBackend } from '@/lib/notifications';

export interface NotificationResponse {
  notification: Notifications.Notification;
  actionIdentifier: string;
}

/**
 * Hook for managing notifications in components
 * Handles registration, permissions, and notification responses
 */
export function useNotifications() {
  const { user } = useAuthStore();
  const {
    expoPushToken,
    notificationPermission,
    isLoading,
    requestPermissions,
    registerForPushNotifications,
  } = useNotificationStore();

  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>(null);
  const responseListener = useRef<Notifications.Subscription>(null);

  // Register for push notifications when user logs in
  useEffect(() => {
    if (user && !expoPushToken) {
      registerForPushNotifications().then((token) => {
        if (token && user.id) {
          // Register token with backend for remote notifications
          registerPushTokenWithBackend(token, user.id).catch((error) => {
            console.error('Failed to register push token with backend:', error);
          });
        }
      });
    }
  }, [user, expoPushToken]);

  // Set up notification listeners
  useEffect(() => {
    // Skip in Expo Go since notifications aren't fully supported
    if (Constants.appOwnership === 'expo') {
      return;
    }

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
    });

    // Listener for when user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification;
      setLastNotification(notification);
      
      // Handle notification tap - navigate to relevant screen
      handleNotificationResponse(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    // Handle different notification types
    if (data?.type === 'chat' && data?.coachId) {
      // Navigate to chat screen
      console.log('Navigate to chat:', data.coachId);
      // TODO: Implement navigation using router
      // router.push(`/chat/${data.coachId}`);
    } else if (data?.type === 'goal' && data?.goalId) {
      // Navigate to context screen
      console.log('Navigate to context screen');
      // TODO: Implement navigation
      // router.push('/(tabs)/context');
    }
  };

  return {
    expoPushToken,
    notificationPermission,
    isLoading,
    lastNotification,
    requestPermissions,
    registerForPushNotifications,
  };
}
