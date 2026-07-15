'use client';

/**
 * Client-side i18n. The provider is seeded on the server with the cookie
 * locale (so first paint matches), then holds it in state. `setLocale`
 * persists the choice three ways and re-renders both worlds:
 *   - cookie  → server components can read it on the next render
 *   - <html lang> → correct language metadata immediately
 *   - router.refresh() → re-runs server components with the new locale
 * Client components re-render from the context state with no refresh needed.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from './config';
import { createTranslator, type Translator } from './translator';

interface I18nValue extends Translator {
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

function persistLocale(locale: Locale) {
  if (typeof document === 'undefined') return;
  // 1 year, root path so every route sees it.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      persistLocale(next);
      router.refresh(); // re-render server components in the new locale
    },
    [router],
  );

  const value = useMemo<I18nValue>(() => {
    const translator = createTranslator(locale);
    return { ...translator, setLocale };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Defensive fallback so a stray client component outside the provider
    // still renders (in the default locale) instead of crashing.
    const translator = createTranslator(DEFAULT_LOCALE);
    return { ...translator, setLocale: () => {} };
  }
  return ctx;
}

/** Convenience: the translator functions only. */
export function useT(): Translator {
  return useI18n();
}
