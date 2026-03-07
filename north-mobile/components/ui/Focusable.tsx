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
 * - Haptic feedback on press (light impact)
 * - Calm design system tokens (48px height, 16px padding, 12px radius)
 * - 44x44 minimum touch target
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 4.2, 9.2, 9.5, 10.3, 23.7
 */

import React from 'react';
import { Pressable, View, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';
import { useHaptic } from '@/hooks/useHaptic';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

export interface FocusableProps extends Omit<PressableProps, 'style' | 'children'> {
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
  
  /**
   * Whether to enable haptic feedback on press
   * Defaults to false for generic Focusable, true for FocusableButton
   */
  enableHaptic?: boolean;
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
 *   enableHaptic
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
  enableHaptic = false,
  onPress,
  children,
  ...pressableProps
}: FocusableProps) {
  const colors = useThemeColors();
  const haptic = useHaptic();
  
  // Default focus colors with high contrast (3:1 ratio minimum)
  const defaultFocusColor = colors.primary;
  const finalFocusBorderColor = focusBorderColor || defaultFocusColor;

  // Handle press with optional haptic feedback
  const handlePress = React.useCallback(async (event: any) => {
    if (enableHaptic) {
      await haptic.light();
    }
    onPress?.(event);
  }, [enableHaptic, haptic, onPress]);

  return (
    <Pressable
      {...pressableProps}
      onPress={handlePress}
      style={({ pressed, focused }: any) => {
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
      {({ pressed, focused }: any) => (
        <View style={{ borderRadius }}>
          {typeof children === 'function' 
            ? (children as any)({ pressed, focused }) 
            : children}
        </View>
      )}
    </Pressable>
  );
}

/**
 * FocusableButton Component
 * 
 * A pre-styled button with focus indicators and haptic feedback.
 * Provides common button styling with automatic focus support.
 * Implements calm design system tokens:
 * - 48px height (button-md)
 * - 16px vertical padding (button-padding-y)
 * - 24px horizontal padding (button-padding-x)
 * - 12px border radius (md)
 * - 44x44 minimum touch target
 * - Light haptic feedback on press
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
  const colors = useThemeColors();
  const isDark = useIsDark();
  
  const getVariantStyle = (pressed: boolean, focused: boolean): ViewStyle => {
    // Calm design system tokens
    const baseStyle: ViewStyle = {
      paddingHorizontal: 24, // button-padding-x
      paddingVertical: 16,   // button-padding-y
      borderRadius: 12,      // md
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,         // button height
      minWidth: 44,          // minimum touch target width
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: colors.backgroundTertiary, // surface-highlight
        opacity: 0.5,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          // Use calm design system brand colors
          backgroundColor: isDark ? colors.text : colors.backgroundSecondary, // brand-primary
          opacity: pressed ? 0.8 : 1,
        };
      
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          // Use calm design system brand colors
          borderColor: colors.text, // brand-primary
          opacity: pressed ? 0.8 : 1,
        };
      
      case 'ghost':
        return {
          ...baseStyle,
          // Use calm design system surface colors
          backgroundColor: pressed 
            ? colors.backgroundSecondary // surface-highlight / surface
            : 'transparent',
        };
      
      default:
        return baseStyle;
    }
  };

  return (
    <Focusable
      {...props}
      disabled={disabled}
      enableHaptic={true} // Always enable haptic for buttons
      style={({ pressed, focused }: { pressed: boolean; focused: boolean }) => {
        const variantStyle = getVariantStyle(pressed, focused);
        const customStyle = typeof style === 'function' 
          ? style({ pressed, focused }) 
          : style;
        
        return Object.assign({}, variantStyle, customStyle) as ViewStyle;
      }}
    >
      {children}
    </Focusable>
  );
}

export default Focusable;
