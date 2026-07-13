import type { Config } from 'tailwindcss';
import {
  space,
  radius,
  fontFamily,
  fontSize,
  fontWeight,
  shadow,
  motion,
  breakpoints,
  zIndex,
} from './src/design/tokens';

/**
 * Tailwind is fed EXCLUSIVELY from design tokens.
 * This makes magic numbers impossible: if a utility class exists,
 * it maps to a Bible-approved token. There is no arbitrary scale.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    // Replace defaults so only token values are available.
    screens: breakpoints,
    spacing: space as unknown as Record<string, string>,
    borderRadius: radius as unknown as Record<string, string>,
    fontWeight: fontWeight as unknown as Record<string, string>,
    boxShadow: shadow as unknown as Record<string, string>,
    zIndex: zIndex as unknown as Record<string, string>,
    fontSize: Object.fromEntries(
      Object.entries(fontSize).map(([k, [size, lh, ls]]) => [
        k,
        [size, { lineHeight: lh, letterSpacing: ls }],
      ]),
    ) as Config['theme'],
    extend: {
      fontFamily: {
        sans: fontFamily.sans.split(', '),
        mono: fontFamily.mono.split(', '),
      },
      // Semantic colors resolve to CSS variables (theme-aware, see globals.css).
      //
      // brand/success/warning/danger/info/muted use the
      // `rgb(var(--x-rgb) / <alpha-value>)` function form instead of a plain
      // `var(--x)` reference — Tailwind's opacity modifier (`bg-success/10`)
      // needs to inject <alpha-value> into the color itself, which only works
      // when it can see the R/G/B channels. A raw `var(--x)` hex string is
      // opaque to Tailwind, so `/10` silently produced a fully transparent
      // background everywhere it was used. See --x-rgb in globals.css.
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        muted: 'rgb(var(--bg-muted-rgb) / <alpha-value>)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        hover: 'var(--bg-hover)',
        pressed: 'var(--bg-pressed)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        'on-brand': 'var(--text-on-brand)',
        brand: 'rgb(var(--brand-rgb) / <alpha-value>)',
        'brand-hover': 'var(--brand-hover)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
      },
      transitionDuration: {
        instant: motion.duration.instant,
        fast: motion.duration.fast,
        base: motion.duration.base,
        slow: motion.duration.slow,
      },
      transitionTimingFunction: {
        standard: motion.easing.standard,
        emphasized: motion.easing.emphasized,
        exit: motion.easing.exit,
      },
    },
  },
  plugins: [],
};

export default config;
