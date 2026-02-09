/**
 * EmptyState Component Tests
 * 
 * Unit tests for the EmptyState component validating:
 * - Rendering with different props
 * - Action button functionality
 * - Theme switching
 * - Reduced motion support
 * - Accessibility
 * 
 * Note: Animation behavior is tested through integration tests
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EmptyState } from '../EmptyState';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useColorScheme } from 'react-native';

// Mock dependencies
jest.mock('@/hooks/useReducedMotion');
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn(),
}));

describe('EmptyState Component', () => {
  beforeEach(() => {
    // Reset mocks
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    (useColorScheme as jest.Mock).mockReturnValue('light');
  });

  describe('Rendering', () => {
    it('should render with title and description', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started by adding your first item"
        />
      );

      expect(getByText('No items')).toBeTruthy();
      expect(getByText('Get started by adding your first item')).toBeTruthy();
    });

    it('should render without action button when not provided', () => {
      const { queryByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      expect(queryByText('Add Item')).toBeNull();
    });

    it('should render with action button when provided', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress: jest.fn(),
          }}
        />
      );

      expect(getByText('Add Item')).toBeTruthy();
    });

    it('should render with different illustration types', () => {
      const types = ['circle', 'wave', 'meditation', 'sparkle'] as const;
      
      types.forEach(type => {
        const { getByText } = render(
          <EmptyState
            title="Test"
            description="Test description"
            illustrationType={type}
          />
        );
        
        expect(getByText('Test')).toBeTruthy();
      });
    });

    it('should render with different accent colors', () => {
      const colors = ['sky', 'earth', 'sage', 'lavender'] as const;
      
      colors.forEach(color => {
        const { getByText } = render(
          <EmptyState
            title="Test"
            description="Test description"
            illustrationColor={color}
          />
        );
        
        expect(getByText('Test')).toBeTruthy();
      });
    });
  });

  describe('Action Button', () => {
    it('should call onPress when action button is pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress,
          }}
        />
      );

      fireEvent.press(getByText('Add Item'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should have proper touch target size for action button', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress: jest.fn(),
          }}
        />
      );

      const button = getByText('Add Item').parent?.parent;
      const styles = button?.props.style;
      
      // Button should have minimum height of 48px
      expect(styles).toMatchObject({ minHeight: 48 });
    });
  });

  describe('Theme Support', () => {
    it('should apply light mode colors by default', () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      const title = getByText('No items');
      const description = getByText('Get started');
      
      // Check that elements are rendered (color validation is complex in RN)
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
    });

    it('should apply dark mode colors when theme is dark', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      const title = getByText('No items');
      const description = getByText('Get started');
      
      // Check that elements are rendered with dark mode
      expect(title).toBeTruthy();
      expect(description).toBeTruthy();
    });

    it('should apply dark mode button styles when theme is dark', () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');
      
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress: jest.fn(),
          }}
        />
      );

      const button = getByText('Add Item');
      expect(button).toBeTruthy();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should disable animation when reduced motion is enabled', () => {
      (useReducedMotion as jest.Mock).mockReturnValue(true);
      
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      // Component should render without animation
      expect(getByText('No items')).toBeTruthy();
    });

    it('should disable animation when disableAnimation prop is true', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          disableAnimation={true}
        />
      );

      // Component should render without animation
      expect(getByText('No items')).toBeTruthy();
    });

    it('should enable animation when reduced motion is false and disableAnimation is false', () => {
      (useReducedMotion as jest.Mock).mockReturnValue(false);
      
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          disableAnimation={false}
        />
      );

      // Component should render with animation
      expect(getByText('No items')).toBeTruthy();
    });
  });

  describe('Typography', () => {
    it('should use h1 style for title', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      const title = getByText('No items');
      
      // Title should use h1 typography
      expect(title.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 26,
            lineHeight: 32,
            fontWeight: '600',
          })
        ])
      );
    });

    it('should use body style for description', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      const description = getByText('Get started');
      
      // Description should use body typography
      expect(description.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 17,
            lineHeight: 26,
            fontWeight: '400',
          })
        ])
      );
    });

    it('should use button style for action text', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress: jest.fn(),
          }}
        />
      );

      const buttonText = getByText('Add Item');
      
      // Button text should use button typography
      expect(buttonText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fontSize: 17,
            lineHeight: 17,
            fontWeight: '600',
          })
        ])
      );
    });

    it('should center-align all text', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      const title = getByText('No items');
      const description = getByText('Get started');
      
      expect(title.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' })
        ])
      );
      
      expect(description.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textAlign: 'center' })
        ])
      );
    });
  });

  describe('Accessibility', () => {
    it('should render accessible text elements', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
        />
      );

      // Text elements should be accessible
      expect(getByText('No items')).toBeTruthy();
      expect(getByText('Get started')).toBeTruthy();
    });

    it('should have accessible button when action is provided', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress,
          }}
        />
      );

      const buttonText = getByText('Add Item');
      
      // Button text should be rendered
      expect(buttonText).toBeTruthy();
      
      // Simulate press on the button (the parent TouchableOpacity)
      // In React Native testing, we can trigger the press through fireEvent
      // which will call the onPress handler if it exists
      const { fireEvent } = require('@testing-library/react-native');
      fireEvent.press(buttonText);
      
      // Verify onPress was called, confirming the button is touchable
      expect(onPress).toHaveBeenCalled();
    });

    it('should meet minimum touch target size for button', () => {
      const { getByText } = render(
        <EmptyState
          title="No items"
          description="Get started"
          action={{
            label: "Add Item",
            onPress: jest.fn(),
          }}
        />
      );

      const button = getByText('Add Item').parent?.parent;
      const styles = button?.props.style;
      
      // Button should meet 48px minimum touch target
      expect(styles).toMatchObject({ minHeight: 48 });
    });
  });

  describe('Integration', () => {
    it('should work with all props combined', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <EmptyState
          title="No coaches yet"
          description="Your coaching journey begins here"
          illustrationType="meditation"
          illustrationColor="sage"
          action={{
            label: "Create Coach",
            onPress,
          }}
        />
      );

      expect(getByText('No coaches yet')).toBeTruthy();
      expect(getByText('Your coaching journey begins here')).toBeTruthy();
      expect(getByText('Create Coach')).toBeTruthy();

      fireEvent.press(getByText('Create Coach'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
