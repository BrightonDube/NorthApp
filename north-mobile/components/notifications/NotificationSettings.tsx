import React, { useState } from 'react';
import { View, Text, Switch, Pressable, Alert, Platform, StyleSheet } from 'react-native';
import { useNotificationStore } from '@/stores/notificationStore';
import { scheduleDailyReminder, cancelAllNotifications } from '@/lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useThemeColors } from '@/contexts/ThemeContext';

const DAILY_REMINDER_KEY = '@north_daily_reminder_enabled';
const DAILY_REMINDER_HOUR_KEY = '@north_daily_reminder_hour';

export function NotificationSettings() {
  const colors = useThemeColors();
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
    <View 
      style={[
        styles.section, 
        { 
          backgroundColor: colors.card,
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
        }
      ]}
    >
      {/* Permission Status */}
      <View style={[
        styles.settingsRow,
        { borderBottomColor: colors.border }
      ]}>
        <View style={styles.rowLabelSection}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Notification Permission
          </Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            {getPermissionStatusText()}
          </Text>
        </View>
        <View style={styles.rowValueSection}>
          {notificationPermission !== 'granted' && (
            <Pressable
              onPress={handleEnableNotifications}
              disabled={isLoading || Constants.appOwnership === 'expo'}
              style={({ pressed }) => [
                styles.enableButton,
                { backgroundColor: colors.text },
                pressed && { opacity: 0.8 },
                (isLoading || Constants.appOwnership === 'expo') && { opacity: 0.5 }
              ]}
            >
              <Text style={[styles.enableButtonText, { color: colors.background }]}>
                Enable
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Daily Reminder Toggle */}
      <View style={[
        styles.settingsRow,
        { borderBottomWidth: 0 }
      ]}>
        <View style={styles.rowLabelSection}>
          <Text style={[styles.rowLabel, { color: colors.text }]}>
            Daily Check-in
          </Text>
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
            Reminder at {reminderHour}:00 {reminderHour >= 12 ? 'PM' : 'AM'}
          </Text>
        </View>
        <View style={styles.rowValueSection}>
          <Switch
            value={dailyReminderEnabled}
            onValueChange={handleToggleDailyReminder}
            disabled={notificationPermission !== 'granted' || Constants.appOwnership === 'expo'}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      {/* Info Text */}
      {Constants.appOwnership === 'expo' ? (
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: colors.warning }]}>
            Note: Notifications are disabled in Expo Go. Use a development build to test this feature.
          </Text>
        </View>
      ) : (
        notificationPermission === 'granted' && (
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.textTertiary }]}>
              You can customize notification times and types in future updates.
            </Text>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    minHeight: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabelSection: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 14,
  },
  rowValueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
