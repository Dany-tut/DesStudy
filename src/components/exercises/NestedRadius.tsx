'use client';

import { Check } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { useT } from '@/lib/i18n/client';

/**
 * Exercise type — "nested-radius". The learner sets the radius of a nested
 * button inside a card. The corners are concentric only when
 * inner = outer − padding; the preview overlays the card's corner arc so the
 * match (or mismatch) is visible directly.
 */
export function NestedRadius({
  outerRadius,
  padding,
  maxRadius,
  value,
  disabled,
  onChange,
}: {
  outerRadius: number;
  padding: number;
  maxRadius: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const { t } = useT();
  const target = outerRadius - padding;
  const concentric = value === target;

  return (
    <div>
      <div className="flex flex-col items-center rounded-lg border border-border bg-canvas p-6">
        {/* Outer card */}
        <div
          className="bg-elevated"
          style={{
            borderRadius: outerRadius,
            padding,
            border: '1px solid var(--border, #e5e7eb)',
          }}
        >
          {/* Nested button */}
          <div
            className={[
              'flex min-w-44 items-center justify-center px-7 py-4 text-callout font-semibold text-on-brand transition-fast',
              concentric ? 'bg-success' : 'bg-brand',
            ].join(' ')}
            style={{ borderRadius: value }}
          >
            {concentric ? (
              <span className="flex items-center gap-1">
                <Check size={16} strokeWidth={3} /> {t('exercises.nestedRadius.concentric')}
              </span>
            ) : (
              t('exercises.nestedRadius.button')
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-caption text-tertiary tabular-nums">
          {t('exercises.nestedRadius.readout', {
            outer: outerRadius,
            padding,
            inner: value,
          })}
        </p>
      </div>

      <div className="mt-5">
        <Slider
          value={value}
          min={0}
          max={maxRadius}
          step={1}
          unit="px"
          accent={concentric ? 'var(--success-rgb)' : undefined}
          celebrate={concentric}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
