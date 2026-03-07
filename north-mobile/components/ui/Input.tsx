/**
 * Input Component
 * 
 * A reusable text input component that applies the Calm Design System tokens.
 * Features:
 * - Warm, muted colors with subtle borders
 * - 48px height for comfortable touch targets (44x44 minimum)
 * - 16px padding for generous whitespace
 * - 12px border radius for organic shapes
 * - Accessible focus indicators
 * - Error state support
 * - Dark mode support
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 4.2, 8.3, 9.2
 */

import { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

export interface InputProps extends TextInputProps {
  /** Label text displayed above the input */
  label?: string;
  /** Error message to display below the input */
  error?: string;
  /** Helper text to display below the input when no error */
  helperText?: string;
  /** Whether the input is in an error state */
  hasError?: boolean;
  /** Additional container class names */
  containerClassName?: string;
  /** Additional label class names */
  labelClassName?: string;
}

/**
 * Input Component
 * 
 * A styled text input following the Calm Design System.
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="you@example.com"
 *   value={email}
 *   onChangeText={setEmail}
 *   keyboardType="email-address"
 *   error={emailError}
 * />
 * ```
 */
export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      helperText,
      hasError,
      containerClassName = '',
      labelClassName = '',
      className = '',
      editable = true,
      ...props
    },
    ref
  ) => {
    const colors = useThemeColors();
    const isDark = useIsDark();
    
    // Determine if input should show error state
    const showError = hasError || !!error;
    
    // Input background color based on state
    const getBackgroundColor = () => {
      if (!editable) {
        return colors.surface; // surface color for disabled
      }
      return colors.background; // background color
    };
    
    // Border color based on state
    const getBorderColor = () => {
      if (showError) {
        return colors.error; // error color
      }
      return colors.border; // border-subtle
    };
    
    // Text color based on state
    const getTextColor = () => {
      if (!editable) {
        return colors.textTertiary; // text-tertiary for disabled
      }
      return colors.text; // text-primary
    };

    return (
      <View className={containerClassName}>
        {/* Label */}
        {label && (
          <Text
            className={`text-sub font-medium mb-2 ${labelClassName}`}
            style={{
              color: colors.textSecondary, // text-secondary
            }}
          >
            {label}
          </Text>
        )}

        {/* Input Field */}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.textTertiary} // text-tertiary
          className={`text-body ${className}`}
          style={[
            styles.input,
            {
              backgroundColor: getBackgroundColor(),
              borderColor: getBorderColor(),
              color: getTextColor(),
            },
          ]}
          accessible
          accessibilityLabel={label || props.placeholder}
          accessibilityState={{
            disabled: !editable,
          }}
          {...props}
        />

        {/* Error or Helper Text */}
        {(error || helperText) && (
          <Text
            className="text-caption mt-2"
            style={{
              color: error ? colors.error : colors.textTertiary,
            }}
          >
            {error || helperText}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    // Height: 48px for comfortable touch target (exceeds 44x44 minimum)
    minHeight: 48,
    
    // Padding: 16px for generous whitespace (Requirement 2.2)
    paddingHorizontal: 16,
    paddingVertical: 12, // Slightly less vertical to maintain 48px height with border
    
    // Border radius: 12px for organic shapes (Requirement 4.2)
    borderRadius: 12,
    
    // Border: 1px with subtle color (Requirement 8.3)
    borderWidth: 1,
    
    // Font size from design system
    fontSize: 17,
    lineHeight: 26,
    
    // Ensure text is vertically centered
    textAlignVertical: 'center',
  },
});
