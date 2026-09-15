import type { Config } from 'tailwindcss';
import { colors, typography, radius, shadows, breakpoints, spacing } from './src/styles/theme';

export default {
  // Point-Fix: was missing entirely — Tailwind defaults to the 'media'
  // strategy without this, meaning `dark:` classes only ever activated
  // based on the OS/browser's color-scheme preference, completely
  // ignoring ThemeContext's manual toggle (which just adds/removes a
  // `dark` class on <html>). This is why the light/dark switch button
  // appeared to do nothing.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: breakpoints,
    extend: {
      colors: {
        orange: colors.orange,
        pink: colors.pink,
        yellow: colors.yellow,
        navy: colors.navy,
        cream: colors.cream,
        teal: colors.teal,
        success: colors.success,
        danger: colors.danger,
        ink: colors.navy,
      },
      fontFamily: {
        display: typography.fontDisplay.split(',').map((f) => f.trim().replace(/'/g, '')),
        body: typography.fontBody.split(',').map((f) => f.trim().replace(/'/g, '')),
      },
      fontSize: typography.scale,
      borderRadius: radius,
      boxShadow: shadows,
      spacing: {
        section: spacing.section.y,
        'section-mobile': spacing.section.yMobile,
        gutter: spacing.gutter,
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF6A1F 0%, #F9436E 60%, #EC2A78 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;