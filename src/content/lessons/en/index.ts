import type { Lesson } from '@/lib/curriculum/types';

/**
 * English lesson registry, keyed by slug. Populated incrementally as lessons
 * are translated; any slug absent here falls back to the Russian source (see
 * ../localized.ts), so the app never shows a blank lesson mid-translation.
 */
export const lessonsEn: Record<string, Lesson> = {};
