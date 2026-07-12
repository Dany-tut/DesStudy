import Link from 'next/link';
import { ArrowRight, Zap, Flame, PlayCircle, Clock, Lock, Check } from 'lucide-react';
import { getLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { PATHS, availableLessons } from '@/content/curriculum';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const learner = await getLearner();
  const progress = learner
    ? await prisma.lessonProgress.findMany({ where: { learnerId: learner.id } })
    : [];
  const progressBySlug = new Map(progress.map((p) => [p.lessonSlug, p]));

  // Pick the first available, not-yet-completed lesson to "continue".
  const continueLesson =
    PATHS.flatMap((p) => p.lessons).find(
      (l) => l.status === 'available' && !progressBySlug.get(l.slug)?.completed,
    ) ?? PATHS[0].lessons[0];

  return (
    <main className="mx-auto max-w-[900px] px-6 py-12">
      {/* Hero */}
      <section className="mb-10">
        <h1 className="text-title1 font-bold text-primary">
          {learner ? 'С возвращением 👋' : 'Учись дизайну, делая'}
        </h1>
        <p className="mt-2 max-w-[560px] text-body text-secondary">
          Интерактивная платформа, где ты становишься UI/UX-дизайнером через практику,
          мгновенную проверку и AI-наставника — а не через часы видео.
        </p>

        {learner && (
          <div className="mt-6 flex gap-4">
            <MiniStat icon={<Zap size={16} className="text-brand" />} value={learner.xp} label="XP" />
            <MiniStat
              icon={<Flame size={16} className="text-warning" />}
              value={`${learner.streak} дн.`}
              label="Стрик"
            />
          </div>
        )}
      </section>

      {/* Continue learning */}
      <Link
        href={`/learn/${continueLesson.slug}`}
        className="group mb-12 flex items-center gap-5 rounded-2xl border border-border bg-surface p-6 transition-base hover:border-brand hover:shadow-lg"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <PlayCircle size={28} />
        </span>
        <div className="flex-1">
          <p className="text-footnote font-medium text-brand">Продолжить обучение</p>
          <p className="mt-0.5 text-title3 font-semibold text-primary">{continueLesson.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-footnote text-tertiary">
            <Clock size={13} /> {continueLesson.minutes} мин
          </p>
        </div>
        <ArrowRight size={22} className="text-tertiary transition-base group-hover:text-brand" />
      </Link>

      {/* Paths */}
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-title3 font-semibold text-primary">Пути обучения</h2>
        <Link href="/learn" className="text-footnote font-medium text-brand hover:underline">
          Все уроки →
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {PATHS.map((path) => {
          const done = path.lessons.filter((l) => progressBySlug.get(l.slug)?.completed).length;
          return (
            <div key={path.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl">{path.emoji}</span>
                <div>
                  <p className="text-callout font-semibold text-primary">{path.title}</p>
                  <p className="text-caption text-tertiary">
                    {done}/{path.lessons.length} уроков
                  </p>
                </div>
              </div>
              <p className="mb-4 text-footnote text-secondary">{path.description}</p>
              <ul className="space-y-1.5">
                {path.lessons.slice(0, 3).map((l) => {
                  const completed = progressBySlug.get(l.slug)?.completed;
                  return (
                    <li key={l.slug}>
                      {l.status === 'available' ? (
                        <Link
                          href={`/learn/${l.slug}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-footnote text-secondary transition-fast hover:bg-muted hover:text-primary"
                        >
                          {completed ? (
                            <Check size={14} className="text-success" />
                          ) : (
                            <PlayCircle size={14} className="text-brand" />
                          )}
                          {l.title}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 px-2 py-1.5 text-footnote text-tertiary">
                          <Lock size={13} /> {l.title}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-footnote text-tertiary">
        {availableLessons} урок доступен · остальные в разработке
      </p>
    </main>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2">
      {icon}
      <span className="text-callout font-semibold text-primary tabular-nums">{value}</span>
      <span className="text-footnote text-tertiary">{label}</span>
    </div>
  );
}
