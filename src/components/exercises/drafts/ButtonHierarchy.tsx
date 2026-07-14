'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

/**
 * DRAFT exercise — "button-hierarchy": a mock dialog with several actions. The
 * learner assigns each action an emphasis level — primary / secondary / tertiary
 * — and the buttons restyle live so the visual weight is felt. Exactly one
 * primary is allowed (a screen has a single main CTA). Correct when every action
 * carries its intended level. Trains the rule «one action leads, the rest
 * recede». Self-contained; own state.
 */

type Level = 'primary' | 'secondary' | 'tertiary';

type Action = { id: string; label: string; target: Level };

/** A destructive-confirm dialog: Delete leads, Archive supports, Cancel/Learn recede. */
const ACTIONS: Action[] = [
  { id: 'delete', label: 'Удалить проект', target: 'primary' },
  { id: 'archive', label: 'В архив', target: 'secondary' },
  { id: 'cancel', label: 'Отмена', target: 'tertiary' },
  { id: 'learn', label: 'Подробнее', target: 'tertiary' },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: 'primary', label: 'Главная' },
  { value: 'secondary', label: 'Вторичная' },
  { value: 'tertiary', label: 'Третичная' },
];

const LEVEL_CLASS: Record<Level, string> = {
  primary: 'bg-brand text-on-brand border border-transparent',
  secondary: 'bg-surface text-primary border border-border-strong',
  tertiary: 'bg-transparent text-secondary border border-transparent',
};

export function ButtonHierarchy() {
  const [assign, setAssign] = useState<Record<string, Level>>({
    delete: 'secondary',
    archive: 'secondary',
    cancel: 'secondary',
    learn: 'secondary',
  });

  const primaryCount = Object.values(assign).filter((l) => l === 'primary').length;
  const tooManyPrimary = primaryCount > 1;
  const solved =
    !tooManyPrimary && ACTIONS.every((a) => assign[a.id] === a.target);

  function set(id: string, level: Level) {
    setAssign((s) => ({ ...s, [id]: level }));
  }

  function reset() {
    setAssign({ delete: 'secondary', archive: 'secondary', cancel: 'secondary', learn: 'secondary' });
  }

  return (
    <div className="w-full max-w-[560px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Расставь акценты: только одно действие ведёт
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[7rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : 'Настрой'}
        </span>
      </div>

      {/* Live dialog preview */}
      <div className="rounded-xl border border-border bg-canvas p-4">
        <p className="text-footnote font-semibold text-primary">Удалить проект?</p>
        <p className="mt-1 text-caption text-tertiary">Действие необратимо. Данные будут удалены.</p>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          {ACTIONS.map((a) => (
            <span
              key={a.id}
              className={[
                'rounded-lg px-4 py-2 text-footnote font-semibold transition-base',
                LEVEL_CLASS[assign[a.id]],
              ].join(' ')}
            >
              {a.label}
            </span>
          ))}
        </div>
      </div>

      {/* Assignment controls */}
      <div className="mt-4 flex flex-col gap-3">
        {ACTIONS.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-footnote font-medium text-secondary">
              {a.label}
            </span>
            <SegmentedControl value={assign[a.id]} onChange={(l) => set(a.id, l)} options={LEVELS} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 text-footnote text-secondary">
          {solved
            ? 'Верно — главное действие одно, остальные поддерживают и уходят в фон.'
            : tooManyPrimary
              ? 'Слишком много главных — акцент теряется, оставь одну primary-кнопку.'
              : 'Что здесь ведёт пользователя? Остальное должно отступить.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
        >
          <RotateCcw size={13} /> Сброс
        </button>
      </div>
    </div>
  );
}
