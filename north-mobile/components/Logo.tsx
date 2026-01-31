/**
 * North Logo Component
 * 
 * Minimalist geometric logo representing:
 * - The Needle (Top): Pointing upward for growth and guidance
 * - The Base (Bottom): Grounded foundation representing user context
 * - The Axis: Connection between AI and human
 * 
 * Design: Swiss-style geometry, monochromatic, scalable
 * Platform-aware: Uses react-native-svg for native, inline SVG for web
 */

import * as React from 'react';
import { Platform } from 'react-native';

export interface LogoProps {
  /**
   * Primary color for the logo
   * @default "#09090B" (Zinc-950)
   */
  color?: string;
  
  /**
   * Size of the logo (width and height)
   * @default 80
   */
  size?: number;
}

/**
 * North Logo - Precision Compass Design
 * 
 * A minimalist logo combining geometric elements:
 * - Upward needle for guidance and direction
 * - Grounded base for context and foundation
 * - Subtle axis connecting the elements
 * 
 * @example
 * ```tsx
 * // Default usage
 * <Logo />
 * 
 * // Custom size and color
 * <Logo size={120} color="#3B82F6" />
 * 
 * // Dark mode
 * <Logo color="#FAFAFA" />
 * ```
 */
export const Logo: React.FC<LogoProps> = ({ 
  color = '#09090B', 
  size = 80,
}) => {
  // For web, use inline SVG to avoid react-native-svg issues
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        style={{ display: 'inline-block' }}
      >
        {/* The Base (Context/Foundation) - Subtle transparency */}
        <path
          d="M256 460L160 316H256V460Z"
          fill={color}
          fillOpacity={0.6}
        />
        
        {/* The Needle (North/AI/Guidance) - Solid */}
        <path
          d="M256 52L352 196H256V52Z"
          fill={color}
        />
        
        {/* The Axis (System/Connection) - Very subtle */}
        <rect
          x="254"
          y="180"
          width="4"
          height="152"
          fill={color}
          fillOpacity={0.2}
        />
      </svg>
    );
  }

  // For native platforms, use react-native-svg
  const Svg = require('react-native-svg').default;
  const Path = require('react-native-svg').Path;
  const Rect = require('react-native-svg').Rect;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
    >
      {/* The Base (Context/Foundation) - Subtle transparency */}
      <Path
        d="M256 460L160 316H256V460Z"
        fill={color}
        fillOpacity={0.6}
      />
      
      {/* The Needle (North/AI/Guidance) - Solid */}
      <Path
        d="M256 52L352 196H256V52Z"
        fill={color}
      />
      
      {/* The Axis (System/Connection) - Very subtle */}
      <Rect
        x="254"
        y="180"
        width="4"
        height="152"
        fill={color}
        fillOpacity={0.2}
      />
    </Svg>
  );
};

/**
 * Logo variant for splash screens and large displays
 * 
 * @example
 * ```tsx
 * <LogoLarge />
 * ```
 */
export const LogoLarge: React.FC<LogoProps> = (props) => (
  <Logo size={160} {...props} />
);

/**
 * Logo variant for small icons and buttons
 * 
 * @example
 * ```tsx
 * <LogoSmall />
 * ```
 */
export const LogoSmall: React.FC<LogoProps> = (props) => (
  <Logo size={40} {...props} />
);

/**
 * Logo with light color for dark backgrounds
 * 
 * @example
 * ```tsx
 * <LogoLight />
 * ```
 */
export const LogoLight: React.FC<Omit<LogoProps, 'color'>> = (props) => (
  <Logo color="#FAFAFA" {...props} />
);

/**
 * Logo with dark color for light backgrounds
 * 
 * @example
 * ```tsx
 * <LogoDark />
 * ```
 */
export const LogoDark: React.FC<Omit<LogoProps, 'color'>> = (props) => (
  <Logo color="#09090B" {...props} />
);
