import Link from 'next/link';
import { ListChecks, BarChart3, Clock, Lock, Check, Flame } from 'lucide-react';
import { LEVEL_LABEL, type LessonEntry } from '@/content/curriculum';

/** Russian plural for "задача": 1 задача, 2–4 задачи, 5+ задач. */
function tasksLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} задачи`;
  return `${n} задач`;
}

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
  const locked = lesson.status === 'soon';

  const inner = (
    <>
      <div className="mb-3 flex items-start justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-xl">
          {lesson.emoji}
        </span>
        {lesson.popular && !locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-caption font-medium text-brand">
            <Flame size={11} /> Популярное
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
          <ListChecks size={13} /> {tasksLabel(lesson.tasks)}
        </span>
        <span className="inline-flex items-center gap-1">
          <BarChart3 size={13} /> {LEVEL_LABEL[lesson.level]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {lesson.minutes} мин
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
