/**
 * Modal Component
 * 
 * Base modal component following the Calm Design System.
 * Features:
 * - New color tokens (warm, muted palette)
 * - 24px padding for generous whitespace
 * - 24px border radius on top corners for organic feel
 * - Soft shadow for subtle depth
 * - Fade-in entrance animation (400ms with ease-gentle)
 * - Backdrop with fade animation
 * - Keyboard avoiding view for better UX
 * - Haptic feedback on close
 * 
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 3.4, 4.4, 8.1, 8.2, 8.4
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal as RNModal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useColorScheme,
  type ModalProps as RNModalProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export interface ModalProps extends Omit<RNModalProps, 'animationType' | 'transparent'> {
  /**
   * Whether the modal is visible
   */
  visible: boolean;
  
  /**
   * Callback when modal requests to close
   */
  onClose: () => void;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Whether to show backdrop (default: true)
   */
  showBackdrop?: boolean;
  
  /**
   * Whether backdrop is dismissible (default: true)
   */
  backdropDismissible?: boolean;
  
  /**
   * Custom backdrop opacity (default: 0.5)
   */
  backdropOpacity?: number;
  
  /**
   * Whether to use keyboard avoiding view (default: true)
   */
  keyboardAvoiding?: boolean;
  
  /**
   * Additional class names for the modal container
   */
  containerClassName?: string;
  
  /**
   * Additional class names for the content wrapper
   */
  contentClassName?: string;
}

/**
 * Modal Component
 * 
 * A beautiful, accessible modal following the Calm Design System.
 * Uses fade-in animation, soft shadows, and generous spacing.
 * 
 * @example
 * ```tsx
 * <Modal
 *   visible={isVisible}
 *   onClose={() => setIsVisible(false)}
 * >
 *   <Text>Modal content</Text>
 * </Modal>
 * ```
 */
export function Modal({
  visible,
  onClose,
  children,
  showBackdrop = true,
  backdropDismissible = true,
  backdropOpacity = 0.5,
  keyboardAvoiding = true,
  containerClassName = '',
  contentClassName = '',
  ...modalProps
}: ModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;

  // Animate in/out when visibility changes
  useEffect(() => {
    if (visible) {
      // Fade in with slide up
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 400, // Deliberate transition (slow)
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, contentAnim, translateYAnim]);

  const handleBackdropPress = () => {
    if (backdropDismissible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClose();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const content = (
    <View className={`flex-1 justify-end ${containerClassName}`}>
      {/* Backdrop */}
      {showBackdrop && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: isDark ? '#000000' : '#000000',
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, backdropOpacity],
            }),
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={handleBackdropPress}
            accessibilityLabel="Close modal"
            accessibilityRole="button"
          />
        </Animated.View>
      )}

      {/* Modal Content */}
      <Animated.View
        style={{
          opacity: contentAnim,
          transform: [{ translateY: translateYAnim }],
        }}
        className={`
          bg-background dark:bg-background-dark
          rounded-t-2xl
          ${isDark ? 'shadow-lg-dark' : 'shadow-lg'}
          ${contentClassName}
        `}
      >
        <SafeAreaView edges={['bottom']}>
          {/* Content with 24px padding */}
          <View className="p-6">
            {children}
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none" // We handle animation ourselves
      onRequestClose={handleClose}
      statusBarTranslucent
      {...modalProps}
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </RNModal>
  );
}

export default Modal;
