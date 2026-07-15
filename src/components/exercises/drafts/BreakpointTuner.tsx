'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';

/**
 * DRAFT exercise — "breakpoint-tuner". The learner widens a preview viewport
 * (320–960px); inside, a single column of cards holds a line of text. The point
 * of the exercise is the *reason* a breakpoint exists: a single column works
 * until its content line grows past a comfortable reading measure — then you
 * split into 2 columns so each element stays narrow again.
 *
 * So the "why" is made visible: a dashed guide marks the comfortable measure
 * (≈ MEASURE px). While the column is narrower than that, one column reads fine.
 * Once the text line overshoots the guide, the line is too long — that's the
 * breakpoint. Feedback is directional (too narrow / here / too wide) rather than
 * a hidden magic number. Uses the design-system Slider. Self-contained.
 */

const MIN = 320;
const MAX = 960;
const MEASURE = 640; // comfortable max line length for one column
const TOL = 30; // how close counts as "found the breakpoint"

export function BreakpointTuner() {
  const [width, setWidth] = useState(360);

  // The learner tunes a SINGLE column and watches its text line grow toward a
  // comfort guide. Solved when the line's end lands on the guide (±TOL). Past it
  // the line is too long — that's exactly why one would break to 2 columns.
  const solved = Math.abs(width - MEASURE) <= TOL;
  const tooNarrow = width < MEASURE - TOL;

  // How far the text line overshoots the comfort guide, as % of the column.
  const overshoot = Math.max(0, ((width - MEASURE) / width) * 100);

  return (
    <div className="w-full max-w-[640px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Расширяй колонку, пока строка не станет слишком длинной для чтения — там и стоит перейти на 2 колонки
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[7rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : `${width}px`}
        </span>
      </div>

      {/* Viewport preview — one column, exactly `width` px wide, with a comfort
          guide the learner is tuning the text line up to. */}
      <div className="overflow-hidden rounded-xl border border-border bg-canvas p-4">
        <div className="relative mx-auto" style={{ width }}>
          {/* Comfortable-measure guide (the reading limit). */}
          <div
            className="pointer-events-none absolute inset-y-0 z-10 border-r border-dashed border-success/70"
            style={{ left: Math.min(width, MEASURE) }}
            aria-hidden
          />
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 h-3 w-1/3 rounded-sm bg-brand/60" />
                {/* The content line = full column width. The part spilling past
                    the comfort guide is tinted, so "too long" is literal. */}
                <div className="relative h-2 w-full overflow-hidden rounded-sm bg-tertiary/30">
                  {overshoot > 0 && (
                    <div
                      className="absolute inset-y-0 right-0 bg-warning/70"
                      style={{ width: `${overshoot}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payoff: once found, show what the breakpoint buys — 2 tidy columns. */}
      {solved && (
        <div className="mt-3 rounded-xl border border-success/30 bg-success/10 p-3">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 h-3 w-1/2 rounded-sm bg-brand/60" />
                <div className="h-2 w-full rounded-sm bg-tertiary/30" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-caption text-success">
            ↑ На этой ширине разбиваем на 2 колонки — каждая строка снова короткая.
          </p>
        </div>
      )}

      <div className="mt-6">
        <Slider
          value={width}
          min={MIN}
          max={MAX}
          step={10}
          unit="px"
          celebrate={solved}
          onChange={setWidth}
        />
      </div>

      <p className="mt-2 text-footnote text-secondary">
        {solved
          ? `Здесь строка в одну колонку дошла до предела комфортной длины (≈${MEASURE}px). Дальше её лучше разбить на 2 колонки — так каждый элемент снова узкий и читаемый.`
          : tooNarrow
            ? 'Пока узко — одна колонка ещё читается спокойно. Тяни шире, пока строка не начнёт «переливаться» за пунктирную границу.'
            : 'Уже широко — строка растянулась за границу комфорта (жёлтая зона). Именно поэтому здесь пора на 2 колонки; можно чуть назад, к точке перехода.'}
      </p>
    </div>
  );
}
