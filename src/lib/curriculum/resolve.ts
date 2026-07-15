import type { Lesson } from './types';
import { getLessonsMap } from '@/content/lessons/localized';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { prisma } from '@/lib/db';
import { blocksToLesson } from '@/lib/admin/blocksToLesson';
import { visibleAuthoredLessonWhere } from './access';

/**
 * Single lookup point for "give me the lesson at this slug" — checks the
 * static (code-authored) lessons first, then falls back to a published
 * teacher-authored lesson in the DB. Used by the learner-facing lesson page
 * so it never needs to know which source a lesson came from.
 *
 * `locale` selects the language of the static lessons (English overlays the
 * Russian source, falling back to it where a translation is missing). Authored
 * DB lessons are returned as-authored — they are not translated.
 *
 * `learnerId` gates authored-lesson visibility (milestone 4b): a RESTRICTED
 * lesson resolves only for a granted learner, so it can't leak via a guessed
 * slug. Static lessons are always visible (returned before this check). Pass
 * null for anonymous visitors — they see PUBLIC authored lessons only.
 */
export async function getLesson(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
  learnerId: string | null = null,
): Promise<Lesson | null> {
  const staticLesson = getLessonsMap(locale)[slug];
  if (staticLesson) return staticLesson;

  const row = await prisma.authoredLesson.findFirst({
    where: { slug, ...visibleAuthoredLessonWhere(learnerId) },
    include: { blocks: true },
  });
  if (!row) return null;

  try {
    return blocksToLesson(row, row.blocks);
  } catch {
    // Malformed/incomplete authored content shouldn't 500 the learner page —
    // treat it as not-found rather than crashing.
    return null;
  }
}
