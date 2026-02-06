import { create } from 'zustand';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationStore {
  expoPushToken: string | null;
  notificationPermission: 'granted' | 'denied' | 'undetermined';
  isLoading: boolean;
  error: string | null;

  // Actions
  requestPermissions: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<string | null>;
  scheduleLocalNotification: (title: string, body: string, trigger?: Notifications.NotificationTriggerInput) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  setExpoPushToken: (token: string | null) => void;
  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => void;
}

const PUSH_TOKEN_KEY = '@north_push_token';

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  expoPushToken: null,
  notificationPermission: 'undetermined',
  isLoading: false,
  error: null,

  requestPermissions: async () => {
    try {
      set({ isLoading: true, error: null });

      // Check if running in Expo Go
      if (Constants.appOwnership === 'expo') {
        console.warn('Push notifications are not supported in Expo Go. Use a development build.');
        set({ 
          error: 'Push notifications not supported in Expo Go',
          isLoading: false,
          notificationPermission: 'denied'
        });
        return false;
      }

      if (!Device.isDevice) {
        set({ 
          error: 'Push notifications only work on physical devices',
          isLoading: false,
          notificationPermission: 'denied'
        });
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      set({ 
        notificationPermission: granted ? 'granted' : 'denied',
        isLoading: false
      });

      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      set({ 
        error: 'Failed to request notification permissions',
        isLoading: false,
        notificationPermission: 'denied'
      });
      return false;
    }
  },

  registerForPushNotifications: async () => {
    try {
      set({ isLoading: true, error: null });

      // Check if running in Expo Go
      if (Constants.appOwnership === 'expo') {
        console.warn('Push notifications are not supported in Expo Go.');
        set({ isLoading: false });
        return null;
      }

      // Check if we already have a token
      const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (cachedToken) {
        set({ expoPushToken: cachedToken, isLoading: false });
        return cachedToken;
      }

      // Request permissions first
      const hasPermission = await get().requestPermissions();
      if (!hasPermission) {
        set({ isLoading: false });
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'bc083779-e1cd-4c55-9fec-8fd405495396', // From app.json
      });

      const token = tokenData.data;

      // Cache the token
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      set({ expoPushToken: token, isLoading: false });
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      set({ 
        error: 'Failed to register for push notifications',
        isLoading: false
      });
      return null;
    }
  },

  scheduleLocalNotification: async (
    title: string,
    body: string,
    trigger?: Notifications.NotificationTriggerInput
  ) => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: trigger || null, // null means immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },

  cancelNotification: async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
      throw error;
    }
  },

  cancelAllNotifications: async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  },

  setExpoPushToken: (token: string | null) => {
    set({ expoPushToken: token });
  },

  setPermissionStatus: (status: 'granted' | 'denied' | 'undetermined') => {
    set({ notificationPermission: status });
  },
}));

// Configure notification handler (how notifications are displayed when app is foregrounded)
if (Constants.appOwnership !== 'expo') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Android notification channel configuration
if (Platform.OS === 'android' && Constants.appOwnership !== 'expo') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#09090B',
    sound: 'default',
  });
}
