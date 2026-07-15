import type { Prisma } from '@prisma/client';

/**
 * Visibility rule for published, teacher-authored lessons (milestone 4b).
 * Returns a Prisma `where` fragment that admits a lesson only if the current
 * learner may see it:
 *
 *   • PUBLIC lessons     → everyone, including anonymous (no learner cookie yet)
 *   • RESTRICTED lessons → only a directly-granted learner, or a member of a
 *                          group the lesson is shared with
 *
 * Anonymous learners (learnerId === null) see PUBLIC lessons only. Static
 * code-authored lessons never pass through here — they're always visible.
 *
 * SECURITY: this is the single source of truth for authored-lesson visibility.
 * Both the /learn list and the per-slug resolver must spread it into their
 * queries so a RESTRICTED lesson can never leak via a guessed slug.
 */
export function visibleAuthoredLessonWhere(
  learnerId: string | null,
): Prisma.AuthoredLessonWhereInput {
  if (!learnerId) {
    return { published: true, access: 'PUBLIC' };
  }
  return {
    published: true,
    OR: [
      { access: 'PUBLIC' },
      { access: 'RESTRICTED', learnerAccess: { some: { learnerId } } },
      {
        access: 'RESTRICTED',
        groupAccess: { some: { group: { members: { some: { learnerId } } } } },
      },
    ],
  };
}
