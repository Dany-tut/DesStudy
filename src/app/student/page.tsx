import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { getSessionLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { RadarChart } from '@/components/assessment/RadarChart';
import { CATEGORIES, GRADE_LABEL, type Grade } from '@/lib/assessment/taxonomy';
import { computeGrade, SALARY_BANDS, type Scores } from '@/lib/assessment/grade';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const dynamic = 'force-dynamic';

/**
 * Student home — shown after a learner signs in. Their latest grade + radar and
 * a link into the lessons. Middleware (src/middleware.ts) guarantees a learner
 * session here; we still guard for the typed learner.
 */
export default async function StudentHome() {
  const learner = await getSessionLearner();
  if (!learner) redirect('/signin?next=/student');

  const [latest, enrollmentCount] = await Promise.all([
    prisma.assessment.findFirst({
      where: { learnerId: learner.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.enrollment.count({ where: { learnerId: learner.id } }),
  ]);

  let scores: Scores | null = null;
  try {
    scores = latest ? (JSON.parse(latest.scores) as Scores) : null;
  } catch {
    scores = null;
  }
  const result = scores ? computeGrade(scores) : null;

  return (
    <main className="mx-auto max-w-[900px] px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-footnote text-tertiary">С возвращением</p>
          <h1 className="text-title1 font-bold text-primary">{learner.name ?? 'Ученик'}</h1>
        </div>
        <SignOutButton />
      </div>

      {result && scores ? (
        <div className="mt-8 rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2 sm:w-[240px]">
              <RadarChart
                axes={CATEGORIES.map((c) => ({
                  label: c.title,
                  value: result.radar.find((r) => r.category === c.id)?.value ?? 0,
                }))}
                size={220}
                animate={false}
                showLabels={false}
              />
              <p className="text-callout font-semibold capitalize text-brand">
                {GRADE_LABEL[latest!.grade as Grade] ?? latest!.grade}
              </p>
              {SALARY_BANDS[latest!.grade as Grade] && (
                <p className="text-caption tabular-nums text-tertiary">
                  вилка {SALARY_BANDS[latest!.grade as Grade].min}–
                  {SALARY_BANDS[latest!.grade as Grade].max}к ₽
                </p>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-footnote font-medium text-secondary">Ваш профиль по категориям</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {result.perCategory.map((c) => (
                  <div
                    key={c.category}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
                  >
                    <span className="text-footnote text-secondary">
                      {CATEGORIES.find((x) => x.id === c.category)!.title}
                    </span>
                    <span className="text-footnote capitalize text-primary">{c.grade}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-8 rounded-xl border border-border bg-surface p-6 text-footnote text-secondary">
          Результатов теста пока нет.
        </p>
      )}

      <Link
        href="/learn"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
      >
        <GraduationCap size={16} />
        {enrollmentCount > 0 ? 'К моим урокам' : 'Смотреть уроки'}
        <ArrowRight size={16} />
      </Link>
    </main>
  );
}
