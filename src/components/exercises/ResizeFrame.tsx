'use client';

import { useRef } from 'react';
import type { ResizeBreakpoint } from '@/lib/curriculum/types';

/**
 * Exercise type — "resize-frame". The learner drags the frame's right-edge
 * handle to a target breakpoint width. The demo content reflows across the
 * declared breakpoints (columns change), so where the layout should break is
 * *felt* rather than read. Width is reported in px; grading is done upstream.
 */
export function ResizeFrame({
  minWidth,
  maxWidth,
  targetWidth,
  tolerance,
  breakpoints,
  value,
  disabled,
  onChange,
}: {
  minWidth: number;
  maxWidth: number;
  targetWidth: number;
  tolerance: number;
  breakpoints: ResizeBreakpoint[];
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Active band = highest breakpoint whose `at` is ≤ current width.
  const bands = [...breakpoints].sort((a, b) => a.at - b.at);
  const active = bands.reduce((acc, b) => (value >= b.at ? b : acc), bands[0]);
  const columns = active?.columns ?? 1;
  const onTarget = Math.abs(value - targetWidth) <= tolerance;

  function clamp(px: number) {
    return Math.max(minWidth, Math.min(maxWidth, Math.round(px)));
  }

  function startDrag(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const left = track.getBoundingClientRect().left;
    const move = (ev: PointerEvent) => onChange(clamp(ev.clientX - left));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    // Snap immediately to the initial grab point too.
    onChange(clamp(e.clientX - left));
  }

  return (
    <div>
      <div ref={trackRef} className="rounded-lg border border-border bg-canvas p-4">
        {/* Target marker ruler */}
        <div className="relative mb-2 h-4">
          <div
            className="absolute top-0 flex h-4 -translate-x-1/2 flex-col items-center"
            style={{ left: `${((targetWidth - minWidth) / (maxWidth - minWidth)) * 100}%` }}
          >
            <span
              className={[
                'text-caption font-medium tabular-nums transition-fast',
                onTarget ? 'text-success' : 'text-tertiary',
              ].join(' ')}
            >
              ▾ {targetWidth}
            </span>
          </div>
        </div>

        {/* The resizable frame */}
        <div className="relative" style={{ width: value, maxWidth: '100%' }}>
          <div
            className={[
              'overflow-hidden rounded-md border-2 bg-elevated transition-fast',
              onTarget ? 'border-success' : 'border-brand',
            ].join(' ')}
          >
            {/* Faux top bar */}
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-danger/50" />
              <span className="h-2 w-2 rounded-full bg-warning/60" />
              <span className="h-2 w-2 rounded-full bg-success/60" />
              <span className="ml-auto text-caption tabular-nums text-tertiary">
                {active?.label} · {columns} кол.
              </span>
            </div>
            {/* Reflowing content grid */}
            <div className="p-3">
              <div className="mb-3 h-3 w-2/5 rounded-sm bg-brand/50" />
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-sm bg-muted p-2">
                    <div className="mb-1.5 h-8 rounded-sm bg-brand/15" />
                    <div className="mb-1 h-2 w-full rounded-sm bg-muted-foreground/25" />
                    <div className="h-2 w-2/3 rounded-sm bg-muted-foreground/20" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drag handle on the right edge */}
          <button
            type="button"
            onPointerDown={startDrag}
            disabled={disabled}
            aria-label="Тянуть ширину рамки"
            className={[
              'absolute -right-2.5 top-1/2 flex h-14 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-elevated shadow-sm transition-fast',
              disabled ? 'cursor-default opacity-60' : 'cursor-ew-resize hover:bg-muted',
            ].join(' ')}
          >
            <span className="h-6 w-0.5 rounded-full bg-tertiary" />
          </button>
        </div>

        <p className="mt-3 text-caption tabular-nums text-tertiary">
          Ширина: {Math.round(value)}px · перетаскивай ручку справа
        </p>
      </div>
    </div>
  );
}
