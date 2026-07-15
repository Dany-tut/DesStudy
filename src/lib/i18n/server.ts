/**
 * Server-side locale access. Server components render Russian by default and
 * read the persisted choice from the locale cookie (mirrored from settings on
 * the client). Import only from server components / route handlers.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, isLocale } from './config';
import { createTranslator, type Translator } from './translator';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for the current request's locale. */
export async function getT(): Promise<Translator> {
  return createTranslator(await getLocale());
}
