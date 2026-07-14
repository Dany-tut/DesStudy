'use client';

import { useRef, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * DRAFT exercise — "tap-target": drag the button's corner handle to grow it past
 * the 44×44px minimum touch target (Apple HIG / WCAG 2.5.5). A translucent
 * fingertip disc (44px) overlays the button so «too small to tap» is felt, not
 * memorised. Correct once both dimensions clear 44px. Self-contained; own state.
 */

const MIN = 44; // minimum tap target, px
const FLOOR = 24;
const CEIL = 96;

export function TapTarget() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 30, h: 28 });

  const ok = size.w >= MIN && size.h >= MIN;

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    const origin = areaRef.current?.getBoundingClientRect();
    if (!origin) return;
    // Button is centred; half-deltas from centre → full dimension.
    const cx = origin.left + origin.width / 2;
    const cy = origin.top + origin.height / 2;
    const clamp = (v: number) => Math.max(FLOOR, Math.min(CEIL, Math.round(v)));
    const move = (ev: PointerEvent) => {
      setSize({ w: clamp((ev.clientX - cx) * 2), h: clamp((ev.clientY - cy) * 2) });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Увеличь кнопку до безопасной тап-цели (≥44px)
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[6rem]',
            ok ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {ok ? 'Готово' : 'Мелко'}
        </span>
      </div>

      <div ref={areaRef} className="relative flex h-56 items-center justify-center rounded-xl border border-border bg-canvas">
        {/* 44px fingertip reference */}
        <span
          className="pointer-events-none absolute rounded-full border border-dashed border-tertiary/60 bg-tertiary/10"
          style={{ width: MIN, height: MIN }}
        />
        {/* Resizable button */}
        <div
          className={[
            'relative flex items-center justify-center rounded-lg text-caption font-semibold transition-fast',
            ok ? 'bg-success text-on-brand' : 'bg-brand text-on-brand',
          ].join(' ')}
          style={{ width: size.w, height: size.h }}
        >
          <span className="truncate px-1">OK</span>
          {/* Corner drag handle */}
          <button
            type="button"
            onPointerDown={startDrag}
            aria-label="Тянуть размер кнопки"
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border border-border bg-elevated shadow-sm"
          />
        </div>
      </div>

      <p className="mt-4 text-caption tabular-nums text-tertiary">
        {size.w}×{size.h}px {ok ? '· палец попадёт уверенно' : `· нужно ≥ ${MIN}×${MIN}px`}
      </p>
    </div>
  );
}
