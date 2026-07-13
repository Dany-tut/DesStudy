'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';

/**
 * DRAFT exercise type — "match": connect each design token to its value by tapping.
 * Tap a left token (brand ring), then tap a right value. Correct → both lock green;
 * wrong → brief danger flash, then deselect. Fully self-contained for showcase eval.
 */

type Pair = { id: string; token: string; value: string };

const PAIRS: Pair[] = [
  { id: 'space2', token: 'space.2', value: '8px' },
  { id: 'space4', token: 'space.4', value: '16px' },
  { id: 'space8', token: 'space.8', value: '32px' },
  { id: 'radiusLg', token: 'radius.lg', value: '14px' },
  { id: 'radiusFull', token: 'radius.full', value: '9999px' },
];

// Deterministic shuffle of the right column (no Math.random — blocked in some contexts).
const VALUE_ORDER: string[] = ['32px', '9999px', '16px', '14px', '8px'];
const RIGHT: Pair[] = VALUE_ORDER.map((v) => PAIRS.find((p) => p.value === v)!);

export function MatchPairs() {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);

  const total = PAIRS.length;
  const done = matched.length;
  const allDone = done === total;

  function reset() {
    setSelectedLeft(null);
    setMatched([]);
    setWrong(null);
  }

  function pickLeft(id: string) {
    if (matched.includes(id) || wrong) return;
    setSelectedLeft((cur) => (cur === id ? null : id));
  }

  function pickRight(id: string) {
    if (!selectedLeft || matched.includes(id) || wrong) return;
    if (id === selectedLeft) {
      setMatched((m) => [...m, id]);
      setSelectedLeft(null);
    } else {
      // Wrong pairing → flash danger on both for ~500ms, then deselect.
      setWrong({ left: selectedLeft, right: id });
      setSelectedLeft(null);
      setTimeout(() => setWrong(null), 500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-footnote font-semibold text-secondary tabular-nums">
          {done} / {total} сопоставлено
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-medium text-secondary transition-fast hover:border-border-strong hover:text-primary active:bg-pressed"
        >
          <RotateCcw size={14} />
          Сбросить
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left column — tokens */}
        <ul className="flex flex-1 flex-col gap-2">
          {PAIRS.map((p) => {
            const isMatched = matched.includes(p.id);
            const isSelected = selectedLeft === p.id;
            const isWrong = wrong?.left === p.id;
            return (
              <li key={p.id}>
                <button
                  disabled={isMatched}
                  onClick={() => pickLeft(p.id)}
                  style={isWrong ? { animation: 'matchpairs-shake 0.4s ease' } : undefined}
                  className={[
                    'w-full rounded-lg border px-3 py-3 text-left text-callout tabular-nums transition-base',
                    isMatched
                      ? 'cursor-default border-success bg-success/10 text-success'
                      : isWrong
                        ? 'border-danger bg-danger/10 text-danger'
                        : isSelected
                          ? 'border-brand text-primary ring-2 ring-brand'
                          : 'border-border bg-surface text-primary hover:border-border-strong active:bg-pressed',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-between gap-2">
                    {p.token}
                    {isMatched && <Check size={16} className="shrink-0 text-success" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Right column — values */}
        <ul className="flex flex-1 flex-col gap-2">
          {RIGHT.map((p) => {
            const isMatched = matched.includes(p.id);
            const isWrong = wrong?.right === p.id;
            const selectable = selectedLeft && !isMatched && !wrong;
            return (
              <li key={p.id}>
                <button
                  disabled={isMatched}
                  onClick={() => pickRight(p.id)}
                  style={isWrong ? { animation: 'matchpairs-shake 0.4s ease' } : undefined}
                  className={[
                    'w-full rounded-lg border px-3 py-3 text-left text-callout tabular-nums transition-base',
                    isMatched
                      ? 'cursor-default border-success bg-success/10 text-success'
                      : isWrong
                        ? 'border-danger bg-danger/10 text-danger'
                        : selectable
                          ? 'border-border-strong bg-surface text-primary hover:border-brand active:bg-pressed'
                          : 'border-border bg-surface text-secondary',
                  ].join(' ')}
                >
                  <span className="flex items-center justify-between gap-2">
                    {p.value}
                    {isMatched && <Check size={16} className="shrink-0 text-success" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {allDone && (
        <div className="flex items-center gap-2 rounded-lg border border-success bg-success/10 px-3 py-3 text-callout font-medium text-success">
          <Check size={18} className="shrink-0" />
          Все пары сопоставлены — отлично!
        </div>
      )}

      <style>{`
        @keyframes matchpairs-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
