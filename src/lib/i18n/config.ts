/**
 * i18n configuration — locale identity, the persistence cookie, and the
 * plural/interpolation primitives shared by the server loader and the client
 * hook. Kept dependency-free so it can run in the pre-paint inline snippet,
 * on the server (via next/headers), and in client components alike.
 */

export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ru';

/** Mirrored from the settings object so server components can read the choice. */
export const LOCALE_COOKIE = 'desstudy:lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Native language names, shown in the picker itself (never translated). */
export const LOCALE_NAMES: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
};

/**
 * Plural category for a count. Russian has one/few/many; English has one/other.
 * We keep both branches here so a single dictionary shape (see PluralForms)
 * serves every locale.
 */
export function pluralCategory(locale: Locale, n: number): 'one' | 'few' | 'many' | 'other' {
  const abs = Math.abs(n);
  if (locale === 'en') return abs === 1 ? 'one' : 'other';
  // Russian rules.
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return 'many';
}

export interface PluralForms {
  one: string;
  few?: string;
  many?: string;
  other?: string;
}

/** Fill `{name}` placeholders from a vars record. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
