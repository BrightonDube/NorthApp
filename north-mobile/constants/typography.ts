/**
 * Typography Constants
 * 
 * Centralized typography definitions following the North Design System.
 * 
 * Usage:
 * ```tsx
 * import { Typography } from '@/constants/typography';
 * 
 * <Text style={Typography.h1}>Screen Title</Text>
 * ```
 */

export const Typography = {
  // Display - Onboarding headings only
  display: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 35,
    letterSpacing: -0.5,
  },
  
  // H1 - Screen titles
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  
  // H2 - Section headers
  h2: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  
  // H3 - Subsection headers
  h3: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  
  // Body - Chat messages, Settings
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  
  // Body Small
  bodySmall: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  
  // Sub - Metadata, Captions
  sub: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Caption - Very small text
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  
  // Button text
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  
  // Button Small
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
  
  // Label - Form labels, section titles
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  
  // Label Small - Uppercase section headers
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
};

/**
 * Font weights for easy reference
 */
export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export default Typography;
