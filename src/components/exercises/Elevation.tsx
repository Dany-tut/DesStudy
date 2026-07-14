'use client';

import { useRef } from 'react';
import { Check } from 'lucide-react';

/**
 * Exercise type — "elevation". The learner drags a card vertically to lift it
 * through a discrete elevation token scale (0 = flat … maxLevel = highest). The
 * shadow's y-offset, blur and opacity all derive from the level, so elevation
 * reads as *one token*, not four free-form shadow knobs. Level is reported up.
 */
export function Elevation({
  maxLevel,
  targetLevel,
  label,
  value,
  disabled,
  onChange,
}: {
  maxLevel: number;
  targetLevel: number;
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const onTarget = value === targetLevel;

  // Discrete shadow tokens derived from the level — a real elevation ramp.
  const y = value * 4;
  const blur = value * 6;
  const opacity = value === 0 ? 0 : 0.08 + value * 0.04;
  const shadow = value === 0 ? 'none' : `0 ${y}px ${blur}px rgba(15, 23, 42, ${opacity})`;
  // Lift the card upward a little per level for a physical "raised" feel.
  const lift = value * 8;

  function levelFromClientY(clientY: number, height: number) {
    const top = areaRef.current?.getBoundingClientRect().top ?? 0;
    // Higher (smaller y) → higher level. Split the track into maxLevel+1 bands.
    const frac = 1 - Math.max(0, Math.min(1, (clientY - top) / height));
    return Math.round(frac * maxLevel);
  }

  function startDrag(e: React.PointerEvent) {
    if (disabled) return;
    e.preventDefault();
    const area = areaRef.current;
    if (!area) return;
    const height = area.getBoundingClientRect().height;
    const move = (ev: PointerEvent) => onChange(levelFromClientY(ev.clientY, height));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    onChange(levelFromClientY(e.clientY, height));
  }

  return (
    <div>
      <div className="flex gap-4 rounded-lg border border-border bg-canvas p-4">
        {/* Level ladder */}
        <div className="flex flex-col-reverse justify-between py-2">
          {Array.from({ length: maxLevel + 1 }).map((_, lvl) => (
            <span
              key={lvl}
              className={[
                'text-caption font-medium tabular-nums transition-fast',
                lvl === value ? 'text-brand' : lvl === targetLevel ? 'text-success' : 'text-tertiary',
              ].join(' ')}
            >
              {lvl === targetLevel ? '◎' : '·'} {lvl}
            </span>
          ))}
        </div>

        {/* Drag area */}
        <div ref={areaRef} className="relative flex-1" style={{ minHeight: 200 }}>
          <div className="flex h-full items-center justify-center">
            <button
              type="button"
              onPointerDown={startDrag}
              disabled={disabled}
              aria-label="Тянуть карточку вверх, чтобы поднять уровень"
              className={[
                'flex min-h-24 w-52 select-none flex-col items-center justify-center gap-1 rounded-lg bg-elevated px-5 py-4 transition-fast',
                disabled ? 'cursor-default' : 'cursor-ns-resize',
                onTarget ? 'ring-2 ring-success' : '',
              ].join(' ')}
              style={{ boxShadow: shadow, transform: `translateY(${-lift}px)` }}
            >
              <span className="text-callout font-semibold text-primary">{label}</span>
              <span
                className={[
                  'flex items-center gap-1 text-caption tabular-nums',
                  onTarget ? 'text-success' : 'text-tertiary',
                ].join(' ')}
              >
                {onTarget ? (
                  <>
                    <Check size={13} strokeWidth={3} /> уровень {value}
                  </>
                ) : (
                  <>elevation {value}</>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 text-caption text-tertiary">
        Тяни карточку вверх/вниз — тень меняется по шкале токенов, а не вручную.
      </p>
    </div>
  );
}
