import type { Lesson } from './types';
import { lessons as staticLessons } from '@/content/lessons';
import { prisma } from '@/lib/db';
import { blocksToLesson } from '@/lib/admin/blocksToLesson';

/**
 * Single lookup point for "give me the lesson at this slug" — checks the
 * static (code-authored) lessons first, then falls back to a published
 * teacher-authored lesson in the DB. Used by the learner-facing lesson page
 * so it never needs to know which source a lesson came from.
 */
export async function getLesson(slug: string): Promise<Lesson | null> {
  const staticLesson = staticLessons[slug];
  if (staticLesson) return staticLesson;

  const row = await prisma.authoredLesson.findUnique({
    where: { slug, published: true },
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
