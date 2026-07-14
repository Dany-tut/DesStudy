'use client';

import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';
import { Slider } from '@/components/ui/Slider';

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
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
        <Stepper label="Колонки" value={cols} unit="" min={MIN_COLS} max={MAX_COLS} step={1} onChange={setCols} />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-footnote text-secondary">Гаттер</p>
          <Slider value={gutter} min={MIN_GUTTER} max={MAX_GUTTER} step={2} unit="px" onChange={setGutter} />
        </div>
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
