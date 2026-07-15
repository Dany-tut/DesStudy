'use client';

import { useState, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

// Default hotspot zone, expressed in % relative to the mockup container.
// The tiny primary button sits in the bottom-right corner — that's the problem.
const DEFAULT_ZONE = { x0: 74, y0: 82, x1: 98, y1: 98 };

type Marker = { x: number; y: number; correct: boolean };

/**
 * Exercise type — "hotspot": click the problem area on a mockup. Dual-mode:
 * no props → standalone showcase; pass `value`/`onChange` (+ optional `zone`)
 * to drive it as a graded exercise. Reports the click point {x,y} in % up for
 * validation; the player renders the verdict.
 */
export function Hotspot({
  zone = DEFAULT_ZONE,
  value,
  disabled,
  onChange,
}: {
  zone?: { x0: number; y0: number; x1: number; y1: number };
  value?: { x: number; y: number } | null;
  disabled?: boolean;
  onChange?: (point: { x: number; y: number }) => void;
} = {}) {
  const { t } = useT();
  const controlled = onChange !== undefined;
  const ZONE = zone;
  const [internalMarker, setInternalMarker] = useState<Marker | null>(null);
  const marker: Marker | null = controlled
    ? value
      ? {
          x: value.x,
          y: value.y,
          correct: value.x >= ZONE.x0 && value.x <= ZONE.x1 && value.y >= ZONE.y0 && value.y <= ZONE.y1,
        }
      : null
    : internalMarker;
  const mockRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return;
    const rect = mockRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (controlled) {
      onChange!({ x, y });
      return;
    }
    const correct =
      x >= ZONE.x0 && x <= ZONE.x1 && y >= ZONE.y0 && y <= ZONE.y1;
    setInternalMarker({ x, y, correct });
  }

  return (
    <div className={controlled ? '' : 'rounded-xl border border-border bg-surface p-5'}>
      {!controlled && (
        <div className="mb-4">
          <h3 className="text-title3 text-primary">{t('exercises.hotspot.title')}</h3>
          <p className="mt-1 text-footnote text-secondary">
            {t('exercises.hotspot.subtitle')}
          </p>
        </div>
      )}

      {/* Fake app screen mockup */}
      <div
        ref={mockRef}
        onClick={handleClick}
        className="relative mx-auto w-full max-w-[280px] cursor-pointer select-none overflow-hidden rounded-2xl border border-border-strong bg-elevated shadow-md transition-base"
        style={{ aspectRatio: '9 / 16' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-4">
          <span className="text-callout font-semibold text-primary">{t('exercises.hotspot.profile')}</span>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-2 w-2 rounded-full bg-muted" />
          </div>
        </div>

        {/* List rows */}
        <div className="flex flex-col">
          {[
            t('exercises.hotspot.rowNotifications'),
            t('exercises.hotspot.rowPrivacy'),
            t('exercises.hotspot.rowAppearance'),
          ].map((row) => (
            <div
              key={row}
              className="flex items-center gap-3 border-b border-border px-4 py-4"
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="text-footnote font-medium text-primary">{row}</div>
                <div className="mt-1 h-2 w-20 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>

        {/* Deliberate problem: primary action is a tiny button in the corner */}
        <button
          type="button"
          className="absolute rounded-md bg-brand text-on-brand shadow-sm transition-fast"
          style={{
            right: 8,
            bottom: 8,
            width: 24,
            height: 20,
            fontSize: 8,
          }}
          tabIndex={-1}
        >
          OK
        </button>

        {/* User's click marker */}
        {marker && (
          <span
            className={[
              'pointer-events-none absolute rounded-full border-2',
              marker.correct
                ? 'border-success bg-success/10'
                : 'border-danger bg-danger/10',
            ].join(' ')}
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              width: 14,
              height: 14,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}

        {/* Success pulse ring on the correct zone */}
        {marker?.correct && (
          <span
            className="pointer-events-none absolute animate-ping rounded-full border-2 border-success"
            style={{
              left: `${(ZONE.x0 + ZONE.x1) / 2}%`,
              top: `${(ZONE.y0 + ZONE.y1) / 2}%`,
              width: 40,
              height: 40,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      {/* Feedback — only in standalone mode; the player renders its own verdict */}
      {!controlled && marker && (
        <div
          className={[
            'mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 transition-base',
            marker.correct
              ? 'border-success bg-success/10 text-success'
              : 'border-danger bg-danger/10 text-danger',
          ].join(' ')}
        >
          {marker.correct ? (
            <Check size={16} strokeWidth={2.5} />
          ) : (
            <X size={16} strokeWidth={2.5} />
          )}
          <span className="text-footnote">
            {marker.correct
              ? t('exercises.hotspot.correct')
              : t('exercises.hotspot.wrong')}
          </span>
        </div>
      )}

      {!controlled && !marker && (
        <p className="mt-4 text-caption text-tertiary">
          {t('exercises.hotspot.hint')}
        </p>
      )}
    </div>
  );
}
