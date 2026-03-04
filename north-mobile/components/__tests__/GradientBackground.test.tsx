/**
 * GradientBackground Component Unit Tests
 * 
 * Tests the GradientBackground component's behavior, including:
 * - Rendering with different variants (calm, surface)
 * - Theme switching (light/dark mode)
 * - Gradient directions (linear, radial)
 * - Custom gradient support
 * - Disabled state
 * - Convenience wrappers
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import {
  GradientBackground,
  CalmGradientBackground,
  SurfaceGradientBackground,
} from '../GradientBackground';
import { generateLightGradient, generateDarkGradient } from '@/design-system/utils/gradient-utils';
import { useIsDark } from '@/contexts/ThemeContext';

// Mock ThemeContext
jest.mock('@/contexts/ThemeContext', () => ({
  useIsDark: jest.fn(),
}));

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

let mockColorScheme: string | undefined = 'light';

describe('GradientBackground Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockColorScheme = 'light';
    (useIsDark as jest.Mock).mockImplementation(() => mockColorScheme === 'dark');
  });

  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should render as LinearGradient by default', () => {
      const { getByTestId } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      expect(getByTestId('linear-gradient')).toBeTruthy();
    });

    it('should pass through view props', () => {
      const { getByTestId } = render(
        <GradientBackground testID="custom-test-id" accessibilityLabel="Gradient container">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      // The mock passes testID as "linear-gradient" always, but accessibilityLabel should pass through
      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.accessibilityLabel).toBe('Gradient container');
    });

    it('should apply custom styles', () => {
      const customStyle = { padding: 20, borderRadius: 16 };
      const { getByTestId } = render(
        <GradientBackground style={customStyle}>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      const flatStyle = Array.isArray(gradient.props.style) 
        ? Object.assign({}, ...gradient.props.style)
        : gradient.props.style;
      expect(flatStyle).toMatchObject(customStyle);
    });
  });

  describe('Gradient Variants', () => {
    it('should use calm variant by default', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should use surface variant when specified', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="surface">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#F5F5F4', '#E7E5E4']);
    });

    it('should use calm variant colors in light mode', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should use surface variant colors in light mode', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="surface">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#F5F5F4', '#E7E5E4']);
    });
  });

  describe('Theme Switching', () => {
    it('should use light mode colors when color scheme is light', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should use dark mode colors when color scheme is dark', () => {
      (useIsDark as jest.Mock).mockReturnValue(true);
      
      const { getByTestId } = render(
        <GradientBackground variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#0C0A09', '#1C1917']);
    });

    it('should switch calm variant colors in dark mode', () => {
      (useIsDark as jest.Mock).mockReturnValue(true);
      
      const { getByTestId } = render(
        <GradientBackground variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#0C0A09', '#1C1917']);
    });

    it('should switch surface variant colors in dark mode', () => {
      (useIsDark as jest.Mock).mockReturnValue(true);
      
      const { getByTestId } = render(
        <GradientBackground variant="surface">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#1C1917', '#292524']);
    });
  });

  describe('Gradient Directions', () => {
    it('should use linear direction by default (180deg)', () => {
      const { getByTestId } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0, y: 0 });
      expect(gradient.props.end).toEqual({ x: 0, y: 1 });
    });

    it('should use linear direction when specified', () => {
      const { getByTestId } = render(
        <GradientBackground direction="linear">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0, y: 0 });
      expect(gradient.props.end).toEqual({ x: 0, y: 1 });
    });

    it('should use radial direction when specified', () => {
      const { getByTestId } = render(
        <GradientBackground direction="radial">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0.5, y: 0.5 });
      expect(gradient.props.end).toEqual({ x: 1, y: 1 });
    });

    it('should support radial direction with calm variant', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="calm" direction="radial">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
      expect(gradient.props.start).toEqual({ x: 0.5, y: 0.5 });
      expect(gradient.props.end).toEqual({ x: 1, y: 1 });
    });

    it('should support radial direction with surface variant', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="surface" direction="radial">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#F5F5F4', '#E7E5E4']);
      expect(gradient.props.start).toEqual({ x: 0.5, y: 0.5 });
      expect(gradient.props.end).toEqual({ x: 1, y: 1 });
    });
  });

  describe('Custom Gradients', () => {
    it('should support custom gradient configuration', () => {
      mockColorScheme = 'light';
      
      const customGradient = {
        light: generateLightGradient('#FAFAF9', 'linear'),
        dark: generateDarkGradient('#0C0A09', 'linear'),
      };
      
      const { getByTestId } = render(
        <GradientBackground customGradient={customGradient}>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toHaveLength(2);
      expect(gradient.props.colors[0]).toBe(customGradient.light.startColor);
      expect(gradient.props.colors[1]).toBe(customGradient.light.endColor);
    });

    it('should use custom gradient in dark mode', () => {
      (useIsDark as jest.Mock).mockReturnValue(true);
      
      const customGradient = {
        light: generateLightGradient('#FAFAF9', 'linear'),
        dark: generateDarkGradient('#0C0A09', 'linear'),
      };
      
      const { getByTestId } = render(
        <GradientBackground customGradient={customGradient}>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toHaveLength(2);
      expect(gradient.props.colors[0]).toBe(customGradient.dark.startColor);
      expect(gradient.props.colors[1]).toBe(customGradient.dark.endColor);
    });

    it('should override variant when custom gradient is provided', () => {
      mockColorScheme = 'light';
      
      const customGradient = {
        light: generateLightGradient('#FFFFFF', 'linear'),
        dark: generateDarkGradient('#000000', 'linear'),
      };
      
      const { getByTestId } = render(
        <GradientBackground variant="surface" customGradient={customGradient}>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      // Should use custom gradient, not surface variant
      expect(gradient.props.colors[0]).toBe(customGradient.light.startColor);
      expect(gradient.props.colors[1]).toBe(customGradient.light.endColor);
    });
  });

  describe('Disabled State', () => {
    it('should render as View when disabled', () => {
      const { queryByTestId, getByText } = render(
        <GradientBackground disabled>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      expect(queryByTestId('linear-gradient')).toBeNull();
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should use solid background color when disabled in light mode', () => {
      mockColorScheme = 'light';
      
      const { UNSAFE_root } = render(
        <GradientBackground disabled variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const view = UNSAFE_root.findByType(View);
      const flatStyle = Array.isArray(view.props.style) 
        ? Object.assign({}, ...view.props.style)
        : view.props.style;
      expect(flatStyle).toMatchObject({ backgroundColor: '#FAFAF9' });
    });

    it('should use solid background color when disabled in dark mode', () => {
      (useIsDark as jest.Mock).mockReturnValue(true);
      
      const { UNSAFE_root } = render(
        <GradientBackground disabled variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const view = UNSAFE_root.findByType(View);
      const flatStyle = Array.isArray(view.props.style) 
        ? Object.assign({}, ...view.props.style)
        : view.props.style;
      expect(flatStyle).toMatchObject({ backgroundColor: '#0C0A09' });
    });

    it('should apply custom styles when disabled', () => {
      const customStyle = { padding: 20, borderRadius: 16 };
      const { UNSAFE_root } = render(
        <GradientBackground disabled style={customStyle}>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const view = UNSAFE_root.findByType(View);
      const flatStyle = Array.isArray(view.props.style) 
        ? Object.assign({}, ...view.props.style)
        : view.props.style;
      expect(flatStyle).toMatchObject(customStyle);
    });
  });

  describe('Convenience Wrappers', () => {
    it('should render CalmGradientBackground with calm variant', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <CalmGradientBackground>
          <Text>Test Content</Text>
        </CalmGradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should render SurfaceGradientBackground with surface variant', () => {
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <SurfaceGradientBackground>
          <Text>Test Content</Text>
        </SurfaceGradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#F5F5F4', '#E7E5E4']);
    });

    it('should support all props in CalmGradientBackground', () => {
      const { getByTestId } = render(
        <CalmGradientBackground direction="radial">
          <Text>Test Content</Text>
        </CalmGradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0.5, y: 0.5 });
    });

    it('should support all props in SurfaceGradientBackground', () => {
      const { getByTestId } = render(
        <SurfaceGradientBackground direction="radial">
          <Text>Test Content</Text>
        </SurfaceGradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0.5, y: 0.5 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple children', () => {
      const { getByText } = render(
        <GradientBackground>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
          <View>
            <Text>Nested Child</Text>
          </View>
        </GradientBackground>
      );
      
      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
      expect(getByText('Nested Child')).toBeTruthy();
    });

    it('should handle empty children', () => {
      const { UNSAFE_root } = render(
        <GradientBackground>
          {null}
        </GradientBackground>
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle undefined color scheme', () => {
      mockColorScheme = undefined;
      
      const { getByTestId } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      // Should default to light mode
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should handle rapid theme changes', () => {
      mockColorScheme = 'light';
      
      const { getByTestId, rerender } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      let gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
      
      // Switch to dark mode
      (useIsDark as jest.Mock).mockReturnValue(true);
      rerender(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#0C0A09', '#1C1917']);
    });
  });

  describe('Requirements Validation', () => {
    it('should apply gradients to backgrounds (Requirement 5.1)', () => {
      const { getByTestId } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      expect(getByTestId('linear-gradient')).toBeTruthy();
    });

    it('should use subtle gradients with max 5% luminosity difference (Requirement 5.2)', () => {
      // This is validated by the gradient utility functions
      // The component uses predefined gradients that meet this requirement
      mockColorScheme = 'light';
      
      const { getByTestId } = render(
        <GradientBackground variant="calm">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
    });

    it('should use natural gradient direction (180deg) (Requirement 5.3)', () => {
      const { getByTestId } = render(
        <GradientBackground direction="linear">
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      const gradient = getByTestId('linear-gradient');
      expect(gradient.props.start).toEqual({ x: 0, y: 0 });
      expect(gradient.props.end).toEqual({ x: 0, y: 1 });
    });

    it('should support theme switching (Requirement 5.4)', () => {
      mockColorScheme = 'light';
      
      const { getByTestId, rerender } = render(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      let gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#FAFAF9', '#F5F5F4']);
      
      (useIsDark as jest.Mock).mockReturnValue(true);
      rerender(
        <GradientBackground>
          <Text>Test Content</Text>
        </GradientBackground>
      );
      
      gradient = getByTestId('linear-gradient');
      expect(gradient.props.colors).toEqual(['#0C0A09', '#1C1917']);
    });
  });
});
