/**
 * Type declaration for @expo/vector-icons
 *
 * This module is a nested dependency installed under expo/node_modules/@expo/vector-icons.
 * TypeScript cannot resolve it automatically, so we declare the module here to suppress
 * "Cannot find module" errors and provide basic type safety for the Ionicons component.
 */
declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react';
  import type { TextProps } from 'react-native';

  /**
   * Props accepted by all icon components from @expo/vector-icons.
   * Extends React Native TextProps so icons can receive style, testID, etc.
   */
  interface IconProps extends TextProps {
    /** Icon glyph name (e.g. "chevron-back", "send", "add") */
    name: string;
    /** Icon size in points. Default varies by component. */
    size?: number;
    /** Icon color. Accepts any React Native color value. */
    color?: string;
  }

  /** Ionicons icon set – the primary icon family used in this app. */
  export const Ionicons: ComponentType<IconProps>;

  /** MaterialIcons icon set */
  export const MaterialIcons: ComponentType<IconProps>;

  /** MaterialCommunityIcons icon set */
  export const MaterialCommunityIcons: ComponentType<IconProps>;

  /** FontAwesome icon set */
  export const FontAwesome: ComponentType<IconProps>;

  /** Feather icon set */
  export const Feather: ComponentType<IconProps>;
}
