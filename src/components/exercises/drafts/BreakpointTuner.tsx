'use client';

import { useRef, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * DRAFT exercise — "breakpoint-tuner": a resizable viewport preview. The learner
 * drags a width handle (320–960px); the card grid inside reflows from 1 column
 * to 2 once the width crosses a breakpoint. Task: set the width to exactly the
 * point where a single column starts to feel too wide (the target breakpoint,
 * with tolerance) — so the switch is chosen by eye, not memorised. Correct when
 * within tolerance. Self-contained; own state.
 */

const MIN = 320;
const MAX = 960;
const TARGET = 640; // where 1-col line length gets uncomfortable
const TOL = 30;

export function BreakpointTuner() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);

  const twoCol = width >= TARGET;
  const solved = Math.abs(width - TARGET) <= TOL;

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    const track = trackRef.current?.getBoundingClientRect();
    if (!track) return;
    const move = (ev: PointerEvent) => {
      const ratio = (ev.clientX - track.left) / track.width;
      setWidth(Math.round(Math.max(MIN, Math.min(MAX, MIN + ratio * (MAX - MIN)))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  const pct = ((width - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="w-full max-w-[640px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Найди ширину, где раскладка должна перейти на 2 колонки
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

      {/* Viewport preview — the card container is exactly `width` px wide. */}
      <div className="overflow-hidden rounded-xl border border-border bg-canvas p-4">
        <div className="mx-auto transition-none" style={{ width }}>
          <div className={twoCol ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-surface p-3">
                <div className="mb-2 h-3 w-1/2 rounded-sm bg-brand/60" />
                <div className="mb-1.5 h-2 w-full rounded-sm bg-tertiary/30" />
                <div className="h-2 w-4/5 rounded-sm bg-tertiary/25" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Width drag track */}
      <div className="mt-5">
        <div ref={trackRef} className="relative h-2 w-full rounded-full bg-muted">
          {/* Target zone */}
          <div
            className="absolute inset-y-0 rounded-full bg-success/25"
            style={{
              left: `${((TARGET - TOL - MIN) / (MAX - MIN)) * 100}%`,
              width: `${((2 * TOL) / (MAX - MIN)) * 100}%`,
            }}
          />
          <div className="absolute inset-y-0 rounded-full bg-brand" style={{ width: `${pct}%` }} />
          <button
            type="button"
            onPointerDown={startDrag}
            aria-label="Тянуть ширину экрана"
            className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-elevated shadow-sm"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-caption tabular-nums text-tertiary">
          <span>{MIN}px</span>
          <span>{MAX}px</span>
        </div>
      </div>

      <p className="mt-4 text-footnote text-secondary">
        {solved
          ? `Верно — около ${TARGET}px строка в одну колонку становится слишком длинной, пора делить.`
          : `Подсказка: цель ≈ ${TARGET}px (±${TOL}). Сейчас ${width}px — ${twoCol ? '2 колонки' : '1 колонка'}.`}
      </p>
    </div>
  );
}
