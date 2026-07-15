'use client';

import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

/**
 * DRAFT exercise — "tap-target": drag the button's corner handle to grow it past
 * the 44×44px minimum touch target (Apple HIG / WCAG 2.5.5). A translucent
 * fingertip disc (44px) overlays the button so «too small to tap» is felt, not
 * memorised. Correct once both dimensions clear 44px. Self-contained; own state.
 */

const MIN = 44; // minimum tap target, px
const FLOOR = 24;
const CEIL = 96;

type Size = { w: number; h: number };

/**
 * Optional props promote this draft to a real exercise: when `onChange` is
 * given the size is lifted to the player (controlled); with no props it runs
 * self-contained in the gallery.
 */
export function TapTarget({
  value,
  min = MIN,
  disabled,
  onChange,
}: {
  value?: Size | null;
  min?: number;
  disabled?: boolean;
  onChange?: (v: Size) => void;
} = {}) {
  const { t } = useT();
  const areaRef = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState<Size>({ w: 30, h: 28 });
  const size = value ?? internal;
  const setSize = (s: Size) => (onChange ? onChange(s) : setInternal(s));

  const ok = size.w >= min && size.h >= min;

  function startDrag(e: React.PointerEvent) {
    if (disabled) return;
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
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">{t('exercises.tapTarget.taskLabel')}</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            {t('exercises.tapTarget.prompt')}
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[6rem]',
            ok ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {ok ? t('exercises.tapTarget.done') : t('exercises.tapTarget.tooSmall')}
        </span>
      </div>

      <div ref={areaRef} className="relative flex h-56 items-center justify-center rounded-xl border border-border bg-canvas">
        {/* fingertip reference at the minimum tap size */}
        <span
          className="pointer-events-none absolute rounded-full border border-dashed border-tertiary/60 bg-tertiary/10"
          style={{ width: min, height: min }}
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
            aria-label={t('exercises.tapTarget.dragHandle')}
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border border-border bg-elevated shadow-sm"
          />
        </div>
      </div>

      <p className="mt-4 text-caption tabular-nums text-tertiary">
        {size.w}×{size.h}px {ok ? t('exercises.tapTarget.hitConfident') : t('exercises.tapTarget.needMin', { min })}
      </p>
    </div>
  );
}
