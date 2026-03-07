import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotificationStore } from '../notificationStore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidNotificationPriority: {
    HIGH: 'high',
  },
  AndroidImportance: {
    MAX: 'max',
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('notificationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useNotificationStore.setState({
      expoPushToken: null,
      notificationPermission: 'undetermined',
      isLoading: false,
      error: null,
    });
  });

  describe('requestPermissions', () => {
    it('should request and grant permissions', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { result } = renderHook(() => useNotificationStore());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(true);
      expect(result.current.notificationPermission).toBe('granted');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle denied permissions', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => useNotificationStore());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(false);
      expect(result.current.notificationPermission).toBe('denied');
    });

    it('should return false on non-device', async () => {
      // Temporarily mock Device.isDevice to return false
      const originalIsDevice = Device.isDevice;
      Object.defineProperty(Device, 'isDevice', {
        get: () => false,
        configurable: true,
      });

      const { result } = renderHook(() => useNotificationStore());

      let granted: boolean = true;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(false);
      expect(result.current.notificationPermission).toBe('denied');
      
      // Restore original value
      Object.defineProperty(Device, 'isDevice', {
        get: () => originalIsDevice,
        configurable: true,
      });
    });

    it('should use existing granted permissions', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      const { result } = renderHook(() => useNotificationStore());

      let granted: boolean = false;
      await act(async () => {
        granted = await result.current.requestPermissions();
      });

      expect(granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('registerForPushNotifications', () => {
    it('should register and return push token', async () => {
      const mockToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useNotificationStore());

      let token: string | null = null;
      await act(async () => {
        token = await result.current.registerForPushNotifications();
      });

      expect(token).toBe(mockToken);
      expect(result.current.expoPushToken).toBe(mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@north_push_token',
        mockToken
      );
    });

    it('should return cached token if available', async () => {
      const cachedToken = 'ExponentPushToken[cached]';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(cachedToken);

      const { result } = renderHook(() => useNotificationStore());

      let token: string | null = null;
      await act(async () => {
        token = await result.current.registerForPushNotifications();
      });

      expect(token).toBe(cachedToken);
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('should return null if permissions denied', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => useNotificationStore());

      let token: string | null = 'should-be-null';
      await act(async () => {
        token = await result.current.registerForPushNotifications();
      });

      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a notification', async () => {
      const mockId = 'notification-id-123';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);

      const { result } = renderHook(() => useNotificationStore());

      let notificationId: string = '';
      await act(async () => {
        notificationId = await result.current.scheduleLocalNotification(
          'Test Title',
          'Test Body'
        );
      });

      expect(notificationId).toBe(mockId);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          sound: true,
          priority: 'high',
        },
        trigger: null,
      });
    });

    it('should schedule with custom trigger', async () => {
      const mockId = 'notification-id-456';
      const trigger = { seconds: 60 };
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockId);

      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.scheduleLocalNotification(
          'Delayed',
          'This is delayed',
          trigger as any
        );
      });

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Delayed',
          body: 'This is delayed',
          sound: true,
          priority: 'high',
        },
        trigger,
      });
    });
  });

  describe('cancelNotification', () => {
    it('should cancel a specific notification', async () => {
      const notificationId = 'notification-123';
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.cancelNotification(notificationId);
      });

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        notificationId
      );
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all notifications', async () => {
      (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotificationStore());

      await act(async () => {
        await result.current.cancelAllNotifications();
      });

      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('setters', () => {
    it('should set expo push token', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.setExpoPushToken('new-token');
      });

      expect(result.current.expoPushToken).toBe('new-token');
    });

    it('should set permission status', () => {
      const { result } = renderHook(() => useNotificationStore());

      act(() => {
        result.current.setPermissionStatus('granted');
      });

      expect(result.current.notificationPermission).toBe('granted');
    });
  });
});
