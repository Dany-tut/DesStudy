'use client';

import { useRef } from 'react';

/** Mirrors src/design/tokens.ts `radius` (draggable range only — 'full' isn't a point on this scale). */
const RADIUS_TOKENS = [
  { name: 'none', v: 0 },
  { name: 'sm', v: 6 },
  { name: 'md', v: 10 },
  { name: 'lg', v: 14 },
  { name: 'xl', v: 20 },
  { name: '2xl', v: 28 },
] as const;

function nearestToken(v: number) {
  let best: (typeof RADIUS_TOKENS)[number] | null = null;
  let bestDist = Infinity;
  for (const t of RADIUS_TOKENS) {
    const d = Math.abs(t.v - v);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return bestDist <= 1.6 ? best : null;
}

/**
 * Direct-manipulation radius picker for 'tune' exercises with visual: 'radius'.
 * Drag the corner handle — the card rounds live and magnetically snaps to the
 * `radius` token scale, same feel as BuildExercise's canvas but for a single value.
 */
export function RadiusDragTune({
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // A ref, not state — pointerdown/pointermove can fire back-to-back within
  // the same tick (fast drags, automated tests), and a state-based flag reads
  // stale (false) until React re-renders. Slider.tsx uses the same fix.
  const draggingRef = useRef(false);
  const snapped = nearestToken(value);

  function commit(raw: number) {
    const clamped = Math.min(max, Math.max(min, raw));
    const snap = nearestToken(clamped);
    onChange(Math.round(snap ? snap.v : clamped));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || disabled) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    commit((e.clientX - rect.left + (e.clientY - rect.top)) / 2);
  }
  function onPointerUp() {
    draggingRef.current = false;
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') commit(value + 2);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') commit(value - 2);
  }

  return (
    <div className="flex flex-wrap items-center gap-10">
      <div className="canvas-grid flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-border">
        <div
          ref={cardRef}
          className="relative h-[120px] w-[120px] border border-border-strong bg-muted shadow-sm"
          style={{ borderRadius: value }}
        >
          <div
            role="slider"
            aria-label="Радиус"
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className={[
              'absolute h-[22px] w-[22px] touch-none rounded-full border-[3px] border-surface bg-brand shadow-md',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab active:cursor-grabbing',
            ].join(' ')}
            style={{ left: value - 11, top: value - 11 }}
          />
        </div>
      </div>

      <div>
        <p className="text-title2 font-bold tabular-nums text-primary">{value}px</p>
        <p className="mt-0.5 h-[18px] text-footnote font-semibold text-brand">
          {snapped ? `radius.${snapped.name}` : ''}
        </p>
        <div className="mt-4 flex flex-col gap-1">
          {RADIUS_TOKENS.filter((t) => t.v <= max).map((t) => {
            const active = snapped?.name === t.name;
            return (
              <button
                key={t.name}
                type="button"
                disabled={disabled}
                onClick={() => commit(t.v)}
                className={[
                  'flex items-center gap-3 rounded-lg px-2 py-1.5 text-left text-footnote transition-fast',
                  active ? 'bg-brand/10 text-primary' : 'text-secondary hover:bg-hover',
                  disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-6 w-6 shrink-0 border transition-fast',
                    active ? 'border-brand bg-brand/20' : 'border-border-strong bg-muted',
                  ].join(' ')}
                  style={{ borderRadius: Math.min(Math.round(t.v / 2), 13) }}
                />
                <span className="tabular-nums">
                  <span className="font-medium">radius.{t.name}</span>
                  <span className="text-tertiary"> · {t.v}px</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
