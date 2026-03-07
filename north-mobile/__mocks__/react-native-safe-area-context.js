const React = require('react');
const { View } = require('react-native');

const mockInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const mockFrame = { x: 0, y: 0, width: 390, height: 844 };

const SafeAreaProvider = ({ children }) => React.createElement(View, { testID: 'safe-area-provider' }, children);
const SafeAreaView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => mockFrame,
  initialWindowMetrics: { insets: mockInsets, frame: mockFrame },
};
