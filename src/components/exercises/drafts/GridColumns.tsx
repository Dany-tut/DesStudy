'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';

/**
 * DRAFT exercise — "grid-columns": match a target layout grid. The learner sets
 * the column count (stepper) and gutter (slider); a live grid of filled columns
 * renders over a dashed ghost of the target grid. Correct when both column count
 * and gutter match. Trains reading a comp's underlying grid — the invisible
 * scaffold every layout snaps to. Self-contained; own state.
 */

const TARGET_COLS = 6;
const TARGET_GUTTER = 16; // px

const MIN_COLS = 2;
const MAX_COLS = 12;
const MIN_GUTTER = 8;
const MAX_GUTTER = 32;

export function GridColumns() {
  const [cols, setCols] = useState(3);
  const [gutter, setGutter] = useState(24);

  const solved = cols === TARGET_COLS && gutter === TARGET_GUTTER;

  function reset() {
    setCols(3);
    setGutter(24);
  }

  return (
    <div className="w-full max-w-[560px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Собери сетку под цель: {TARGET_COLS} колонок, гаттер {TARGET_GUTTER}px
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[6.5rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : 'Подгоняй'}
        </span>
      </div>

      {/* Live grid over the target ghost */}
      <div className="relative rounded-xl border border-border bg-canvas p-4">
        {/* Target ghost grid */}
        <div
          className="pointer-events-none absolute inset-4 grid"
          style={{ gridTemplateColumns: `repeat(${TARGET_COLS}, 1fr)`, gap: TARGET_GUTTER }}
        >
          {Array.from({ length: TARGET_COLS }).map((_, i) => (
            <div key={i} className="rounded-sm border border-dashed border-tertiary/50" />
          ))}
        </div>
        {/* Learner grid */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: gutter }}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <div
              key={i}
              className={[
                'h-24 rounded-sm transition-base',
                solved ? 'bg-success/40' : 'bg-brand/35',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
        <Stepper label="Колонки" value={cols} unit="" min={MIN_COLS} max={MAX_COLS} step={1} onChange={setCols} />
        <label className="block min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-footnote text-secondary">Гаттер</span>
            <span className="text-footnote text-tertiary tabular-nums">{gutter}px</span>
          </div>
          {/* Match the stepper pill height (h-9 + p-1 = 44px) and center the track within it */}
          <div className="flex h-11 items-center">
            <input
              type="range"
              min={MIN_GUTTER}
              max={MAX_GUTTER}
              step={2}
              value={gutter}
              onChange={(e) => setGutter(Number(e.target.value))}
              className="ui-slider ui-slider--chunky"
              style={{ '--pct': `${((gutter - MIN_GUTTER) / (MAX_GUTTER - MIN_GUTTER)) * 100}%` } as React.CSSProperties}
            />
          </div>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="min-w-0 text-footnote text-secondary">
          {solved
            ? 'Верно — сплошные колонки легли ровно на пунктирную цель.'
            : 'Совмести сплошные колонки с пунктирным контуром цели.'}
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
