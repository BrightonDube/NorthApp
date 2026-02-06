/**
 * Focusable Component
 * 
 * A reusable wrapper for interactive elements that provides visible focus indicators
 * for keyboard and switch control navigation on iPad and other devices.
 * 
 * Features:
 * - Visible 2px border on focus with high contrast (3:1 ratio)
 * - Works in both light and dark modes
 * - Supports all Pressable props
 * - Maintains existing hover/press states
 * - Respects accessibility settings
 * 
 * Validates: Requirement 23.7
 */

import React from 'react';
import { Pressable, View, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';

export interface FocusableProps extends PressableProps {
  /**
   * Custom style for the container
   */
  style?: ViewStyle | ((state: { pressed: boolean; focused: boolean }) => ViewStyle);
  
  /**
   * Custom focus border color (optional)
   * Defaults to brand primary color
   */
  focusBorderColor?: string;
  
  /**
   * Border radius for the focus indicator
   * Should match the component's border radius
   */
  borderRadius?: number;
  
  /**
   * Children to render inside the focusable component
   */
  children: React.ReactNode;
}

/**
 * Focusable Component
 * 
 * Wraps any interactive element with keyboard focus support.
 * Automatically shows a visible border when focused via keyboard/switch control.
 * 
 * @example
 * ```tsx
 * <Focusable
 *   onPress={handlePress}
 *   accessibilityLabel="Submit button"
 *   borderRadius={12}
 * >
 *   <View className="bg-zinc-900 px-6 py-3 rounded-xl">
 *     <Text className="text-white">Submit</Text>
 *   </View>
 * </Focusable>
 * ```
 */
export function Focusable({
  style,
  focusBorderColor,
  borderRadius = 12,
  children,
  ...pressableProps
}: FocusableProps) {
  const colorScheme = useColorScheme();
  
  // Default focus colors with high contrast (3:1 ratio minimum)
  const defaultFocusColor = colorScheme === 'dark' ? '#60A5FA' : '#2563EB'; // Blue-400 / Blue-600
  const finalFocusBorderColor = focusBorderColor || defaultFocusColor;

  return (
    <Pressable
      {...pressableProps}
      style={({ pressed, focused }) => {
        const baseStyle = typeof style === 'function' 
          ? style({ pressed, focused }) 
          : style;

        // Add focus border when focused
        const focusStyle: ViewStyle = focused ? {
          borderWidth: 2,
          borderColor: finalFocusBorderColor,
          borderRadius,
        } : {};

        return [baseStyle, focusStyle];
      }}
    >
      {({ pressed, focused }) => (
        <View style={{ borderRadius }}>
          {typeof children === 'function' 
            ? children({ pressed, focused }) 
            : children}
        </View>
      )}
    </Pressable>
  );
}

/**
 * FocusableButton Component
 * 
 * A pre-styled button with focus indicators.
 * Provides common button styling with automatic focus support.
 * 
 * @example
 * ```tsx
 * <FocusableButton
 *   onPress={handleSubmit}
 *   variant="primary"
 *   accessibilityLabel="Submit form"
 * >
 *   Submit
 * </FocusableButton>
 * ```
 */
export interface FocusableButtonProps extends Omit<FocusableProps, 'children'> {
  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'ghost';
  
  /**
   * Button text or custom content
   */
  children: React.ReactNode;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

export function FocusableButton({
  variant = 'primary',
  disabled = false,
  children,
  style,
  ...props
}: FocusableButtonProps) {
  const colorScheme = useColorScheme();
  
  const getVariantStyle = (pressed: boolean, focused: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44, // Minimum touch target
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: colorScheme === 'dark' ? '#27272A' : '#E4E4E7',
        opacity: 0.5,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: colorScheme === 'dark' ? '#FAFAFA' : '#09090B',
          opacity: pressed ? 0.8 : 1,
        };
      
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? '#FAFAFA' : '#09090B',
          opacity: pressed ? 0.8 : 1,
        };
      
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: pressed ? (colorScheme === 'dark' ? '#27272A' : '#F4F4F5') : 'transparent',
        };
      
      default:
        return baseStyle;
    }
  };

  return (
    <Focusable
      {...props}
      disabled={disabled}
      style={({ pressed, focused }) => {
        const variantStyle = getVariantStyle(pressed, focused);
        const customStyle = typeof style === 'function' 
          ? style({ pressed, focused }) 
          : style;
        
        return [variantStyle, customStyle];
      }}
    >
      {children}
    </Focusable>
  );
}

export default Focusable;
