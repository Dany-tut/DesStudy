'use client';

import { Layers, Send, type LucideIcon } from 'lucide-react';

/**
 * The floating bottom step-bar — the assignment authoring flow. The former
 * import / two-variants / defects stages are now one unified «Редактор»: you
 * lay out the screen, mark frames as эталон/косячный right on the canvas, and
 * promote layers to critique zones — all in one place. Publishing stays its
 * own final stage.
 *  ① Редактор — слои, роли фреймов (эталон/косячный), зоны критики
 *  ② Доступ   — тип задания, кому открыть, публикация
 */
export type EditorStep = 1 | 2;

interface Step {
  id: EditorStep;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const STEPS: Step[] = [
  { id: 1, label: 'Редактор', hint: 'Слои, роли, зоны', icon: Layers },
  { id: 2, label: 'Доступ', hint: 'Тип и публикация', icon: Send },
];

export function StepBar({
  step,
  onStep,
  enabledThrough,
}: {
  step: EditorStep;
  onStep: (s: EditorStep) => void;
  /** Highest step reachable so far (steps beyond are locked/dimmed). */
  enabledThrough: EditorStep;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="glass pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5 shadow-lg">
        {STEPS.map((s) => {
          const active = s.id === step;
          const locked = s.id > enabledThrough;
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              disabled={locked}
              onClick={() => onStep(s.id)}
              className={[
                'flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-base',
                active
                  ? 'bg-brand text-on-brand'
                  : locked
                    ? 'cursor-not-allowed text-tertiary/60'
                    : 'text-secondary hover:bg-hover hover:text-primary',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-caption font-semibold tabular-nums',
                  active ? 'bg-white/20' : 'bg-hover',
                ].join(' ')}
              >
                {s.id}
              </span>
              <span className="hidden flex-col leading-tight sm:flex">
                <span className="text-footnote font-semibold">{s.label}</span>
                <span className={active ? 'text-caption text-on-brand/70' : 'text-caption text-tertiary'}>
                  {s.hint}
                </span>
              </span>
              <Icon size={15} className="sm:hidden" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
