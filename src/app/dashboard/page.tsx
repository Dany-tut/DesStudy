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
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { getPaths, type LessonEntry } from '@/content/curriculum';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n/translator';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { t, tp, locale } = await getT();
  const ALL_LESSONS = getPaths(locale).flatMap((p) => p.lessons);
  const learner = await getCurrentLearner();

  if (!learner) {
    return (
      <main className="mx-auto max-w-[1200px] px-8 py-16">
        <h1 className="text-title1 font-bold text-primary">{t('dashboard.title')}</h1>
        <p className="mt-3 text-body text-secondary">{t('dashboard.emptySubtitle')}</p>
        <AssessmentCTA />
        <StartLink slug={ALL_LESSONS[0]?.slug} label={t('dashboard.continueLearning')} />
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
      <h1 className="text-title1 font-bold text-primary">{t('dashboard.title')}</h1>
      <p className="mt-2 text-body text-secondary">{t('dashboard.subtitle')}</p>

      <AssessmentCTA />

      {/* Stat tiles */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat icon={<Zap size={18} className="text-brand" />} label={t('dashboard.xp')} value={learner.xp} />
        <Stat
          icon={<Flame size={18} className="text-warning" />}
          label={t('dashboard.streak')}
          value={tp('common.days', learner.streak)}
        />
        <Stat
          icon={<BookOpen size={18} className="text-success" />}
          label={t('dashboard.lessonsCompleted')}
          value={lessons.filter((l) => l.completed).length}
        />
      </div>

      {/* Lessons */}
      <h2 className="mb-4 mt-12 text-title3 font-semibold text-primary">{t('dashboard.lessons')}</h2>
      {lessons.length === 0 ? (
        <p className="text-body text-tertiary">{t('dashboard.noLessons')}</p>
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
            title={t('dashboard.weakSkills')}
            icon={<TrendingDown size={16} className="text-danger" />}
            items={weak}
          />
          <SkillList
            title={t('dashboard.strongSkills')}
            icon={<TrendingUp size={16} className="text-success" />}
            items={strong}
          />
        </div>
      )}

      {/* Activity feed */}
      {attempts.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 text-title3 font-semibold text-primary">{t('dashboard.recentActivity')}</h2>
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
                  {lessonTitle(a.lessonSlug, ALL_LESSONS)}
                  <span className="ml-2 text-footnote text-tertiary">{a.skill}</span>
                </span>
                <span className="text-footnote tabular-nums text-tertiary">
                  {formatWhen(a.createdAt, t)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <StartLink
        slug={startSlug}
        label={allDone ? t('dashboard.allDone') : t('dashboard.continueLearning')}
      />
    </main>
  );
}

function lessonTitle(slug: string, all: LessonEntry[]): string {
  return all.find((l) => l.slug === slug)?.title ?? slug;
}

function formatWhen(date: Date, t: Translator['t']): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return t('dashboard.justNow');
  if (mins < 60) return t('dashboard.minsAgo', { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('dashboard.hoursAgo', { count: hours });
  const days = Math.round(hours / 24);
  return t('dashboard.daysAgo', { count: days });
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

/** Entry-test banner — everyone who lands on the platform is invited to take it. */
function AssessmentCTA() {
  return (
    <Link
      href="/assessment"
      className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-brand/40 bg-brand/5 p-5 transition-base hover:border-brand"
    >
      <div>
        <p className="text-callout font-semibold text-primary">Пройти тест на грейд</p>
        <p className="mt-0.5 text-footnote text-secondary">
          25 вопросов · радар навыков и персональные точки роста
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-footnote font-medium text-on-brand">
        Начать <ArrowRight size={15} />
      </span>
    </Link>
  );
}

function StartLink({ slug, label }: { slug?: string; label: string }) {
  if (!slug) return null;
  return (
    <Link
      href={`/learn/${slug}`}
      className="mt-10 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-callout font-medium text-on-brand transition-base hover:bg-brand-hover"
    >
      {label} <ArrowRight size={16} />
    </Link>
  );
}
