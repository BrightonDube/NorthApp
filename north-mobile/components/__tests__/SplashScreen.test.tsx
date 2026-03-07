/**
 * SplashScreen Component Unit Tests
 * 
 * Tests the SplashScreen component's behavior, including:
 * - Logo rendering with correct size
 * - Logo container styling
 * - Gradient background configuration
 * 
 * Validates: Requirements 2.2, 2.5
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SplashScreen } from '../SplashScreen';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, colors, start, end, style, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return (
      <View
        {...props}
        style={style}
        testID="linear-gradient"
        // Store gradient props as data attributes for testing
        // @ts-ignore
        colors={colors}
        start={start}
        end={end}
      >
        {children}
      </View>
    );
  },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 44,
    bottom: 34,
    left: 0,
    right: 0,
  })),
}));

// Mock Logo component
jest.mock('@/components/Logo', () => ({
  Logo: ({ size, style }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return (
      <View
        testID="logo"
        // @ts-ignore
        size={size}
        style={style}
      />
    );
  },
}));

describe('SplashScreen Component', () => {
  describe('Logo Rendering', () => {
    it('should render Logo component', () => {
      const { getByTestId } = render(<SplashScreen visible={true} />);
      
      expect(getByTestId('logo')).toBeTruthy();
    });

    it('should render Logo with size between 80-100 pixels', () => {
      const { getByTestId } = render(<SplashScreen visible={true} />);
      
      const logo = getByTestId('logo');
      const size = logo.props.size;
      
      expect(size).toBeGreaterThanOrEqual(80);
      expect(size).toBeLessThanOrEqual(100);
    });

    it('should apply white tintColor to Logo for contrast', () => {
      const { getByTestId } = render(<SplashScreen visible={true} />);
      
      const logo = getByTestId('logo');
      const style = logo.props.style;
      
      expect(style).toHaveProperty('tintColor', '#FFFFFF');
    });
  });

  describe('Visibility Management', () => {
    it('should render when visible is true', () => {
      const { getByTestId } = render(<SplashScreen visible={true} />);
      
      expect(getByTestId('linear-gradient')).toBeTruthy();
    });

    it('should not render when visible is false', () => {
      const { queryByTestId } = render(<SplashScreen visible={false} />);
      
      expect(queryByTestId('linear-gradient')).toBeNull();
    });

    it('should render by default when visible prop is not provided', () => {
      const { getByTestId } = render(<SplashScreen />);
      
      expect(getByTestId('linear-gradient')).toBeTruthy();
    });
  });

  describe('Safe Area Insets', () => {
    it('should apply safe area insets to footer positioning', () => {
      const { getByText } = render(<SplashScreen visible={true} />);
      
      const brandText = getByText('Lovi');
      const footerView = brandText.parent?.parent;
      
      // Footer should have marginBottom of 32 (base) + 34 (bottom inset) = 66
      expect(footerView?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            marginBottom: 66,
          }),
        ])
      );
    });
  });
});
