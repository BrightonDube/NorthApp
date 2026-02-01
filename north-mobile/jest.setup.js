// Import React Native Testing Library
// Note: @testing-library/react-native v12.4+ has built-in matchers
// No need to import extend-expect separately

// Load environment variables from .env file for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pigtshfobiwuwaionxpo.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZ3RzaGZvYml3dXdhaW9ueHBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDgzMTgsImV4cCI6MjA4NTI4NDMxOH0.Y_r1qK2yiHtNYdnKjbv0c3MnKjG8MOwBEC78n39uZwU';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  const mockFrame = { x: 0, y: 0, width: 390, height: 844 };

  const SafeAreaProvider = ({ children }) => React.createElement(View, { testID: 'safe-area-provider' }, children);
  const SafeAreaView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);

  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets: () => mockInsets,
    useSafeAreaFrame: () => mockFrame,
    initialWindowMetrics: { insets: mockInsets, frame: mockFrame },
  };
});

// Mock Expo Web Browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
  maybeCompleteAuthSession: jest.fn(),
  dismissBrowser: jest.fn(),
}));

// Mock Expo Auth Session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'north://auth/callback'),
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
  ResponseType: { Token: 'token' },
  Prompt: { Login: 'login' },
}));

// Mock Expo Linking
jest.mock('expo-linking', () => ({
  createURL: jest.fn((path) => `north://${path}`),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  openURL: jest.fn(),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/'),
  Link: jest.fn(({ children }) => children),
  Redirect: jest.fn(() => null),
  Stack: {
    Screen: jest.fn(() => null),
  },
  Tabs: {
    Screen: jest.fn(() => null),
  },
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signInWithOAuth: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      getUser: jest.fn(),
      setSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

// Mock RevenueCat
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getCustomerInfo: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  setDebugLogsEnabled: jest.fn(),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  return {
    __esModule: true,
    default: {
      View,
      Text,
      ScrollView: require('react-native').ScrollView,
    },
    FadeIn: jest.fn(),
    FadeOut: jest.fn(),
    FadeInDown: jest.fn(),
    FadeInUp: jest.fn(),
    SlideInRight: jest.fn(),
    SlideOutLeft: jest.fn(),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: ({ children, renderRightActions }: any) => (
      <View>
        {children}
        {renderRightActions && renderRightActions()}
      </View>
    ),
    GestureHandlerRootView: View,
    PanGestureHandler: View,
    TapGestureHandler: View,
    State: {},
    Directions: {},
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Set up global test timeout
jest.setTimeout(10000);
