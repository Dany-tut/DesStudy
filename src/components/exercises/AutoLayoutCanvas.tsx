'use client';

import type { BuildAnswer, BuildExercise } from '@/lib/curriculum/types';
import { Stepper } from '@/components/ui/Stepper';

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
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(v) => nudgeGap(v - value.gap)}
        />
        <Stepper
          label="Внутренние поля"
          value={value.padding}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(v) => nudgePad(v - value.padding)}
        />
        <p className="text-caption text-tertiary">
          Шаг {step}px — держись 8pt-сетки.
        </p>
      </div>
    </div>
  );
}
