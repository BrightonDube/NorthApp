import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { scheduleDailyReminder, cancelAllNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DAILY_REMINDER_KEY = '@north_daily_reminder_enabled';
const DAILY_REMINDER_HOUR_KEY = '@north_daily_reminder_hour';

export function NotificationSettings() {
  const { 
    notificationPermission, 
    requestPermissions,
    isLoading 
  } = useNotificationStore();

  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9); // 9 AM default

  // Load saved preferences
  React.useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const enabled = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
      const hour = await AsyncStorage.getItem(DAILY_REMINDER_HOUR_KEY);
      
      if (enabled !== null) {
        setDailyReminderEnabled(enabled === 'true');
      }
      if (hour !== null) {
        setReminderHour(parseInt(hour, 10));
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const handleEnableNotifications = async () => {
    if (Constants.appOwnership === 'expo') {
      Alert.alert(
        'Not Supported',
        'Push notifications are not fully supported in Expo Go on Android. Please use a development build.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (notificationPermission === 'denied') {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                // On iOS, we can't directly open settings, but we can prompt the user
                Alert.alert('Open Settings', 'Go to Settings > North > Notifications');
              }
            }
          }
        ]
      );
      return;
    }

    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Notification permissions are required to send you reminders.'
      );
    }
  };

  const handleToggleDailyReminder = async (value: boolean) => {
    if (value && notificationPermission !== 'granted') {
      await handleEnableNotifications();
      return;
    }

    setDailyReminderEnabled(value);
    await AsyncStorage.setItem(DAILY_REMINDER_KEY, value.toString());

    if (value) {
      // Schedule daily reminder
      try {
        await scheduleDailyReminder(
          reminderHour,
          0,
          'Daily Check-in',
          'How are you progressing on your goals today?'
        );
        Alert.alert('Success', 'Daily reminder scheduled!');
      } catch (error) {
        console.error('Error scheduling daily reminder:', error);
        Alert.alert('Error', 'Failed to schedule daily reminder');
        setDailyReminderEnabled(false);
      }
    } else {
      // Cancel all notifications
      await cancelAllNotifications();
    }
  };

  const getPermissionStatusText = () => {
    if (Constants.appOwnership === 'expo') {
      return 'Not Supported';
    }
    switch (notificationPermission) {
      case 'granted':
        return 'Enabled';
      case 'denied':
        return 'Disabled';
      default:
        return 'Not Set';
    }
  };

  const getPermissionStatusColor = () => {
    if (Constants.appOwnership === 'expo') {
      return 'text-amber-600 dark:text-amber-400';
    }
    switch (notificationPermission) {
      case 'granted':
        return 'text-green-600 dark:text-green-400';
      case 'denied':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-4">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
        Notifications
      </Text>

      {/* Permission Status */}
      <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <View>
          <Text className="text-base text-zinc-900 dark:text-zinc-100 mb-1">
            Notification Permission
          </Text>
          <Text className={`text-sm ${getPermissionStatusColor()}`}>
            {getPermissionStatusText()}
          </Text>
        </View>
        {notificationPermission !== 'granted' && (
          <TouchableOpacity
            onPress={handleEnableNotifications}
            disabled={isLoading || Constants.appOwnership === 'expo'}
            className={`px-4 py-2 rounded-lg ${
              Constants.appOwnership === 'expo' 
                ? 'bg-zinc-200 dark:bg-zinc-800 opacity-50' 
                : 'bg-zinc-900 dark:bg-zinc-100'
            }`}
          >
            <Text className={`${
              Constants.appOwnership === 'expo'
                ? 'text-zinc-500 dark:text-zinc-400'
                : 'text-white dark:text-zinc-900'
            } font-semibold`}>
              Enable
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daily Reminder Toggle */}
      <View className="flex-row justify-between items-center">
        <View className="flex-1 mr-4">
          <Text className="text-base text-zinc-900 dark:text-zinc-100 mb-1">
            Daily Check-in
          </Text>
          <Text className="text-sm text-zinc-600 dark:text-zinc-400">
            Receive a daily reminder at {reminderHour}:00 {reminderHour >= 12 ? 'PM' : 'AM'}
          </Text>
        </View>
        <Switch
          value={dailyReminderEnabled}
          onValueChange={handleToggleDailyReminder}
          disabled={notificationPermission !== 'granted' || Constants.appOwnership === 'expo'}
          trackColor={{ false: '#d4d4d8', true: '#09090B' }}
          thumbColor="#ffffff"
        />
      </View>

      {/* Info Text */}
      {Constants.appOwnership === 'expo' ? (
        <Text className="text-xs text-amber-600 dark:text-amber-400 mt-4">
          Note: Notifications are disabled in Expo Go. Use a development build to test this feature.
        </Text>
      ) : (
        notificationPermission === 'granted' && (
          <Text className="text-xs text-zinc-500 dark:text-zinc-500 mt-4">
            You can customize notification times and types in future updates.
          </Text>
        )
      )}
    </View>
  );
}
