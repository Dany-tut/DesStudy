/**
 * DesStudy — Design Tokens (Single Source of Truth)
 * ==================================================
 * PROJECT_BIBLE Chapter 3 — UX/UI Bible, expressed in code.
 *
 * RULES (enforced by convention + Tailwind config):
 *   1. No magic numbers anywhere in the app. Every size, space, radius,
 *      duration and color MUST come from this file (directly or via Tailwind).
 *   2. Spacing follows an 8pt grid (with a 4pt half-step for fine control).
 *   3. Typography uses the SF Pro stack and a fixed modular scale.
 *   4. Colors are semantic tokens, never raw hex, in components.
 *
 * If a value you need is not here — add it here first, then use it.
 */

// ─────────────────────────────────────────────────────────────
// SPACING — 8pt grid (4pt half-step). Key = multiples for clarity.
// ─────────────────────────────────────────────────────────────
export const space = {
  0: '0px',
  0.5: '2px', // hairline only
  1: '4px', // half-step
  2: '8px', // base unit
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const;

// ─────────────────────────────────────────────────────────────
// RADIUS — consistent corner scale.
// ─────────────────────────────────────────────────────────────
export const radius = {
  none: '0px',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  '2xl': '28px',
  full: '9999px',
} as const;

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY — SF Pro stack + modular scale.
// ─────────────────────────────────────────────────────────────
export const fontFamily = {
  // System SF Pro on Apple, graceful fallbacks elsewhere.
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"SF Pro Text"',
    '"SF Pro Display"',
    'Inter',
    'system-ui',
    'sans-serif',
  ].join(', '),
  mono: ['"SF Mono"', 'ui-monospace', 'Menlo', 'monospace'].join(', '),
} as const;

/** [fontSize, lineHeight, letterSpacing] */
export const fontSize = {
  caption: ['12px', '16px', '0'],
  footnote: ['13px', '18px', '0'],
  body: ['15px', '22px', '-0.01em'],
  callout: ['16px', '24px', '-0.01em'],
  title3: ['20px', '26px', '-0.015em'],
  title2: ['24px', '30px', '-0.02em'],
  title1: ['32px', '38px', '-0.02em'],
  display: ['44px', '50px', '-0.03em'],
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ─────────────────────────────────────────────────────────────
// COLOR — semantic tokens. Raw palette is private; components use
// semantic names only. Values are HSL-friendly hex, tuned for calm/premium.
// Light + dark provided; wired to CSS variables in globals.css.
// ─────────────────────────────────────────────────────────────
export const palette = {
  // Neutral ramp (cool gray)
  gray50: '#F7F8FA',
  gray100: '#EEF0F4',
  gray200: '#E1E4EB',
  gray300: '#C9CDD8',
  gray400: '#9AA0AE',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#343A46',
  gray800: '#20242C',
  gray900: '#14171C',
  gray950: '#0B0D11',
  white: '#FFFFFF',
  black: '#000000',
  // Brand — calm indigo/blue
  brand400: '#7C8CFF',
  brand500: '#5B6EF5',
  brand600: '#4557E0',
  // Feedback
  success: '#2FB57C',
  warning: '#E5A13A',
  danger: '#E5484D',
  info: '#3E8FF0',
} as const;

/** Semantic color tokens — the ONLY colors components should reference. */
export const semanticColors = {
  light: {
    'bg-canvas': palette.gray50,
    'bg-surface': palette.white,
    'bg-elevated': palette.white,
    'bg-muted': palette.gray100,
    border: palette.gray200,
    'border-strong': palette.gray300,
    'text-primary': palette.gray900,
    'text-secondary': palette.gray600,
    'text-tertiary': palette.gray400,
    'text-on-brand': palette.white,
    brand: palette.brand500,
    'brand-hover': palette.brand600,
    // Interaction-state overlays — layered on any surface, not tied to bg-muted.
    'bg-hover': 'rgba(17, 20, 24, 0.035)',
    'bg-pressed': 'rgba(17, 20, 24, 0.06)',
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    info: palette.info,
  },
  dark: {
    'bg-canvas': palette.gray950,
    'bg-surface': palette.gray900,
    'bg-elevated': palette.gray800,
    'bg-muted': palette.gray800,
    border: palette.gray800,
    'border-strong': palette.gray700,
    'text-primary': palette.gray50,
    'text-secondary': palette.gray300,
    'text-tertiary': palette.gray500,
    'text-on-brand': palette.white,
    brand: palette.brand400,
    'brand-hover': palette.brand500,
    'bg-hover': 'rgba(255, 255, 255, 0.045)',
    'bg-pressed': 'rgba(255, 255, 255, 0.08)',
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    info: palette.info,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// ELEVATION — soft, premium shadows (Apple-like, low contrast).
// ─────────────────────────────────────────────────────────────
export const shadow = {
  none: 'none',
  sm: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
  md: '0 4px 8px rgba(16, 24, 40, 0.06), 0 2px 4px rgba(16, 24, 40, 0.08)',
  lg: '0 12px 24px rgba(16, 24, 40, 0.10), 0 4px 8px rgba(16, 24, 40, 0.06)',
  xl: '0 24px 48px rgba(16, 24, 40, 0.14)',
} as const;

// ─────────────────────────────────────────────────────────────
// EFFECTS — glassmorphism / progressive blur (from the Bible).
// ─────────────────────────────────────────────────────────────
export const effects = {
  glassBlur: '20px',
  glassBgLight: 'rgba(255, 255, 255, 0.72)',
  glassBgDark: 'rgba(20, 23, 28, 0.64)',
  glassBorderLight: 'rgba(255, 255, 255, 0.4)',
  glassBorderDark: 'rgba(255, 255, 255, 0.08)',
} as const;

// ─────────────────────────────────────────────────────────────
// MOTION — purposeful, quick, Apple-like easing.
// ─────────────────────────────────────────────────────────────
export const motion = {
  duration: {
    instant: '80ms',
    fast: '140ms',
    base: '220ms',
    slow: '320ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)', // enter/exit default
    emphasized: 'cubic-bezier(0.2, 0, 0, 1.2)', // playful accent
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

// ─────────────────────────────────────────────────────────────
// LAYOUT — breakpoints, containers, z-index.
// ─────────────────────────────────────────────────────────────
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  toast: 1400,
  tooltip: 1500,
} as const;

export const tokens = {
  space,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  palette,
  semanticColors,
  shadow,
  effects,
  motion,
  breakpoints,
  zIndex,
} as const;

export type Tokens = typeof tokens;
