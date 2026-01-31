/** @type {import('tailwindcss').Config} */
const { hairlineWidth } = require('nativewind/theme');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens - these reference CSS variables
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        surface: {
          DEFAULT: 'var(--surface)',
          highlight: 'var(--surface-highlight)',
        },
        brand: {
          primary: 'var(--brand-primary)',
          inverse: 'var(--brand-inverse)',
        },
        // Text colors
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        // Border
        'border-subtle': 'var(--border-subtle)',
        // Semantic colors (fixed across themes)
        error: '#FF453A',
        success: '#30D158',
      },
      fontFamily: {
        sans: ['SF Pro Text', 'Inter', 'System', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
        display: ['SF Pro Display', 'Inter', 'System', 'sans-serif'],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      fontSize: {
        // Custom font sizes matching design system
        'display': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
        'h1': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        'h2': ['18px', { lineHeight: '1.3', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'sub': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'mono': ['13px', { lineHeight: '1.4', fontWeight: '500' }],
        'button': ['16px', { lineHeight: '1.0', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
