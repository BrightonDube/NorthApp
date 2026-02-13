/**
 * EmptyState Component
 * 
 * A meditation-inspired empty state component with calming visuals and encouraging language.
 * Implements the calm design system's empty state principles.
 * 
 * Features:
 * - Minimal illustration with breathing animation
 * - Soft accent colors (sage, lavender, sky, earth)
 * - Encouraging, gentle language
 * - Generous whitespace
 * - Optional call-to-action button
 * - Dark mode support
 * - Respects reduced motion preferences
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @example
 * ```tsx
 * // Basic empty state
 * <EmptyState
 *   title="No coaches yet"
 *   description="Your coaching journey begins here"
 * />
 * 
 * // With action button
 * <EmptyState
 *   title="No sessions"
 *   description="Ready for your first session?"
 *   action={{
 *     label: "Start Session",
 *     onPress: () => navigation.navigate('NewSession')
 *   }}
 * />
 * 
 * // With custom illustration color
 * <EmptyState
 *   title="No messages"
 *   description="Start a conversation"
 *   illustrationColor="lavender"
 * />
 * ```
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsDark } from '@/contexts/ThemeContext';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Accent color options for illustrations
 */
export type AccentColor = 'sky' | 'earth' | 'sage' | 'lavender';

/**
 * Illustration type options
 */
export type IllustrationType = 'circle' | 'wave' | 'meditation' | 'sparkle';

interface EmptyStateAction {
  /**
   * Button label text
   */
  label: string;
  
  /**
   * Button press handler
   */
  onPress: () => void;
}

interface EmptyStateProps {
  /**
   * Short, encouraging title
   */
  title: string;
  
  /**
   * Gentle, helpful description
   */
  description: string;
  
  /**
   * Optional call-to-action button
   */
  action?: EmptyStateAction;
  
  /**
   * Accent color for the illustration
   * @default 'sage'
   */
  illustrationColor?: AccentColor;
  
  /**
   * Type of illustration to display
   * @default 'circle'
   */
  illustrationType?: IllustrationType;
  
  /**
   * Whether to disable the breathing animation
   * @default false
   */
  disableAnimation?: boolean;
}

/**
 * Custom easing function for breathing animation
 * Matches the ease-breathing curve: cubic-bezier(0.45, 0.05, 0.55, 0.95)
 */
const easeBreathing = Easing.bezier(0.45, 0.05, 0.55, 0.95);

/**
 * Accent color mappings for light and dark modes
 */
const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string }> = {
  sky: {
    light: '#BAE6FD',
    dark: '#0C4A6E',
  },
  earth: {
    light: '#D6D3D1',
    dark: '#44403C',
  },
  sage: {
    light: '#D9F0E3',
    dark: '#14532D',
  },
  lavender: {
    light: '#E9D5FF',
    dark: '#581C87',
  },
};

/**
 * Get the appropriate accent color based on theme
 */
function getAccentColor(color: AccentColor, isDark: boolean): string {
  return isDark ? ACCENT_COLORS[color].dark : ACCENT_COLORS[color].light;
}

/**
 * Illustration Components
 */

interface IllustrationProps {
  color: string;
  animated: boolean;
  animatedStyle?: any;
}

/**
 * Circle illustration - Simple breathing circle
 */
function CircleIllustration({ color, animated, animatedStyle }: IllustrationProps) {
  const content = (
    <Svg width="80" height="80" viewBox="0 0 80 80">
      <Circle
        cx="40"
        cy="40"
        r="35"
        fill={color}
        opacity={0.3}
      />
      <Circle
        cx="40"
        cy="40"
        r="25"
        fill={color}
        opacity={0.5}
      />
      <Circle
        cx="40"
        cy="40"
        r="15"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  );
  
  if (animated) {
    return (
      <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
        {content}
      </Animated.View>
    );
  }
  
  return (
    <View style={styles.illustrationContainer}>
      {content}
    </View>
  );
}

/**
 * Wave illustration - Gentle wave pattern
 */
function WaveIllustration({ color, animated, animatedStyle }: IllustrationProps) {
  const content = (
    <Svg width="80" height="80" viewBox="0 0 80 80">
      <Path
        d="M10 40 Q 25 25, 40 40 T 70 40"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity={0.7}
      />
      <Path
        d="M10 50 Q 25 35, 40 50 T 70 50"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity={0.5}
      />
      <Path
        d="M10 60 Q 25 45, 40 60 T 70 60"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity={0.3}
      />
    </Svg>
  );
  
  if (animated) {
    return (
      <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
        {content}
      </Animated.View>
    );
  }
  
  return (
    <View style={styles.illustrationContainer}>
      {content}
    </View>
  );
}

/**
 * Meditation illustration - Person in meditation pose
 */
function MeditationIllustration({ color, animated, animatedStyle }: IllustrationProps) {
  const content = (
    <Svg width="80" height="80" viewBox="0 0 80 80">
      {/* Head */}
      <Circle
        cx="40"
        cy="25"
        r="10"
        fill={color}
        opacity={0.6}
      />
      {/* Body */}
      <Path
        d="M40 35 L40 50"
        stroke={color}
        strokeWidth="4"
        opacity={0.6}
      />
      {/* Legs (crossed) */}
      <Path
        d="M30 50 Q 35 55, 40 50 Q 45 55, 50 50"
        stroke={color}
        strokeWidth="4"
        fill="none"
        opacity={0.6}
      />
      {/* Arms (meditation pose) */}
      <Path
        d="M25 40 Q 30 45, 40 45 Q 50 45, 55 40"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity={0.6}
      />
      {/* Aura circle */}
      <Circle
        cx="40"
        cy="40"
        r="35"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity={0.3}
      />
    </Svg>
  );
  
  if (animated) {
    return (
      <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
        {content}
      </Animated.View>
    );
  }
  
  return (
    <View style={styles.illustrationContainer}>
      {content}
    </View>
  );
}

