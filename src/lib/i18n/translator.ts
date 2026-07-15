/**
 * Pure translator built over a dictionary + locale. Shared verbatim by the
 * server (getT) and the client hook (useT) so both resolve keys identically.
 *
 *   t('nav.home')                         → "Home"
 *   t('dashboard.minsAgo', { count: 5 })  → "5 min ago"
 *   tp('lessonCard.tasks', 3)             → "3 tasks"  (count injected as {count})
 */

import { type Locale, type PluralForms, interpolate, pluralCategory } from './config';
import { getDictionary } from './dictionaries';

export interface Translator {
  locale: Locale;
  /** Resolve a dot-path key to a string, filling `{var}` placeholders. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Resolve a dot-path key to a plural form for `count` (also exposed as {count}). */
  tp: (key: string, count: number, vars?: Record<string, string | number>) => string;
}

function resolve(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

export function createTranslator(locale: Locale): Translator {
  const dict = getDictionary(locale);

  const t: Translator['t'] = (key, vars) => {
    const value = resolve(dict, key);
    if (typeof value !== 'string') return key; // missing key → surface the key
    return interpolate(value, vars);
  };

  const tp: Translator['tp'] = (key, count, vars) => {
    const forms = resolve(dict, key) as PluralForms | undefined;
    if (!forms || typeof forms !== 'object') return key;
    const category = pluralCategory(locale, count);
    const template = forms[category] ?? forms.other ?? forms.many ?? forms.few ?? forms.one;
    return interpolate(template, { count, ...vars });
  };

  return { locale, t, tp };
}
