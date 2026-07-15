import type { Lesson } from '@/lib/curriculum/types';
import type { Locale } from '@/lib/i18n/config';
import { lessons as lessonsRu } from './index';
import { lessonsEn } from './en';

/**
 * The slug→Lesson map for a locale. For English we overlay translated lessons
 * on top of the Russian source, so an untranslated slug transparently falls
 * back to Russian rather than disappearing.
 */
export function getLessonsMap(locale: Locale): Record<string, Lesson> {
  return locale === 'en' ? { ...lessonsRu, ...lessonsEn } : lessonsRu;
}

/** A single localized lesson, or the Russian source if not yet translated. */
export function getLocalizedLesson(slug: string, locale: Locale): Lesson | undefined {
  return getLessonsMap(locale)[slug];
}
