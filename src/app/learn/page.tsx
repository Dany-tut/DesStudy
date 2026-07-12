import { Search, Flame } from 'lucide-react';
import { getLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { PATHS } from '@/content/curriculum';
import { LessonCard } from '@/components/learn/LessonCard';

export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const learner = await getLearner();
  const progress = learner
    ? await prisma.lessonProgress.findMany({ where: { learnerId: learner.id } })
    : [];
  const bySlug = new Map(progress.map((p) => [p.lessonSlug, p]));

  return (
    <main className="mx-auto max-w-[900px] px-6 py-10">
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
      </div>
    </main>
  );
}