/**
 * Sparkle illustration - Gentle sparkle/star pattern
 */
function SparkleIllustration({ color, animated, animatedStyle }: IllustrationProps) {
  const content = (
    <Svg width="80" height="80" viewBox="0 0 80 80">
      {/* Center sparkle */}
      <Path
        d="M40 20 L42 38 L60 40 L42 42 L40 60 L38 42 L20 40 L38 38 Z"
        fill={color}
        opacity={0.7}
      />
      {/* Small sparkles */}
      <Path
        d="M25 25 L26 30 L31 31 L26 32 L25 37 L24 32 L19 31 L24 30 Z"
        fill={color}
        opacity={0.5}
      />
      <Path
        d="M55 25 L56 30 L61 31 L56 32 L55 37 L54 32 L49 31 L54 30 Z"
        fill={color}
        opacity={0.5}
      />
      <Path
        d="M25 55 L26 60 L31 61 L26 62 L25 67 L24 62 L19 61 L24 60 Z"
        fill={color}
        opacity={0.4}
      />
      <Path
        d="M55 55 L56 60 L61 61 L56 62 L55 67 L54 62 L49 61 L54 60 Z"
        fill={color}
        opacity={0.4}
      />
    </Svg>
  );
  
  if (animated) {
    return (
      <Animated.View style={[styles.illustrationContainer, animatedStyle]}>
        {content}
      </Animated.View>
    );
  }
  
  return (
    <View style={styles.illustrationContainer}>
      {content}
    </View>
  );
}

/**
 * Get the appropriate illustration component
 */
function getIllustration(
  type: IllustrationType,
  color: string,
  animated: boolean,
  animatedStyle?: any
): React.ReactNode {
  const props = { color, animated, animatedStyle };
  
  switch (type) {
    case 'wave':
      return <WaveIllustration {...props} />;
    case 'meditation':
      return <MeditationIllustration {...props} />;
    case 'sparkle':
      return <SparkleIllustration {...props} />;
    case 'circle':
    default:
      return <CircleIllustration {...props} />;
  }
}

/**
 * EmptyState Component
 * 
 * Creates a meditation-inspired empty state with calming visuals and encouraging language.
 * The illustration uses a breathing animation (scale: 1.0 → 1.05 → 1.0) over 2500ms
 * with the ease-breathing curve. The component uses generous whitespace and soft accent colors.
 * 
 * Respects user's reduced motion preferences - animations are disabled when the user
 * has enabled reduced motion in their device settings.
 */
export function EmptyState({
  title,
  description,
  action,
  illustrationColor = 'sage',
  illustrationType = 'circle',
  disableAnimation = false,
}: EmptyStateProps) {
  const isDark = useIsDark();
  const prefersReducedMotion = useReducedMotion();
  
  // Determine if animation should be active
  const shouldAnimate = !disableAnimation && !prefersReducedMotion;
  
  // Shared value for breathing animation
  const scale = useSharedValue(1);
  
  useEffect(() => {
    if (!shouldAnimate) {
      scale.value = 1;
      return;
    }
    
    // Start breathing animation
    // Scale: 1.0 → 1.05 → 1.0 (subtle breathing effect)
    scale.value = withRepeat(
      withTiming(1.05, {
        duration: 2500,
        easing: easeBreathing,
      }),
      -1, // Infinite repeat
      true // Reverse (creates the breathing in/out effect)
    );
  }, [scale, shouldAnimate]);
  
  // Animated style for the illustration
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });
  
  // Get the accent color for the current theme
  const accentColor = getAccentColor(illustrationColor, isDark);
  
  return (
    <View style={styles.container}>
      {/* Illustration with breathing animation */}
      {getIllustration(illustrationType, accentColor, shouldAnimate, animatedStyle)}
      
      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, isDark && styles.titleDark]}>
          {title}
        </Text>
        <Text style={[styles.description, isDark && styles.descriptionDark]}>
          {description}
        </Text>
      </View>
      
      {/* Optional action button */}
      {action && (
        <TouchableOpacity
          style={[styles.button, isDark && styles.buttonDark]}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32, // Generous horizontal padding
    paddingVertical: 48, // Generous vertical padding
    gap: 32, // Generous spacing between elements
  },
  illustrationContainer: {
    marginBottom: 8, // Additional space below illustration
  },
  content: {
    alignItems: 'center',
    gap: 12, // Space between title and description
    maxWidth: 320, // Constrain width for better readability
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: '#1C1917', // text-primary light
    textAlign: 'center',
  },
  titleDark: {
    color: '#FAFAF9', // text-primary dark
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: 0,
    color: '#78716C', // text-secondary light
    textAlign: 'center',
  },
  descriptionDark: {
    color: '#A8A29E', // text-secondary dark
  },
  button: {
    marginTop: 8, // Additional space above button
    paddingHorizontal: 24, // button-padding-x
    paddingVertical: 16, // button-padding-y
    minHeight: 48, // button height
    backgroundColor: '#292524', // brand-primary light
    borderRadius: 12, // md border radius
    justifyContent: 'center',
    alignItems: 'center',
    // Subtle shadow
    shadowColor: 'rgba(28, 25, 23, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDark: {
    backgroundColor: '#FAFAF9', // brand-primary dark
    shadowColor: 'rgba(250, 250, 249, 0.04)',
  },
  buttonText: {
    fontSize: 17,
    lineHeight: 17,
    fontWeight: '600',
    letterSpacing: 0,
    color: '#FAFAF9', // brand-inverse light
  },
  buttonTextDark: {
    color: '#292524', // brand-inverse dark
  },
});
