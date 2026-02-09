/**
 * FadeIn Component Unit Tests
 * 
 * Tests the FadeIn animation component's behavior, including:
 * - Basic fade-in animation
 * - Slide-up animation
 * - Stagger delays
 * - Reduced motion support
 * - Custom durations and delays
 * 
 * Validates: Requirements 3.4, 3.6
 */

import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { FadeIn, getStaggerDelay, isValidStaggerDelay } from '../FadeIn';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Mock the useReducedMotion hook
jest.mock('@/hooks/useReducedMotion');
const mockUseReducedMotion = useReducedMotion as jest.MockedFunction<typeof useReducedMotion>;

// react-native-reanimated is already mocked in jest.setup.js
// Import the mocked functions for testing
import * as Reanimated from 'react-native-reanimated';

describe('FadeIn Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseReducedMotion.mockReturnValue(false);
  });
  
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(getByText('Test Content')).toBeTruthy();
    });
    
    it('should render with custom style', () => {
      const customStyle = { backgroundColor: 'red', padding: 10 };
      const { getByTestId } = render(
        <FadeIn style={customStyle} testID="fade-in-container">
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      const container = getByTestId('fade-in-container');
      expect(container.props.style).toContainEqual(customStyle);
    });
    
    it('should pass through view props', () => {
      const { getByTestId } = render(
        <FadeIn testID="custom-test-id" accessibilityLabel="Fade in container">
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      const container = getByTestId('custom-test-id');
      expect(container.props.accessibilityLabel).toBe('Fade in container');
    });
  });
  
  describe('Animation Configuration', () => {
    it('should use default duration of 400ms', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 400 })
      );
    });
    
    it('should use custom duration when provided', () => {
      render(
        <FadeIn duration={600}>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 600 })
      );
    });
    
    it('should use default delay of 0ms', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withDelay).toHaveBeenCalledWith(0, expect.anything());
    });
    
    it('should use custom delay when provided', () => {
      render(
        <FadeIn delay={200}>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withDelay).toHaveBeenCalledWith(200, expect.anything());
    });
    
    it('should use ease-gentle easing curve', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          easing: expect.any(String),
        })
      );
    });
  });
  
  describe('Fade Animation', () => {
    it('should animate opacity from 0 to 1', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Check that opacity starts at 0
      expect(Reanimated.useSharedValue).toHaveBeenCalledWith(0);
      
      // Check that opacity animates to 1
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        1,
        expect.any(Object)
      );
    });
  });
  
  describe('Slide-Up Animation', () => {
    it('should not slide up by default', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Check that translateY starts at 0 when slideUp is false
      const calls = (Reanimated.useSharedValue as jest.Mock).mock.calls;
      const translateYCall = calls.find((call: any[]) => call[0] === 0);
      expect(translateYCall).toBeTruthy();
    });
    
    it('should slide up when slideUp prop is true', () => {
      render(
        <FadeIn slideUp>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Check that translateY starts at default slide distance (8px)
      const calls = (Reanimated.useSharedValue as jest.Mock).mock.calls;
      const translateYCall = calls.find((call: any[]) => call[0] === 8);
      expect(translateYCall).toBeTruthy();
      
      // Check that translateY animates to 0
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        0,
        expect.any(Object)
      );
    });
    
    it('should use custom slide distance when provided', () => {
      render(
        <FadeIn slideUp slideDistance={16}>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Check that translateY starts at custom slide distance
      const calls = (Reanimated.useSharedValue as jest.Mock).mock.calls;
      const translateYCall = calls.find((call: any[]) => call[0] === 16);
      expect(translateYCall).toBeTruthy();
    });
  });
  
  describe('Stagger Delays', () => {
    it('should support stagger delays for list items', () => {
      const items = ['Item 1', 'Item 2', 'Item 3'];
      render(
        <View>
          {items.map((item, index) => (
            <FadeIn key={item} delay={index * 50} slideUp>
              <Text>{item}</Text>
            </FadeIn>
          ))}
        </View>
      );
      
      // Check that delays are applied correctly
      expect(Reanimated.withDelay).toHaveBeenCalledWith(0, expect.anything());
      expect(Reanimated.withDelay).toHaveBeenCalledWith(50, expect.anything());
      expect(Reanimated.withDelay).toHaveBeenCalledWith(100, expect.anything());
    });
  });
  
  describe('Reduced Motion Support', () => {
    it('should skip animation when reduced motion is enabled', () => {
      mockUseReducedMotion.mockReturnValue(true);
      
      const { getByText } = render(
        <FadeIn slideUp>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Content should still be visible
      expect(getByText('Test Content')).toBeTruthy();
      
      // Animation should not be applied (renders as regular View)
      expect(Reanimated.withTiming).not.toHaveBeenCalled();
    });
    
    it('should render as regular View when reduced motion is enabled', () => {
      mockUseReducedMotion.mockReturnValue(true);
      
      const { getByTestId } = render(
        <FadeIn testID="fade-in-container">
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      const container = getByTestId('fade-in-container');
      // Should be a regular View, not Animated.View
      expect(container.type).toBe('View');
    });
  });
  
  describe('Disabled State', () => {
    it('should skip animation when disabled prop is true', () => {
      render(
        <FadeIn disabled>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Animation should not be applied
      expect(Reanimated.withTiming).not.toHaveBeenCalled();
    });
    
    it('should render as regular View when disabled', () => {
      const { getByTestId } = render(
        <FadeIn disabled testID="fade-in-container">
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      const container = getByTestId('fade-in-container');
      expect(container.type).toBe('View');
    });
  });
  
  describe('Utility Functions', () => {
    describe('getStaggerDelay', () => {
      it('should calculate stagger delay correctly with default delay', () => {
        expect(getStaggerDelay(0)).toBe(0);
        expect(getStaggerDelay(1)).toBe(50);
        expect(getStaggerDelay(2)).toBe(100);
        expect(getStaggerDelay(3)).toBe(150);
      });
      
      it('should calculate stagger delay correctly with custom delay', () => {
        expect(getStaggerDelay(0, 100)).toBe(0);
        expect(getStaggerDelay(1, 100)).toBe(100);
        expect(getStaggerDelay(2, 100)).toBe(200);
      });
      
      it('should handle edge cases', () => {
        expect(getStaggerDelay(0, 0)).toBe(0);
        expect(getStaggerDelay(10, 50)).toBe(500);
      });
    });
    
    describe('isValidStaggerDelay', () => {
      it('should return true for valid stagger delays (50-100ms)', () => {
        expect(isValidStaggerDelay(50)).toBe(true);
        expect(isValidStaggerDelay(75)).toBe(true);
        expect(isValidStaggerDelay(100)).toBe(true);
      });
      
      it('should return false for invalid stagger delays', () => {
        expect(isValidStaggerDelay(0)).toBe(false);
        expect(isValidStaggerDelay(49)).toBe(false);
        expect(isValidStaggerDelay(101)).toBe(false);
        expect(isValidStaggerDelay(200)).toBe(false);
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      render(
        <FadeIn duration={0}>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 0 })
      );
    });
    
    it('should handle very large delays', () => {
      render(
        <FadeIn delay={5000}>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      expect(Reanimated.withDelay).toHaveBeenCalledWith(5000, expect.anything());
    });
    
    it('should handle multiple children', () => {
      const { getByText } = render(
        <FadeIn>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
          <View>
            <Text>Nested Child</Text>
          </View>
        </FadeIn>
      );
      
      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
      expect(getByText('Nested Child')).toBeTruthy();
    });
    
    it('should handle empty children', () => {
      const { UNSAFE_root } = render(
        <FadeIn>
          {null}
        </FadeIn>
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });
  });
  
  describe('Animation Timing Requirements', () => {
    it('should use 400ms duration as specified in requirements', () => {
      render(
        <FadeIn>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Validates Requirement 3.4: 400ms duration
      expect(Reanimated.withTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 400 })
      );
    });
    
    it('should support stagger delays between 50-100ms as specified', () => {
      // Validates Requirement 3.6: 50-100ms stagger delays
      expect(isValidStaggerDelay(50)).toBe(true);
      expect(isValidStaggerDelay(75)).toBe(true);
      expect(isValidStaggerDelay(100)).toBe(true);
      
      // Outside the range should be invalid
      expect(isValidStaggerDelay(49)).toBe(false);
      expect(isValidStaggerDelay(101)).toBe(false);
    });
    
    it('should combine fade and slide animations as specified', () => {
      render(
        <FadeIn slideUp>
          <Text>Test Content</Text>
        </FadeIn>
      );
      
      // Validates Requirement 3.4: fade combined with slide
      // Should animate both opacity and translateY
      expect(Reanimated.withTiming).toHaveBeenCalledTimes(2);
    });
  });
});
