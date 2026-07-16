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
const MEASURE = 640; // the breakpoint: past this, one column's line is too long

export function BreakpointTuner() {
  const [width, setWidth] = useState(360);

  // A real breakpoint is a threshold, not a narrow trap: while the viewport is
  // narrower than the comfortable measure it stays ONE column; at MEASURE and
  // wider it becomes TWO columns and STAYS two as you keep widening. So "solved"
  // is simply "you've reached (or passed) the breakpoint".
  const twoCols = width >= MEASURE;
  const solved = twoCols;
  const tooNarrow = !twoCols;

  // The viewport block grows left→right proportional to the width, so dragging
  // gives real visual feedback. A comfort guide is pinned at the breakpoint; the
  // block's right edge advances toward it and, once it reaches the guide, the
  // single card splits into two columns that fill the (now wider) viewport.
  const blockPct = (width / MAX) * 100; // viewport width, grows left→right
  const guidePct = (MEASURE / MAX) * 100; // breakpoint guide — pinned in place

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

      {/* Viewport preview — exactly `width` px wide. While the column is too
          narrow-to-comfortable it stays a single column and the text line grows
          toward a comfort guide. Once the breakpoint is hit, THIS SAME block
          reflows to 2 columns — the payoff happens in place. */}
      <div
        className={[
          'overflow-hidden rounded-xl border p-4 transition-base',
          solved ? 'border-success/30 bg-success/10' : 'border-border bg-canvas',
        ].join(' ')}
      >
        {/* The whole card is the "canvas"; the viewport is a distinctly-framed
            block that grows left→right inside it. The empty area to its right is
            the room it still has to grow — so it reads as head-room, not a break. */}
        <div className="relative min-h-[132px]">
          {/* Breakpoint guide — pinned at MEASURE so the block visibly grows
              toward it. Before the split it reads as "the limit you're growing
              toward"; after the split it marks where the switch happened. */}
          <div
            className="pointer-events-none absolute inset-y-0 z-10 flex flex-col items-start"
            style={{ left: `${guidePct}%` }}
            aria-hidden
          >
            <span
              className={[
                '-ml-px whitespace-nowrap rounded-r-sm px-1.5 py-0.5 text-[10px] font-medium leading-none transition-base',
                solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
              ].join(' ')}
            >
              {solved ? 'здесь разбили' : 'предел читаемости'}
            </span>
            <div
              className={[
                'w-px flex-1 border-r border-dashed transition-base',
                solved ? 'border-success/70' : 'border-tertiary/50',
              ].join(' ')}
            />
          </div>
          {/* Growing viewport — left-aligned, width proportional to the slider so
              it always fits the card and its right edge advances on the guide.
              Its own border + soft shadow make it read as a real resizable frame
              sitting on the canvas rather than content stranded at the edge. */}
          <div
            className={[
              'rounded-lg border bg-surface p-3 shadow-sm transition-base',
              solved ? 'border-success/40' : 'border-border',
            ].join(' ')}
            style={{ width: `${blockPct}%` }}
          >
            {/* One column = ONE card; at the breakpoint it splits into TWO cards
                side by side that fill the (wider) viewport. Each card's content
                line spans its own column, so after the split every line is short
                again — the whole reason to break to 2 columns. */}
            <div className={['grid gap-3', twoCols ? 'grid-cols-2' : 'grid-cols-1'].join(' ')}>
              {Array.from({ length: twoCols ? 2 : 1 }).map((_, i) => (
                <div key={i} className="rounded-md bg-canvas p-2.5">
                  <div className={['mb-2 h-3 rounded-sm bg-brand/60', twoCols ? 'w-1/2' : 'w-1/3'].join(' ')} />
                  <div className="h-2 w-full rounded-sm bg-tertiary/30" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payoff caption — the block above already reflowed to 2 columns. */}
      {solved && (
        <p className="mt-2 text-caption text-success">
          ↑ На этой ширине разбили на 2 колонки — каждая строка снова короткая.
        </p>
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
          ? `На ${MEASURE}px и шире строка в одну колонку стала бы слишком длинной для чтения — поэтому здесь макет разбивается на 2 колонки, и каждый элемент снова узкий и читаемый. Это и есть breakpoint.`
          : 'Пока узко — одна колонка читается спокойно. Тяни шире, к пунктирной границе: там строка дойдёт до предела и макет перестроится на 2 колонки.'}
      </p>
    </div>
  );
}
