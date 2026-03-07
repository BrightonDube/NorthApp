/**
 * North Logo Component
 * 
 * Displays the North logo from assets.
 * Uses the logo.png image file for consistent branding across the app.
 */

import * as React from 'react';
import { Image, ImageStyle } from 'react-native';

export interface LogoProps {
  /**
   * Size of the logo (width and height)
   * @default 80
   */
  size?: number;
  
  /**
   * Optional style overrides
   */
  style?: ImageStyle;
}

/**
 * North Logo
 * 
 * Displays the logo image from assets/logo.png
 * 
 * @example
 * ```tsx
 * // Default usage
 * <Logo />
 * 
 * // Custom size
 * <Logo size={120} />
 * ```
 */
export const Logo: React.FC<LogoProps> = ({ 
  size = 80,
  style,
}) => {
  return (
    <Image
      source={require('@/assets/logo.png')}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        style,
      ]}
      accessibilityLabel="North logo"
    />
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
export const LogoLarge: React.FC<Omit<LogoProps, 'size'>> = (props) => (
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
export const LogoSmall: React.FC<Omit<LogoProps, 'size'>> = (props) => (
  <Logo size={40} {...props} />
);

