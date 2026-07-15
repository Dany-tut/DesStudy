import Link from 'next/link';
import { ListChecks, BarChart3, Clock, Lock, Check, Flame, BookOpen } from 'lucide-react';
import { type LessonEntry } from '@/content/curriculum';
import { useT } from '@/lib/i18n/client';

/** Level → its dictionary key under `learn.*`. */
const LEVEL_KEY = {
  beginner: 'learn.levelBeginner',
  medium: 'learn.levelMedium',
  advanced: 'learn.levelAdvanced',
} as const;

/**
 * Kodree-style lesson card: icon tile, title, a row of metadata chips
 * (tasks · level · time), a "Popular" badge, and a progress bar when started.
 */
export function LessonCard({
  lesson,
  progressPct,
  completed,
}: {
  lesson: LessonEntry;
  progressPct?: number;
  completed?: boolean;
}) {
  const { t, tp } = useT();
  const locked = lesson.status === 'soon';

  const inner = (
    <>
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-xl">
          {lesson.emoji}
        </span>
        {lesson.popular && !locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-caption font-medium text-brand">
            <Flame size={11} /> {t('lessonCard.popular')}
          </span>
        )}
        {locked && <Lock size={16} className="text-tertiary" />}
        {completed && <Check size={18} className="text-success" />}
      </div>

      <p
        className={`text-callout font-semibold ${locked ? 'text-tertiary' : 'text-primary'}`}
      >
        {lesson.title}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-tertiary">
        <span className="inline-flex items-center gap-1">
          {lesson.kind === 'lecture' ? (
            <>
              <BookOpen size={13} /> {t('lessonCard.lecture')}
            </>
          ) : (
            <>
              <ListChecks size={13} /> {tp('lessonCard.tasks', lesson.tasks)}
            </>
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          <BarChart3 size={13} /> {t(LEVEL_KEY[lesson.level])}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {lesson.minutes} {t('common.min')}
        </span>
      </div>

      {typeof progressPct === 'number' && progressPct > 0 && !completed && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progressPct}%` }} />
        </div>
      )}
    </>
  );

  const base =
    'block rounded-xl border border-border bg-surface p-4 transition-base';

  if (locked) {
    return <div className={`${base} opacity-60`}>{inner}</div>;
  }

  return (
    <Link href={`/learn/${lesson.slug}`} className={`${base} hover:border-brand hover:shadow-md`}>
      {inner}
    </Link>
  );
}
