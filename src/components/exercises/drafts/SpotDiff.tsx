'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { SPOT_ROUNDS, SPOT_TILES } from '@/lib/curriculum/spotDiff';

/**
 * "spot-diff" exercise: a row of near-identical UI tiles, one of which quietly
 * breaks the system (wrong radius, off brand tint, heavier weight, extra
 * padding). The learner clicks the odd one out — training the consistency eye
 * that catches drift in a real design review.
 *
 * Optional props promote this draft to a real exercise: with `onChange` the
 * pick is lifted to the player (controlled, fixed `roundId`); with no props it
 * cycles rounds self-contained in the gallery. Round presets live in
 * `@/lib/curriculum/spotDiff` so the validator shares the answer key.
 */

export function SpotDiff({
  roundId,
  value,
  disabled,
  onChange,
}: {
  roundId?: number;
  value?: number | null;
  disabled?: boolean;
  onChange?: (picked: number) => void;
} = {}) {
  const controlled = onChange != null;
  const [internalRound, setInternalRound] = useState(0);
  const [internalPicked, setInternalPicked] = useState<number | null>(null);

  const roundIdx = roundId ?? internalRound;
  const round = SPOT_ROUNDS[roundIdx];
  const picked = controlled ? value ?? null : internalPicked;
  const solved = picked === round.oddIndex;
  const wrong = picked !== null && picked !== round.oddIndex;

  function pick(i: number) {
    if (disabled || picked !== null) return;
    if (controlled) onChange!(i);
    else setInternalPicked(i);
  }

  function next() {
    setInternalRound((i) => (i + 1) % SPOT_ROUNDS.length);
    setInternalPicked(null);
  }

  return (
    <div className="w-full max-w-[520px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Найди плитку, которая выбивается из системы
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[7.5rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : 'В процессе'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: SPOT_TILES }).map((_, i) => {
          const isOdd = i === round.oddIndex;
          const isPicked = picked === i;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={disabled || picked !== null}
              className={[
                'flex flex-col gap-2 rounded-lg border-2 p-3 text-left transition-fast',
                reveal && isOdd
                  ? 'border-success'
                  : isPicked
                    ? 'border-danger'
                    : 'border-transparent hover:border-border-strong',
              ].join(' ')}
              style={{
                borderRadius: 8,
                background: 'var(--muted)',
                padding: 14,
                ...(isOdd ? round.odd : null),
              }}
            >
              <span className="h-8 rounded-sm bg-brand/70" style={{ opacity: (isOdd && round.odd.opacity) || 1 }} />
              <span className="h-2 w-full rounded-sm bg-tertiary/40" />
              <span className="h-2 w-2/3 rounded-sm bg-tertiary/30" />
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 text-footnote text-secondary">
          {solved
            ? `Верно — ${round.flaw}.`
            : wrong
              ? 'Не эта — приглядись к радиусам, оттенкам и полям.'
              : 'Три плитки одинаковы, одна — нет.'}
        </p>
        {!controlled && (
          <button
            type="button"
            onClick={next}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
          >
            <RotateCcw size={13} /> Другой набор
          </button>
        )}
      </div>
    </div>
  );
}
