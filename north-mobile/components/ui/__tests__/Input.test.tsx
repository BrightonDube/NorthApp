/**
 * Input Component Tests
 * 
 * Tests for the Input component following the Calm Design System.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 4.2, 8.3, 9.2
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render input with label', () => {
      render(<Input label="Email" placeholder="you@example.com" />);
      expect(screen.getByText('Email')).toBeTruthy();
    });

    it('should render input with helper text', () => {
      render(
        <Input
          placeholder="Enter text"
          helperText="This is a helper message"
        />
      );
      expect(screen.getByText('This is a helper message')).toBeTruthy();
    });

    it('should render input with error message', () => {
      render(<Input placeholder="Enter text" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeTruthy();
    });

    it('should prioritize error over helper text', () => {
      render(
        <Input
          placeholder="Enter text"
          error="Error message"
          helperText="Helper message"
        />
      );
      expect(screen.getByText('Error message')).toBeTruthy();
      expect(screen.queryByText('Helper message')).toBeNull();
    });
  });

  describe('Calm Design System - Spacing (Requirement 2.2)', () => {
    it('should have minimum 48px height for touch target', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      // Check minHeight is at least 48px (exceeds 44x44 minimum)
      const minHeight = Array.isArray(styles)
        ? styles.find((s) => s?.minHeight)?.minHeight
        : styles?.minHeight;
      
      expect(minHeight).toBeGreaterThanOrEqual(48);
    });

    it('should have 16px horizontal padding', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const paddingHorizontal = Array.isArray(styles)
        ? styles.find((s) => s?.paddingHorizontal)?.paddingHorizontal
        : styles?.paddingHorizontal;
      
      expect(paddingHorizontal).toBe(16);
    });
  });

  describe('Calm Design System - Border Radius (Requirement 4.2)', () => {
    it('should have 12px border radius', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const borderRadius = Array.isArray(styles)
        ? styles.find((s) => s?.borderRadius)?.borderRadius
        : styles?.borderRadius;
      
      expect(borderRadius).toBe(12);
    });
  });

  describe('Calm Design System - Subtle Borders (Requirement 8.3)', () => {
    it('should have 1px border width', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const borderWidth = Array.isArray(styles)
        ? styles.find((s) => s?.borderWidth)?.borderWidth
        : styles?.borderWidth;
      
      expect(borderWidth).toBe(1);
    });

    it('should use subtle border color in light mode', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const borderColor = Array.isArray(styles)
        ? styles.find((s) => s?.borderColor)?.borderColor
        : styles?.borderColor;
      
      // Should use border-subtle color (#E7E5E4 in light mode)
      expect(borderColor).toBe('#E7E5E4');
    });
  });

  describe('Touch Target (Requirement 9.2)', () => {
    it('should meet 44x44 minimum touch target size', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const minHeight = Array.isArray(styles)
        ? styles.find((s) => s?.minHeight)?.minHeight
        : styles?.minHeight;
      
      // 48px height exceeds the 44x44 minimum requirement
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  describe('States', () => {
    it('should show error state with error border color', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" error="Error message" />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const borderColor = Array.isArray(styles)
        ? styles.find((s) => s?.borderColor)?.borderColor
        : styles?.borderColor;
      
      expect(borderColor).toBe('#FF453A'); // error color
    });

    it('should be disabled when editable is false', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" editable={false} />
      );
      const input = getByPlaceholderText('Test input');
      
      expect(input.props.editable).toBe(false);
    });

    it('should have disabled styling when not editable', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" editable={false} />
      );
      const input = getByPlaceholderText('Test input');
      const styles = input.props.style;
      
      const backgroundColor = Array.isArray(styles)
        ? styles.find((s) => s?.backgroundColor)?.backgroundColor
        : styles?.backgroundColor;
      
      // Should use surface color for disabled state
      expect(backgroundColor).toBe('#F5F5F4');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" label="Email" />
      );
      const input = getByPlaceholderText('Test input');
      
      expect(input.props.accessible).toBe(true);
    });

    it('should use label as accessibility label', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" label="Email Address" />
      );
      const input = getByPlaceholderText('Test input');
      
      expect(input.props.accessibilityLabel).toBe('Email Address');
    });

    it('should use placeholder as accessibility label when no label', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter your email" />
      );
      const input = getByPlaceholderText('Enter your email');
      
      expect(input.props.accessibilityLabel).toBe('Enter your email');
    });

    it('should indicate disabled state in accessibility', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Test input" editable={false} />
      );
      const input = getByPlaceholderText('Test input');
      
      expect(input.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Props forwarding', () => {
    it('should forward TextInput props', () => {
      const onChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <Input
          placeholder="Test input"
          value="test value"
          onChangeText={onChangeText}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      );
      const input = getByPlaceholderText('Test input');
      
      expect(input.props.value).toBe('test value');
      expect(input.props.onChangeText).toBe(onChangeText);
      expect(input.props.keyboardType).toBe('email-address');
      expect(input.props.autoCapitalize).toBe('none');
    });
  });
});
