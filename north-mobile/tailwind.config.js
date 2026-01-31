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
        // North Design System Colors
        // Light mode values as defaults, dark mode handled via dark: prefix
        background: {
          DEFAULT: '#FFFFFF',
          dark: '#050505',
        },
        foreground: {
          DEFAULT: '#09090B',
          dark: '#FAFAFA',
        },
        surface: {
          DEFAULT: '#F4F4F5',
          dark: '#18181B',
          highlight: '#E4E4E7',
          'highlight-dark': '#27272A',
        },
        brand: {
          primary: '#09090B',
          'primary-dark': '#FAFAFA',
          inverse: '#FFFFFF',
          'inverse-dark': '#09090B',
        },
        // Text colors
        'text-primary': {
          DEFAULT: '#09090B',
          dark: '#FAFAFA',
        },
        'text-secondary': {
          DEFAULT: '#71717A',
          dark: '#A1A1AA',
        },
        'text-tertiary': {
          DEFAULT: '#D4D4D8',
          dark: '#52525B',
        },
        // Border
        'border-subtle': {
          DEFAULT: '#E4E4E7',
          dark: '#27272A',
        },
        // Semantic colors (fixed across themes)
        error: '#FF453A',
        success: '#30D158',
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
        mono: ['Menlo', 'monospace'],
        display: ['System', 'sans-serif'],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      borderRadius: {
        '3xl': 24,
        '4xl': 32,
      },
      fontSize: {
        // Custom font sizes matching design system
        'display': [32, { lineHeight: 35, fontWeight: '700' }],
        'h1': [24, { lineHeight: 29, fontWeight: '600' }],
        'h2': [18, { lineHeight: 23, fontWeight: '500' }],
        'body': [16, { lineHeight: 24, fontWeight: '400' }],
        'sub': [14, { lineHeight: 20, fontWeight: '400' }],
        'mono-size': [13, { lineHeight: 18, fontWeight: '500' }],
        'button': [16, { lineHeight: 16, fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
