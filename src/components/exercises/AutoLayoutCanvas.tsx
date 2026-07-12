'use client';

import { Minus, Plus } from 'lucide-react';
import type { BuildAnswer, BuildExercise } from '@/lib/curriculum/types';

/**
 * Interactive Canvas — auto-layout build surface.
 * A live card whose vertical gap and inner padding the learner tunes on the
 * 8pt grid via steppers. The preview updates in real time; the Geometry Engine
 * (validate.ts, type 'build') checks it deterministically against the target.
 */
export function AutoLayoutCanvas({
  exercise,
  value,
  disabled,
  onChange,
}: {
  exercise: BuildExercise;
  value: BuildAnswer;
  disabled: boolean;
  /** Functional updater — avoids stale-closure bugs on rapid stepping. */
  onChange: (update: (prev: BuildAnswer) => BuildAnswer) => void;
}) {
  const { min, max, step, blocks } = exercise;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const nudgeGap = (delta: number) =>
    onChange((prev) => ({ ...prev, gap: clamp(prev.gap + delta) }));
  const nudgePad = (delta: number) =>
    onChange((prev) => ({ ...prev, padding: clamp(prev.padding + delta) }));

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
      {/* Canvas / live preview */}
      <div
        className="canvas-grid flex items-start justify-center rounded-xl border border-border bg-canvas p-6"
        aria-label="Холст auto-layout"
      >
        <div
          className="w-full max-w-[260px] rounded-lg border border-border-strong bg-surface shadow-sm transition-all"
          style={{ padding: value.padding }}
        >
          <div className="flex flex-col" style={{ gap: value.gap }}>
            {Array.from({ length: blocks }).map((_, i) => (
              <div
                key={i}
                className={`rounded-md ${i === 0 ? 'h-8 bg-brand/70' : 'h-4 bg-muted'}`}
                style={{ width: i === 0 ? '70%' : i % 2 ? '90%' : '60%' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">
        <Stepper
          label="Отступ между блоками"
          value={value.gap}
          disabled={disabled}
          onDec={() => nudgeGap(-step)}
          onInc={() => nudgeGap(step)}
        />
        <Stepper
          label="Внутренние поля"
          value={value.padding}
          disabled={disabled}
          onDec={() => nudgePad(-step)}
          onInc={() => nudgePad(step)}
        />
        <p className="text-caption text-tertiary">
          Шаг {step}px — держись 8pt-сетки.
        </p>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  disabled,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-footnote text-secondary">{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onDec}
          disabled={disabled}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-primary transition-fast hover:bg-muted disabled:opacity-40"
          aria-label={`${label}: уменьшить`}
        >
          <Minus size={16} />
        </button>
        <div className="flex-1 rounded-lg bg-muted py-2 text-center text-callout font-semibold tabular-nums text-primary">
          {value}px
        </div>
        <button
          onClick={onInc}
          disabled={disabled}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-primary transition-fast hover:bg-muted disabled:opacity-40"
          aria-label={`${label}: увеличить`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
