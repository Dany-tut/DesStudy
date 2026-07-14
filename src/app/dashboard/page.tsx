import Link from 'next/link';
import {
  Flame,
  Zap,
  TrendingUp,
  TrendingDown,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { PATHS } from '@/content/curriculum';

export const dynamic = 'force-dynamic';

const ALL_LESSONS = PATHS.flatMap((p) => p.lessons);

export default async function DashboardPage() {
  const learner = await getLearner();

  if (!learner) {
    return (
      <main className="mx-auto max-w-[1200px] px-8 py-16">
        <h1 className="text-title1 font-bold text-primary">Дашборд</h1>
        <p className="mt-3 text-body text-secondary">
          Пройди первое упражнение, и здесь появится твой прогресс.
        </p>
        <StartLink slug={ALL_LESSONS[0]?.slug} />
      </main>
    );
  }

  const [skills, lessons, attempts] = await Promise.all([
    prisma.skillStat.findMany({ where: { learnerId: learner.id } }),
    prisma.lessonProgress.findMany({ where: { learnerId: learner.id } }),
    prisma.attempt.findMany({
      where: { learnerId: learner.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  // Accuracy = solved / totalTries. Lower = weaker skill (PRD §7).
  const ranked = skills
    .map((s) => ({ skill: s.skill, acc: s.totalTries ? s.solved / s.totalTries : 0, solved: s.solved }))
    .sort((a, b) => a.acc - b.acc);
  const weak = ranked.slice(0, 3);
  const strong = [...ranked].reverse().slice(0, 3);

  const completedSlugs = new Set(lessons.filter((l) => l.completed).map((l) => l.lessonSlug));
  const nextLesson = ALL_LESSONS.find((l) => !completedSlugs.has(l.slug));
  const startSlug = nextLesson?.slug ?? ALL_LESSONS[ALL_LESSONS.length - 1]?.slug;
  const allDone = !nextLesson && ALL_LESSONS.length > 0;

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-16">
      <h1 className="text-title1 font-bold text-primary">Дашборд</h1>
      <p className="mt-2 text-body text-secondary">Твой измеримый прогресс.</p>

      {/* Stat tiles */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat icon={<Zap size={18} className="text-brand" />} label="XP" value={learner.xp} />
        <Stat
          icon={<Flame size={18} className="text-warning" />}
          label="Стрик"
          value={`${learner.streak} дн.`}
        />
        <Stat
          icon={<BookOpen size={18} className="text-success" />}
          label="Уроков пройдено"
          value={lessons.filter((l) => l.completed).length}
        />
      </div>

      {/* Lessons */}
      <h2 className="mb-4 mt-12 text-title3 font-semibold text-primary">Уроки</h2>
      {lessons.length === 0 ? (
        <p className="text-body text-tertiary">Пока нет активных уроков.</p>
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => {
            const pct = Math.round((l.solvedCount / Math.max(l.totalCount, 1)) * 100);
            return (
              <Link
                key={l.lessonSlug}
                href={`/learn/${l.lessonSlug}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-base hover:border-brand"
              >
                <div className="flex-1">
                  <p className="text-callout font-medium text-primary">{l.lessonSlug}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-footnote tabular-nums text-secondary">{pct}%</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Weak / strong skills */}
      {ranked.length > 0 && (
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <SkillList
            title="Слабые навыки"
            icon={<TrendingDown size={16} className="text-danger" />}
            items={weak}
          />
          <SkillList
            title="Сильные навыки"
            icon={<TrendingUp size={16} className="text-success" />}
            items={strong}
          />
        </div>
      )}

      {/* Activity feed */}
      {attempts.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 text-title3 font-semibold text-primary">Недавняя активность</h2>
          <ul className="space-y-2">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                {a.correct ? (
                  <CheckCircle2 size={16} className="shrink-0 text-success" />
                ) : (
                  <XCircle size={16} className="shrink-0 text-danger" />
                )}
                <span className="flex-1 text-body text-primary">
                  {lessonTitle(a.lessonSlug)}
                  <span className="ml-2 text-footnote text-tertiary">{a.skill}</span>
                </span>
                <span className="text-footnote tabular-nums text-tertiary">
                  {formatWhen(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <StartLink slug={startSlug} done={allDone} />
    </main>
  );
}

function lessonTitle(slug: string): string {
  return ALL_LESSONS.find((l) => l.slug === slug)?.title ?? slug;
}

function formatWhen(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'сейчас';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  return `${days} дн назад`;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-2">{icon}</div>
      <p className="text-title2 font-semibold text-primary tabular-nums">{value}</p>
      <p className="text-footnote text-tertiary">{label}</p>
    </div>
  );
}

function SkillList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { skill: string; acc: number }[];
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-footnote font-medium text-secondary">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((s) => (
          <li
            key={s.skill}
            className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-body"
          >
            <span className="text-primary">{s.skill}</span>
            <span className="text-tertiary tabular-nums">{Math.round(s.acc * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StartLink({ slug, done }: { slug?: string; done?: boolean }) {
  if (!slug) return null;
  return (
    <Link
      href={`/learn/${slug}`}
      className="mt-10 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-callout font-medium text-on-brand transition-base hover:bg-brand-hover"
    >
      {done ? 'Вся программа пройдена — повторить урок' : 'Продолжить обучение'}{' '}
      <ArrowRight size={16} />
    </Link>
  );
}
