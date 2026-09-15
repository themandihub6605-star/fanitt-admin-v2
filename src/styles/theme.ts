/**
 * ─────────────────────────────────────────────────────────────
 *  FANITT DESIGN SYSTEM — SINGLE SOURCE OF TRUTH
 * ─────────────────────────────────────────────────────────────
 *  Every color, font, spacing, radius and shadow used anywhere
 *  in the app should be derived from this file. Tailwind reads
 *  these tokens via tailwind.config.ts — change a value here
 *  and it propagates everywhere automatically.
 * ───────────────────────────────────────────────────────────── */

export const colors = {
  // Brand core (from Fanitt identity) — orange -> pink gradient system
  orange: {
    50: '#FFF3EE',
    100: '#FFE1D3',
    200: '#FFC1A6',
    300: '#FF9C74',
    400: '#FF7A45',
    500: '#FF5A1F', // primary
    600: '#E6470E',
    700: '#BD380B',
    800: '#8F2C0C',
    900: '#6B2109',
  },
  pink: {
    50: '#FFF0F6',
    100: '#FFD9E8',
    200: '#FFADCE',
    300: '#FF7FB4',
    400: '#F94F94',
    500: '#EC2A78', // secondary gradient stop
    600: '#C81C63',
    700: '#9E1550',
    800: '#750F3B',
    900: '#4E0A28',
  },
  yellow: {
    50: '#FFFBEF',
    100: '#FFF4CF',
    200: '#FFEA9F',
    300: '#FFDE7A',
    400: '#FFD65C',
    500: '#F5C42E',
    600: '#D9A616',
  },
  // "navy" kept as an alias scale but repointed to near-black ink tones
  // to match the reference UI's flat dark theme (not a navy/blue tint).
  navy: {
    50: '#F1F1F1',
    100: '#DADADA',
    200: '#B3B3B3',
    300: '#8A8A8A',
    400: '#5C5C5C',
    500: '#3A3A3A',
    600: '#262626',
    700: '#1A1A1A', // base card
    800: '#141414',
    900: '#0A0A0A', // app background
  },
  cream: {
    DEFAULT: '#FFF8EC',
    soft: '#FFFCF6',
    deep: '#FBEFDA',
  },
  teal: {
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
  },
  white: '#FFFFFF',
  success: '#1FAA6D',
  danger: '#E5484D',
} as const;

export const typography = {
  fontDisplay: "'Poppins', system-ui, sans-serif",
  fontBody: "'Poppins', system-ui, sans-serif",
  scale: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  },
} as const;

export const spacing = {
  section: {
    y: '6rem',       // vertical rhythm between sections (desktop)
    yMobile: '3.5rem',
  },
  gutter: '1.5rem',
} as const;

export const radius = {
  sm: '0.5rem',
  md: '0.875rem',
  lg: '1.25rem',
  xl: '1.75rem',
  '2xl': '2.25rem',
  full: '9999px',
} as const;

export const shadows = {
  soft: '0 2px 8px rgba(35, 39, 66, 0.06)',
  card: '0 8px 24px rgba(35, 39, 66, 0.08)',
  lifted: '0 20px 45px rgba(35, 39, 66, 0.14)',
  glow: '0 0 0 1px rgba(255, 90, 31, 0.18), 0 8px 30px rgba(236, 42, 120, 0.25)',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
} as const;

export const animation = {
  fast: '150ms',
  base: '250ms',
  slow: '450ms',
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

const theme = { colors, typography, spacing, radius, shadows, breakpoints, animation };
export default theme;
