/**
 * ListItem Component
 * 
 * A reusable list item component following the calm design refresh principles.
 * Provides consistent spacing, touch targets, and haptic feedback.
 * 
 * Features:
 * - 56px minimum height for comfortable touch targets
 * - 16px padding for generous whitespace
 * - Light haptic feedback on press
 * - Accessible with proper ARIA labels
 * - Supports custom content and actions
 * 
 * Requirements:
 * - 2.2: Minimum 16px internal padding for interactive elements
 * - 2.5: Increased gap values between items (8px)
 * - 9.3: Minimum 56px height for list items
 * - 9.4: Minimum 8px spacing between touch targets
 * - 10.3: Light-impact haptic for selections
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { HapticService, HapticType } from '@/lib/haptics';
import { useThemeColors, useIsDark } from '@/contexts/ThemeContext';

export interface ListItemProps {
  /**
   * Main content to display in the list item
   */
  children?: React.ReactNode;
  
  /**
   * Optional title text (alternative to children)
   */
  title?: string;
  
  /**
   * Optional subtitle text
   */
  subtitle?: string;
  
  /**
   * Optional left accessory (icon, avatar, etc.)
   */
  leftAccessory?: React.ReactNode;
  
  /**
   * Optional right accessory (chevron, badge, etc.)
   */
  rightAccessory?: React.ReactNode;
  
  /**
   * Press handler
   */
  onPress?: () => void;
  
  /**
   * Long press handler
   */
  onLongPress?: () => void;
  
  /**
   * Whether the item is disabled
   */
  disabled?: boolean;
  
  /**
   * Whether to show a separator line at the bottom
   */
  showSeparator?: boolean;
  
  /**
   * Test ID for testing
   */
  testID?: string;
  
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
  
  /**
   * Accessibility hint
   */
  accessibilityHint?: string;
}

/**
 * ListItem component for displaying items in lists with consistent styling.
 * 
 * Follows calm design principles:
 * - Generous spacing (56px height, 16px padding)
 * - Subtle haptic feedback on press
 * - Accessible touch targets (44x44 minimum)
 * - Clean, minimal design
 * 
 * @example
 * ```tsx
 * // Simple text item
 * <ListItem title="Settings" onPress={() => navigate('/settings')} />
 * 
 * // With subtitle
 * <ListItem 
 *   title="Notifications" 
 *   subtitle="Manage your notification preferences"
 *   onPress={() => navigate('/notifications')}
 * />
 * 
 * // With accessories
 * <ListItem 
 *   title="Profile"
 *   leftAccessory={<Avatar />}
 *   rightAccessory={<ChevronRight />}
 *   onPress={() => navigate('/profile')}
 * />
 * 
 * // Custom content
 * <ListItem onPress={() => handleAction()}>
 *   <View>
 *     <Text>Custom Content</Text>
 *   </View>
 * </ListItem>
 * ```
 */
export function ListItem({
  children,
  title,
  subtitle,
  leftAccessory,
  rightAccessory,
  onPress,
  onLongPress,
  disabled = false,
  showSeparator = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: ListItemProps) {
  const colors = useThemeColors();
  const isDark = useIsDark();
  
  const handlePress = async () => {
    if (disabled || !onPress) return;
    
    // Trigger light haptic feedback for selection
    await HapticService.trigger(HapticType.Light);
    onPress();
  };
  
  const handleLongPress = async () => {
    if (disabled || !onLongPress) return;
    
    // Trigger medium haptic feedback for long press
    await HapticService.trigger(HapticType.Medium);
    onLongPress();
  };
  
  // Determine if this is an interactive item (has press handlers, even if disabled)
  const isInteractive = onPress || onLongPress;
  
  // Build accessibility label
  const a11yLabel = accessibilityLabel || title || 'List item';
  
  const content = (
    <View 
      style={[
        styles.container,
        showSeparator && styles.withSeparator,
      ]}
    >
      {/* Left accessory */}
      {leftAccessory && (
        <View style={styles.leftAccessory}>
          {leftAccessory}
        </View>
      )}
      
      {/* Main content */}
      <View style={styles.content}>
        {children ? (
          children
        ) : (
          <>
            {title && (
              <Text 
                style={[
                  styles.title,
                  { color: colors.text },
                  disabled && styles.titleDisabled,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text 
                style={[
                  styles.subtitle,
                  { color: colors.textSecondary },
                  disabled && styles.subtitleDisabled,
                ]}
                numberOfLines={2}
              >
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
      
      {/* Right accessory */}
      {rightAccessory && (
        <View style={styles.rightAccessory}>
          {rightAccessory}
        </View>
      )}
      
      {/* Separator */}
      {showSeparator && (
        <View 
          style={[
            styles.separator,
            { backgroundColor: colors.border },
          ]} 
        />
      )}
    </View>
  );
  
  // If interactive, wrap in Pressable
  if (isInteractive) {
    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.pressable,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {({ pressed }) => (
          <View style={[pressed && !disabled && styles.pressedContent]}>
            {content}
          </View>
        )}
      </Pressable>
    );
  }
  
  // Non-interactive item
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      testID={testID}
      style={styles.pressable}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    // Ensure minimum touch target of 44x44
    minHeight: 56, // Requirement 9.3: Minimum 56px height for list items
  },
  pressed: {
    opacity: 0.7,
  },
  pressedContent: {
    opacity: 0.7,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56, // Requirement 9.3: Minimum 56px height
    paddingHorizontal: 16, // Requirement 2.2: Minimum 16px padding
    paddingVertical: 16, // Requirement 2.2: Minimum 16px padding
    backgroundColor: 'transparent',
  },
  withSeparator: {
    position: 'relative',
  },
  leftAccessory: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  rightAccessory: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
  },
  titleDisabled: {
    opacity: 0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    marginTop: 2,
  },
  subtitleDisabled: {
    opacity: 0.5,
  },
  separator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 0,
    height: 1,
  },
});

export default ListItem;
