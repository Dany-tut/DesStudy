import { prisma } from './db';

export interface RecordAttemptInput {
  lessonSlug: string;
  exerciseId: string;
  skill: string;
  correct: boolean;
  tries: number;
  /** total exercises in the lesson, to compute completion */
  lessonTotal: number;
  /** Present for figma-link/file-upload exercises — logs what was submitted for review. */
  submission?: { kind: 'figma-link' | 'file-upload'; value: string };
}

/** YYYY-MM-DD in local time. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isYesterday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toISOString().slice(0, 10) === y.toISOString().slice(0, 10);
}

/** XP reward: more for first-try solves, still positive for perseverance. */
function xpFor(correct: boolean, tries: number): number {
  if (!correct) return 0;
  return Math.max(4, 12 - (tries - 1) * 3); // 12 first try, floor 4
}

/**
 * Record one exercise attempt and update the learner's XP, streak,
 * per-skill stats, and lesson progress. Idempotent-ish: each call appends
 * an Attempt; XP is only awarded on a correct solve.
 */
export async function recordAttempt(learnerId: string, input: RecordAttemptInput) {
  const { lessonSlug, exerciseId, skill, correct, tries, lessonTotal, submission } = input;

  await prisma.attempt.create({
    data: { learnerId, lessonSlug, exerciseId, skill, correct, tries },
  });

  if (submission) {
    await prisma.submission.create({
      data: {
        learnerId,
        lessonSlug,
        exerciseId,
        kind: submission.kind,
        value: submission.value,
      },
    });
  }

  // Per-skill rolling stats (weak/strong skills, adaptive difficulty).
  await prisma.skillStat.upsert({
    where: { learnerId_skill: { learnerId, skill } },
    create: { learnerId, skill, solved: correct ? 1 : 0, totalTries: tries },
    update: {
      solved: { increment: correct ? 1 : 0 },
      totalTries: { increment: tries },
    },
  });

  // Lesson progress — count distinct solved exercises.
  if (correct) {
    const solvedCount = await prisma.attempt
      .findMany({
        where: { learnerId, lessonSlug, correct: true },
        distinct: ['exerciseId'],
        select: { exerciseId: true },
      })
      .then((rows) => rows.length);

    await prisma.lessonProgress.upsert({
      where: { learnerId_lessonSlug: { learnerId, lessonSlug } },
      create: {
        learnerId,
        lessonSlug,
        solvedCount,
        totalCount: lessonTotal,
        completed: solvedCount >= lessonTotal,
      },
      update: { solvedCount, totalCount: lessonTotal, completed: solvedCount >= lessonTotal },
    });
  }

  // XP + streak on the learner.
  const learner = await prisma.learner.findUniqueOrThrow({ where: { id: learnerId } });
  const t = today();
  let streak = learner.streak;
  if (learner.lastActiveOn !== t) {
    streak = isYesterday(learner.lastActiveOn) ? learner.streak + 1 : 1;
  }

  const updated = await prisma.learner.update({
    where: { id: learnerId },
    data: {
      xp: { increment: xpFor(correct, tries) },
      streak,
      lastActiveOn: t,
    },
  });

  return { xp: updated.xp, streak: updated.streak };
}
