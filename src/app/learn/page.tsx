import { Search, Flame } from 'lucide-react';
import { getLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { PATHS, type LessonEntry } from '@/content/curriculum';
import { LessonCard } from '@/components/learn/LessonCard';
import { blocksToLesson } from '@/lib/admin/blocksToLesson';

export const dynamic = 'force-dynamic';

/** Published teacher-authored lessons, converted to the same card shape the static PATHS use. */
async function getAuthoredEntries(): Promise<LessonEntry[]> {
  const rows = await prisma.authoredLesson.findMany({
    where: { published: true },
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
  const learner = await getLearner();
  const progress = learner
    ? await prisma.lessonProgress.findMany({ where: { learnerId: learner.id } })
    : [];
  const bySlug = new Map(progress.map((p) => [p.lessonSlug, p]));
  const authoredLessons = await getAuthoredEntries();

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-10">
      {/* Header — Kodree-style: title + search + streak */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-title1 font-bold text-primary">Обучение</h1>
          <p className="mt-1 text-footnote text-secondary">
            Пути от нуля до профессионала — теория, практика, mastery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-footnote text-tertiary">
            <Search size={15} />
            <span>Поиск урока…</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-medium text-primary">
            <Flame size={15} className="text-warning" />
            {learner?.streak ?? 0} дн.
          </div>
        </div>
      </div>

      {/* Paths → grids of cards */}
      <div className="space-y-10">
        {PATHS.map((path) => (
          <section key={path.id}>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xl">{path.emoji}</span>
              <div>
                <h2 className="text-title3 font-semibold text-primary">{path.title}</h2>
                <p className="text-caption text-tertiary">{path.description}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {path.lessons.map((l) => {
                const p = bySlug.get(l.slug);
                const pct = p ? Math.round((p.solvedCount / Math.max(p.totalCount, 1)) * 100) : 0;
                return (
                  <LessonCard
                    key={l.slug}
                    lesson={l}
                    progressPct={pct}
                    completed={p?.completed}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {authoredLessons.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-xl">📚</span>
              <div>
                <h2 className="text-title3 font-semibold text-primary">От преподавателя</h2>
                <p className="text-caption text-tertiary">
                  Уроки, собранные в конструкторе — рядом с основной программой.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {authoredLessons.map((l) => {
                const p = bySlug.get(l.slug);
                const pct = p ? Math.round((p.solvedCount / Math.max(p.totalCount, 1)) * 100) : 0;
                return (
                  <LessonCard key={l.slug} lesson={l} progressPct={pct} completed={p?.completed} />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
