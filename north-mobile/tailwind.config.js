/** @type {import('tailwindcss').Config} */
const { hairlineWidth } = require('nativewind/theme');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Calm Design System Colors - Warm, muted palette
        // Light mode values as defaults, dark mode handled via dark: prefix
        background: {
          DEFAULT: '#FAFAF9', // Warm white (was pure white)
          dark: '#0C0A09', // Warm deep black (was #050505)
        },
        foreground: {
          DEFAULT: '#1C1917', // Warm black (was #09090B)
          dark: '#FAFAF9', // Warm white (was #FAFAFA)
        },
        surface: {
          DEFAULT: '#F5F5F4', // Soft stone (was #F4F4F5)
          dark: '#1C1917', // Warm charcoal (was #18181B)
          highlight: '#E7E5E4', // Warm gray (was #E4E4E7)
          'highlight-dark': '#292524', // Lighter warm charcoal (was #27272A)
        },
        brand: {
          primary: '#292524', // Warm charcoal (was #09090B)
          'primary-dark': '#FAFAF9', // Warm white (was #FAFAFA)
          accent: '#78716C', // Muted taupe
          'accent-dark': '#A8A29E', // Soft stone
          inverse: '#FAFAF9', // Warm white (was #FFFFFF)
          'inverse-dark': '#292524', // Warm charcoal (was #09090B)
        },
        // Text colors - Softer contrast
        'text-primary': {
          DEFAULT: '#1C1917', // Warm black (4.5:1 contrast)
          dark: '#FAFAF9', // Warm white
        },
        'text-secondary': {
          DEFAULT: '#78716C', // Muted stone (3:1 contrast)
          dark: '#A8A29E', // Soft stone
        },
        'text-tertiary': {
          DEFAULT: '#A8A29E', // Soft stone (2:1 contrast)
          dark: '#57534E', // Muted stone
        },
        // Border - Subtle boundaries
        'border-subtle': {
          DEFAULT: '#E7E5E4', // Warm gray (1.202:1 contrast with background)
          dark: '#252220', // Warm charcoal (1.250:1 contrast with background)
        },
        // Nature-inspired accent colors
        accent: {
          sky: '#BAE6FD', // Soft sky blue
          'sky-dark': '#0C4A6E', // Deep sky
          earth: '#D6D3D1', // Warm stone
          'earth-dark': '#44403C', // Deep stone
          sage: '#D9F0E3', // Soft sage green
          'sage-dark': '#14532D', // Deep sage
          lavender: '#E9D5FF', // Pale lavender
          'lavender-dark': '#581C87', // Deep lavender
        },
        // Semantic colors (fixed across themes)
        error: '#FF453A',
        success: '#30D158',
      },
      // Subtle gradient tokens for depth (max 5% luminosity difference)
      backgroundImage: {
        'gradient-calm': 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 100%)',
        'gradient-calm-dark': 'linear-gradient(180deg, #0C0A09 0%, #1C1917 100%)',
        'gradient-surface': 'linear-gradient(180deg, #F5F5F4 0%, #E7E5E4 100%)',
        'gradient-surface-dark': 'linear-gradient(180deg, #1C1917 0%, #292524 100%)',
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
        mono: ['Menlo', 'monospace'],
        display: ['System', 'sans-serif'],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      // Increased spacing scale - 25-50% increase for generous whitespace
      spacing: {
        'xs': 4,    // Minimal gap (was 2)
        'sm': 8,    // Small gap (was 4)
        'md': 16,   // Medium gap (was 12)
        'lg': 24,   // Large gap (was 16)
        'xl': 32,   // Extra large (was 24)
        '2xl': 48,  // Section spacing (was 32)
        '3xl': 64,  // Major sections (was 48)
        '4xl': 96,  // Screen spacing (was 64)
        // Component-specific spacing
        'button-padding-x': 24,  // Button horizontal padding
        'button-padding-y': 16,  // Button vertical padding
        'list-item-padding': 16, // List item padding
        'section-margin': 32,    // Section margins
        'screen-margin-x': 24,   // Screen horizontal margins
        'screen-margin-y': 32,   // Screen vertical margins
        'card-padding': 20,      // Card internal padding
        'card-padding-lg': 24,   // Large card padding
        'touch-spacing': 8,      // Minimum spacing between touch targets
      },
      // Touch target minimum sizes
      minHeight: {
        'touch': 44,           // iOS standard touch target
        'button-sm': 40,       // Small button
        'button': 48,          // Standard button
        'button-lg': 56,       // Large button
        'input': 48,           // Input field
        'list-item': 56,       // List item
        'list-item-lg': 72,    // Large list item
      },
      minWidth: {
        'touch': 44,           // iOS standard touch target
        'button-sm': 40,       // Small button
        'button': 48,          // Standard button
      },
      // Organic shape language - Increased border radius scale (8-32px)
      borderRadius: {
        'sm': 8,    // Subtle rounding (was 4)
        'md': 12,   // Standard buttons (was 8)
        'lg': 16,   // Cards, inputs (was 12)
        'xl': 20,   // Large cards (was 16)
        '2xl': 24,  // Modals (was 20)
        '3xl': 28,  // Large modals (was 24)
        '4xl': 32,  // Full-screen modals (was 28)
        'full': 9999, // Pills, circular
      },
      // Component-specific border radius guidelines
      // - Buttons: 12px (md)
      // - Input fields: 12px (md)
      // - Cards: 16px (lg)
      // - Modals: 24px (2xl)
      // - Bottom sheets: 28px top corners (3xl)
      // - Avatar images: full (circular)
      fontSize: {
        // Custom font sizes matching design system - Calm Design Refresh
        // Slightly increased for better readability with generous line heights
        'display': [34, { lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 }],
        'h1': [26, { lineHeight: 32, fontWeight: '600', letterSpacing: -0.3 }],
        'h2': [20, { lineHeight: 26, fontWeight: '500', letterSpacing: -0.2 }],
        'body': [17, { lineHeight: 26, fontWeight: '400', letterSpacing: 0 }],
        'sub': [15, { lineHeight: 22, fontWeight: '400', letterSpacing: 0 }],
        'caption': [13, { lineHeight: 18, fontWeight: '400', letterSpacing: 0 }],
        'button': [17, { lineHeight: 17, fontWeight: '600', letterSpacing: 0 }],
      },
      // Softer visual boundaries - Reduced shadow intensity with larger blur radius
      // Light mode: warm shadows with max 0.07 opacity
      // Dark mode: light-colored shadows for subtle glow effect with max 0.06 opacity
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(28, 25, 23, 0.03)',
        'sm': '0 2px 4px 0 rgba(28, 25, 23, 0.04)',
        'md': '0 4px 8px 0 rgba(28, 25, 23, 0.05)',
        'lg': '0 8px 16px 0 rgba(28, 25, 23, 0.06)',
        'xl': '0 12px 24px 0 rgba(28, 25, 23, 0.07)',
        // Dark mode shadows - subtle glows using light colors
        'xs-dark': '0 1px 2px 0 rgba(250, 250, 249, 0.02)',
        'sm-dark': '0 2px 4px 0 rgba(250, 250, 249, 0.03)',
        'md-dark': '0 4px 8px 0 rgba(250, 250, 249, 0.04)',
        'lg-dark': '0 8px 16px 0 rgba(250, 250, 249, 0.05)',
        'xl-dark': '0 12px 24px 0 rgba(250, 250, 249, 0.06)',
      },
      // Gentle animation system - Slow, fluid timing with ease-in-out curves
      // All animations use minimum 300ms for micro-interactions, max 600ms for standard transitions
      transitionDuration: {
        'fast': '200ms',      // Micro-interactions (hover, focus)
        'normal': '300ms',    // Standard transitions (minimum for calm feel)
        'slow': '400ms',      // Deliberate transitions
        'slower': '600ms',    // Emphasis transitions (maximum for standard)
        'breathing': '2500ms', // Breathing animations (loading states)
      },
      // Easing curves - Gentle, calm motion that starts and ends slowly
      transitionTimingFunction: {
        'ease-gentle': 'cubic-bezier(0.4, 0.0, 0.2, 1)',     // Gentle ease-in-out
        'ease-calm': 'cubic-bezier(0.25, 0.1, 0.25, 1)',     // Very smooth
        'ease-breathing': 'cubic-bezier(0.45, 0.05, 0.55, 0.95)', // Breathing rhythm
      },
      // Stagger animation delays - For list entrance animations
      transitionDelay: {
        'stagger-50': '50ms',   // Minimum stagger delay
        'stagger-75': '75ms',   // Medium stagger delay
        'stagger-100': '100ms', // Maximum stagger delay
      },
    },
  },
  plugins: [],
};
