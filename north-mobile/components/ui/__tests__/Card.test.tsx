/**
 * Card Component Tests
 * 
 * Unit tests for the Card component following the Calm Design System Refresh.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 4.3, 5.1, 8.1, 8.2, 8.4
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <Card>
          <Text>Test Content</Text>
        </Card>
      );
      
      expect(getByText('Test Content')).toBeTruthy();
    });

    it('should apply testID when provided', () => {
      const { getByTestId } = render(
        <Card testID="test-card">
          <Text>Content</Text>
        </Card>
      );
      
      expect(getByTestId('test-card')).toBeTruthy();
    });
  });

  describe('Padding', () => {
    it('should apply default padding (20px)', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: 20 })
        ])
      );
    });

    it('should apply large padding (24px) when specified', () => {
      const { getByTestId } = render(
        <Card testID="card" padding="large">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ padding: 24 })
        ])
      );
    });
  });

  describe('Border Radius', () => {
    it('should apply 16px border radius (Requirement 4.3)', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderRadius: 16 })
        ])
      );
    });
  });

  describe('Shadow', () => {
    it('should apply medium shadow by default', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style.flat();
      const hasShadow = styles.some((style: any) => 
        style && typeof style === 'object' && 'shadowOpacity' in style
      );
      expect(hasShadow).toBe(true);
    });

    it('should not apply shadow when shadow="none"', () => {
      const { getByTestId } = render(
        <Card testID="card" shadow="none">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style.flat();
      const hasShadow = styles.some((style: any) => 
        style && typeof style === 'object' && 'shadowOpacity' in style
      );
      expect(hasShadow).toBe(false);
    });

    it('should apply small shadow when shadow="sm"', () => {
      const { getByTestId } = render(
        <Card testID="card" shadow="sm">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style.flat();
      const shadowStyle = styles.find((style: any) => 
        style && typeof style === 'object' && 'shadowOpacity' in style
      );
      expect(shadowStyle).toBeDefined();
      expect(shadowStyle.shadowOpacity).toBe(0.04); // Soft shadow (Requirement 8.1, 8.2)
    });

    it('should apply large shadow when shadow="lg"', () => {
      const { getByTestId } = render(
        <Card testID="card" shadow="lg">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      const styles = card.props.style.flat();
      const shadowStyle = styles.find((style: any) => 
        style && typeof style === 'object' && 'shadowOpacity' in style
      );
      expect(shadowStyle).toBeDefined();
      expect(shadowStyle.shadowOpacity).toBe(0.06); // Soft shadow (Requirement 8.1, 8.2)
    });
  });

  describe('Gradient Background', () => {
    it('should render without gradient by default', () => {
      const { getByText } = render(
        <Card>
          <Text>Content</Text>
        </Card>
      );
      
      // Content should be directly accessible (not wrapped in gradient)
      expect(getByText('Content')).toBeTruthy();
    });

    it('should render with gradient when gradient=true', () => {
      const { getByTestId } = render(
        <Card testID="card" gradient>
          <Text>Content</Text>
        </Card>
      );
      
      // Card should still be accessible
      expect(getByTestId('card')).toBeTruthy();
    });
  });

  describe('Interactive Behavior', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Card testID="card" onPress={onPress}>
          <Text>Content</Text>
        </Card>
      );
      
      fireEvent.press(getByTestId('card'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onLongPress when long pressed', () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <Card testID="card" onLongPress={onLongPress}>
          <Text>Content</Text>
        </Card>
      );
      
      fireEvent(getByTestId('card'), 'longPress');
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should render as Pressable when onPress is provided', () => {
      const { getByTestId } = render(
        <Card testID="card" onPress={() => {}}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBe('button');
    });

    it('should render as View when no interaction handlers provided', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessibilityRole).toBeUndefined();
    });
  });

  describe('Accessibility', () => {
    it('should apply accessibility label when provided', () => {
      const { getByTestId } = render(
        <Card 
          testID="card" 
          onPress={() => {}}
          accessibilityLabel="Test Card"
        >
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessibilityLabel).toBe('Test Card');
    });

    it('should apply accessibility hint when provided', () => {
      const { getByTestId } = render(
        <Card 
          testID="card" 
          onPress={() => {}}
          accessibilityHint="Double tap to open"
        >
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessibilityHint).toBe('Double tap to open');
    });

    it('should be accessible when interactive', () => {
      const { getByTestId } = render(
        <Card testID="card" onPress={() => {}}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.accessible).toBe(true);
      expect(card.props.accessibilityRole).toBe('button');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom styles', () => {
      const customStyle = { marginTop: 10, marginBottom: 20 };
      const { getByTestId } = render(
        <Card testID="card" style={customStyle}>
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining(customStyle)
        ])
      );
    });
  });

  describe('Color Tokens (Calm Design System)', () => {
    it('should use warm surface color (#F5F5F4) for light mode', () => {
      const { getByTestId } = render(
        <Card testID="card">
          <Text>Content</Text>
        </Card>
      );
      
      const card = getByTestId('card');
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F5F5F4' })
        ])
      );
    });
  });
});
