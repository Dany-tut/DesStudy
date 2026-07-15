import { Flame } from 'lucide-react';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { getPaths, type LessonEntry } from '@/content/curriculum';
import { blocksToLesson } from '@/lib/admin/blocksToLesson';
import { visibleAuthoredLessonWhere } from '@/lib/curriculum/access';
import { LearnBrowser, type LearnGroup } from '@/components/learn/LearnBrowser';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

/** Published teacher-authored lessons the current learner may see, converted to
 *  the same card shape the static PATHS use. */
async function getAuthoredEntries(learnerId: string | null): Promise<LessonEntry[]> {
  const rows = await prisma.authoredLesson.findMany({
    where: visibleAuthoredLessonWhere(learnerId),
    include: { blocks: true },
  });
  return rows.flatMap((row) => {
    try {
      const lesson = blocksToLesson(row, row.blocks);
      return [
        {
          slug: lesson.slug,
          title: lesson.title,
          minutes: lesson.estimatedMinutes,
          tasks: lesson.exercises.length + 1,
          level:
            lesson.difficulty === 'hard'
              ? ('advanced' as const)
              : lesson.difficulty === 'medium'
                ? ('medium' as const)
                : ('beginner' as const),
          emoji: '📚',
          status: 'available' as const,
        },
      ];
    } catch {
      return []; // incomplete authored lesson — skip rather than crash the list
    }
  });
}

export default async function LearnPage() {
  const { t, tp, locale } = await getT();
  const PATHS = getPaths(locale);
  const learner = await getCurrentLearner();
  const progress = learner
    ? await prisma.lessonProgress.findMany({ where: { learnerId: learner.id } })
    : [];
  const bySlug = new Map(progress.map((p) => [p.lessonSlug, p]));
  const authoredLessons = await getAuthoredEntries(learner?.id ?? null);

  const withProgress = (entry: LessonEntry) => {
    const p = bySlug.get(entry.slug);
    return {
      entry,
      progressPct: p ? Math.round((p.solvedCount / Math.max(p.totalCount, 1)) * 100) : 0,
      completed: p?.completed,
    };
  };

  const groups: LearnGroup[] = PATHS.map((path) => ({
    id: path.id,
    title: path.title,
    description: path.description,
    emoji: path.emoji,
    lessons: path.lessons.map(withProgress),
  }));

  if (authoredLessons.length > 0) {
    groups.push({
      id: 'authored',
      title: t('learn.authoredTitle'),
      description: t('learn.authoredDescription'),
      emoji: '📚',
      lessons: authoredLessons.map(withProgress),
    });
  }

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-title1 font-bold text-primary">{t('learn.title')}</h1>
          <p className="mt-1 text-footnote text-secondary">{t('learn.subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-medium text-primary">
          <Flame size={15} className="text-warning" />
          {tp('common.days', learner?.streak ?? 0)}
        </div>
      </div>

      <LearnBrowser groups={groups} />
    </main>
  );
}
