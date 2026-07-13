'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';

/** Modular scale ratios common in typography. 1.25 is the UI sweet spot. */
const RATIOS = [
  { value: 1.125, name: 'Малая секунда' },
  { value: 1.25, name: 'Большая терция' },
  { value: 1.333, name: 'Чистая кварта' },
  { value: 1.5, name: 'Чистая квинта' },
] as const;

/** Recommended ratio for interface type scales. */
const UI_RATIO = 1.25;

/** Six ascending steps of the scale, rendered bottom-up (caption → display). */
const STEPS = [
  { key: 'caption', label: 'Caption', n: -1 },
  { key: 'body', label: 'Body', n: 0 },
  { key: 'h3', label: 'H3', n: 1 },
  { key: 'h2', label: 'H2', n: 2 },
  { key: 'h1', label: 'H1', n: 3 },
  { key: 'display', label: 'Display', n: 4 },
] as const;

/**
 * DRAFT exercise — "scale-ramp".
 * Learner picks a base body size and a modular ratio, then sees a full
 * type scale render live: size = base * ratio^n, rounded to whole px.
 */
export function ScaleRamp() {
  const [ratio, setRatio] = useState<number>(UI_RATIO);
  const [base, setBase] = useState<number>(16);

  const isUiRatio = ratio === UI_RATIO;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      {/* Header */}
      <div className="mb-5">
        <h3 className="text-title3 font-semibold text-primary">Модульная шкала</h3>
        <p className="mt-1 text-footnote text-secondary">
          Хорошая шкала — это ОДНО соотношение, применённое последовательно.
        </p>
      </div>

      {/* Ratio picker */}
      <div className="mb-4">
        <p className="mb-2 text-footnote text-secondary">Соотношение</p>
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => {
            const active = r.value === ratio;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRatio(r.value)}
                aria-pressed={active}
                className={[
                  'flex flex-col items-start rounded-lg px-3 py-2 text-left transition-fast',
                  active
                    ? 'bg-brand text-on-brand'
                    : 'bg-muted text-secondary hover:bg-hover',
                ].join(' ')}
              >
                <span className="text-callout font-semibold tabular-nums">{r.value}</span>
                <span
                  className={[
                    'text-caption',
                    active ? 'text-on-brand' : 'text-tertiary',
                  ].join(' ')}
                >
                  {r.name}
                </span>
              </button>
            );
          })}
        </div>
        {isUiRatio && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-caption font-medium text-brand">
            <Sparkles size={13} />
            рекомендуется для UI
          </div>
        )}
      </div>

      {/* Base size stepper */}
      <div className="mb-5">
        <Stepper
          label="Базовый размер (body)"
          value={base}
          unit="px"
          min={14}
          max={18}
          step={1}
          variant="pill"
          onChange={setBase}
        />
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border bg-canvas p-4">
        <p className="mb-3 text-caption uppercase tracking-wide text-tertiary">
          Живой предпросмотр
        </p>
        <div className="flex flex-col gap-3">
          {[...STEPS].reverse().map((step) => {
            const size = Math.round(base * Math.pow(ratio, step.n));
            return (
              <div key={step.key} className="flex items-baseline gap-3">
                <span className="w-14 shrink-0 text-caption tabular-nums text-tertiary">
                  {step.label}
                </span>
                <span
                  className="min-w-0 truncate font-semibold leading-tight text-primary transition-base"
                  style={{ fontSize: `${size}px` }}
                >
                  Заголовок
                </span>
                <span className="ml-auto shrink-0 text-footnote tabular-nums text-tertiary">
                  {size}px
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
