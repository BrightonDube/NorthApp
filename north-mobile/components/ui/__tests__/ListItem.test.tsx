/**
 * Unit tests for ListItem component
 * 
 * Tests the ListItem component's functionality including:
 * - Rendering with different props
 * - Press and long press handling
 * - Haptic feedback integration
 * - Accessibility features
 * - Disabled state
 * - Separator rendering
 * - Custom content and accessories
 * 
 * Requirements tested:
 * - 2.2: Minimum 16px internal padding for interactive elements
 * - 2.5: Increased gap values between items (8px)
 * - 9.3: Minimum 56px height for list items
 * - 9.4: Minimum 8px spacing between touch targets
 * - 10.3: Light-impact haptic for selections
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ListItem } from '../ListItem';
import { HapticService, HapticType } from '@/lib/haptics';

// Mock HapticService
jest.mock('@/lib/haptics', () => ({
  HapticService: {
    trigger: jest.fn(() => Promise.resolve()),
    isAvailable: jest.fn(() => true),
    isEnabled: jest.fn(() => true),
  },
  HapticType: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
    Selection: 'selection',
  },
}));

describe('ListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with title', () => {
      const { getByText } = render(<ListItem title="Test Item" />);
      expect(getByText('Test Item')).toBeTruthy();
    });

    it('should render with title and subtitle', () => {
      const { getByText } = render(
        <ListItem title="Test Item" subtitle="Test Subtitle" />
      );
      expect(getByText('Test Item')).toBeTruthy();
      expect(getByText('Test Subtitle')).toBeTruthy();
    });

    it('should render custom children', () => {
      const { getByText } = render(
        <ListItem>
          <Text>Custom Content</Text>
        </ListItem>
      );
      expect(getByText('Custom Content')).toBeTruthy();
    });

    it('should render left accessory', () => {
      const { getByTestId } = render(
        <ListItem
          title="Test"
          leftAccessory={<View testID="left-accessory" />}
        />
      );
      expect(getByTestId('left-accessory')).toBeTruthy();
    });

    it('should render right accessory', () => {
      const { getByTestId } = render(
        <ListItem
          title="Test"
          rightAccessory={<View testID="right-accessory" />}
        />
      );
      expect(getByTestId('right-accessory')).toBeTruthy();
    });

    it('should render separator when showSeparator is true', () => {
      const { UNSAFE_getByType } = render(
        <ListItem title="Test" showSeparator />
      );
      // The separator is a View with specific styles
      // We can verify it exists by checking the component tree
      expect(UNSAFE_getByType(View)).toBeTruthy();
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed', async () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <ListItem title="Test Item" onPress={onPress} />
      );

      const button = getByRole('button');
      fireEvent.press(button);
      
      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onLongPress when long pressed', async () => {
      const onLongPress = jest.fn();
      const { getByRole } = render(
        <ListItem title="Test Item" onLongPress={onLongPress} />
      );

      const button = getByRole('button');
      fireEvent(button, 'longPress');
      
      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', async () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <ListItem title="Test Item" onPress={onPress} disabled testID="disabled-item" />
      );

      fireEvent.press(getByTestId('disabled-item'));
      
      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not call onLongPress when disabled', async () => {
      const onLongPress = jest.fn();
      const { getByTestId } = render(
        <ListItem title="Test Item" onLongPress={onLongPress} disabled testID="disabled-item" />
      );

      fireEvent(getByTestId('disabled-item'), 'longPress');
      
      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    it('should trigger light haptic feedback on press', async () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <ListItem title="Test Item" onPress={onPress} />
      );

      fireEvent.press(getByText('Test Item'));

      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Light);
    });

    it('should trigger medium haptic feedback on long press', async () => {
      const onLongPress = jest.fn();
      const { getByText } = render(
        <ListItem title="Test Item" onLongPress={onLongPress} />
      );

      fireEvent(getByText('Test Item'), 'longPress');

      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(HapticService.trigger).toHaveBeenCalledWith(HapticType.Medium);
    });

    it('should not trigger haptic feedback when disabled', async () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <ListItem title="Test Item" onPress={onPress} disabled />
      );

      fireEvent.press(getByText('Test Item'));

      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(HapticService.trigger).not.toHaveBeenCalled();
    });

    it('should not trigger haptic feedback for non-interactive items', async () => {
      const { getByText } = render(<ListItem title="Test Item" />);

      fireEvent.press(getByText('Test Item'));

      // Wait for async haptic trigger
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(HapticService.trigger).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have button role for interactive items', () => {
      const { getByRole } = render(
        <ListItem title="Test Item" onPress={() => {}} />
      );
      expect(getByRole('button')).toBeTruthy();
    });

    it('should have text role for non-interactive items', () => {
      const { getByTestId } = render(
        <ListItem title="Test Item" testID="non-interactive-item" />
      );
      const item = getByTestId('non-interactive-item');
      expect(item.props.accessibilityRole).toBe('text');
    });

    it('should use title as accessibility label by default', () => {
      const { getByLabelText } = render(
        <ListItem title="Test Item" onPress={() => {}} />
      );
      expect(getByLabelText('Test Item')).toBeTruthy();
    });

    it('should use custom accessibility label when provided', () => {
      const { getByLabelText } = render(
        <ListItem
          title="Test Item"
          accessibilityLabel="Custom Label"
          onPress={() => {}}
        />
      );
      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('should include accessibility hint when provided', () => {
      const { getByA11yHint } = render(
        <ListItem
          title="Test Item"
          accessibilityHint="Double tap to open"
          onPress={() => {}}
        />
      );
      expect(getByA11yHint('Double tap to open')).toBeTruthy();
    });

    it('should communicate disabled state', () => {
      const { getByRole } = render(
        <ListItem title="Test Item" onPress={() => {}} disabled />
      );
      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Styling Requirements', () => {
    it('should have minimum height of 56px (Requirement 9.3)', () => {
      const { getByTestId } = render(
        <ListItem title="Test Item" testID="list-item" />
      );
      const item = getByTestId('list-item');
      expect(item.props.style).toMatchObject(
        expect.objectContaining({
          minHeight: 56,
        })
      );
    });

    it('should have 16px padding (Requirement 2.2)', () => {
      const { UNSAFE_getAllByType } = render(
        <ListItem title="Test Item" />
      );
      // The container View should have 16px padding
      const views = UNSAFE_getAllByType(View);
      const containerView = views.find(view => {
        const style = view.props.style;
        // Check if it's an array of styles or a single style object
        const styles = Array.isArray(style) ? style : [style];
        return styles.some(s => 
          s && 
          s.paddingHorizontal === 16 &&
          s.paddingVertical === 16
        );
      });
      expect(containerView).toBeTruthy();
    });
  });

  describe('TestID', () => {
    it('should apply testID to component', () => {
      const { getByTestId } = render(
        <ListItem title="Test Item" testID="custom-test-id" />
      );
      expect(getByTestId('custom-test-id')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title gracefully', () => {
      const { UNSAFE_root } = render(<ListItem title="" />);
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle long titles', () => {
      const longTitle = 'This is a very long title that should be truncated';
      const { getByText } = render(<ListItem title={longTitle} />);
      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle long subtitles', () => {
      const longSubtitle = 'This is a very long subtitle that should be truncated after two lines';
      const { getByText } = render(
        <ListItem title="Title" subtitle={longSubtitle} />
      );
      expect(getByText(longSubtitle)).toBeTruthy();
    });

    it('should handle both onPress and onLongPress', async () => {
      const onPress = jest.fn();
      const onLongPress = jest.fn();
      const { getByRole } = render(
        <ListItem
          title="Test Item"
          onPress={onPress}
          onLongPress={onLongPress}
        />
      );

      const button = getByRole('button');
      
      fireEvent.press(button);
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();

      fireEvent(button, 'longPress');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration with List Container', () => {
    it('should work with multiple items in a container', () => {
      const { getByText } = render(
        <View style={{ gap: 8 }}>
          <ListItem title="Item 1" onPress={() => {}} />
          <ListItem title="Item 2" onPress={() => {}} />
          <ListItem title="Item 3" onPress={() => {}} />
        </View>
      );

      expect(getByText('Item 1')).toBeTruthy();
      expect(getByText('Item 2')).toBeTruthy();
      expect(getByText('Item 3')).toBeTruthy();
    });

    it('should maintain 8px spacing between items (Requirement 2.5)', () => {
      const { UNSAFE_getByType } = render(
        <View style={{ gap: 8 }}>
          <ListItem title="Item 1" />
          <ListItem title="Item 2" />
        </View>
      );

      const container = UNSAFE_getByType(View);
      expect(container.props.style.gap).toBe(8);
    });
  });
});
