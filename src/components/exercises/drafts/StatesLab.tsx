'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

type StateKey = 'default' | 'hover' | 'active' | 'focus' | 'disabled';

const STATES: { key: StateKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'hover', label: 'Hover' },
  { key: 'active', label: 'Active' },
  { key: 'focus', label: 'Focus' },
  { key: 'disabled', label: 'Disabled' },
];

/** Token recipe per state — what changes relative to the resting button. */
const RECIPES: Record<StateKey, { tokens: string[]; note: string }> = {
  default: {
    tokens: ['bg-brand', 'text-on-brand', 'rounded-lg'],
    note: 'Базовое состояние — цвет бренда, читаемый текст.',
  },
  hover: {
    tokens: ['bg-brand-hover', 'cursor-pointer'],
    note: 'Курсор наведён — фон чуть темнее, сигнал «кликабельно».',
  },
  active: {
    tokens: ['bg-pressed', 'scale-95'],
    note: 'Нажатие — самый тёмный фон и лёгкое сжатие.',
  },
  focus: {
    tokens: ['ring-2 ring-brand', 'outline-none'],
    note: 'Фокус с клавиатуры — кольцо вокруг кнопки для доступности.',
  },
  disabled: {
    tokens: ['opacity-50', 'cursor-not-allowed'],
    note: 'Недоступно — приглушённый вид, действие заблокировано.',
  },
};

/**
 * Exercise type — "states". Dual-mode: no props → standalone showcase; pass
 * `value`/`onChange` to drive it as a graded exercise (reports the visited-state
 * keys up, correct once all five are inspected).
 */
export function StatesLab({
  value,
  disabled,
  onChange,
}: {
  value?: string[];
  disabled?: boolean;
  onChange?: (visited: string[]) => void;
} = {}) {
  const controlled = onChange !== undefined;
  // Which state the learner forced via the pill row.
  const [forced, setForced] = useState<StateKey>('default');
  // Live pointer state on the real preview button (only relevant when forced === 'default').
  const [isHovering, setIsHovering] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  // Which state pills have been inspected — drives the checklist progress.
  const [internalVisited, setInternalVisited] = useState<Set<StateKey>>(new Set(['default']));
  const visited = controlled ? new Set((value ?? []) as StateKey[]) : internalVisited;

  function selectState(key: StateKey) {
    if (disabled) return;
    setForced(key);
    setIsHovering(false);
    setIsPressing(false);
    if (visited.has(key)) return;
    const next = new Set(visited);
    next.add(key);
    if (controlled) onChange!([...next]);
    else setInternalVisited(next);
  }

  // Resolve the state actually being shown: a forced non-default pill wins,
  // otherwise live pointer interaction on the button drives it.
  const liveState: StateKey =
    forced !== 'default'
      ? forced
      : isPressing
        ? 'active'
        : isHovering
          ? 'hover'
          : 'default';

  const recipe = RECIPES[liveState];
  const allSeen = visited.size === STATES.length;

  // Build the preview button's visual purely from the resolved state.
  const btnBg =
    liveState === 'active'
      ? 'bg-pressed'
      : liveState === 'hover'
        ? 'bg-brand-hover'
        : 'bg-brand';
  const btnRing = liveState === 'focus' ? 'ring-2 ring-brand ring-offset-2 ring-offset-canvas' : '';
  const btnDisabledLook = liveState === 'disabled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:rounded-2xl lg:rounded-3xl">
      {/* Header */}
      <div>
        <h3 className="text-callout font-semibold text-primary">Лаборатория состояний</h3>
        <p className="mt-1 text-footnote text-secondary">
          Кнопка должна ясно отвечать на действия. Переключай состояния и сверяй рецепт токенов.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — live preview + pill row */}
        <div className="flex flex-col gap-4">
          <div
            className="canvas-grid flex h-[180px] items-center justify-center rounded-lg border border-border sm:rounded-xl lg:rounded-2xl"
            style={{ backgroundColor: 'transparent' }}
          >
            <button
              type="button"
              disabled={liveState === 'disabled'}
              onMouseEnter={() => forced === 'default' && setIsHovering(true)}
              onMouseLeave={() => {
                if (forced === 'default') {
                  setIsHovering(false);
                  setIsPressing(false);
                }
              }}
              onMouseDown={() => forced === 'default' && setIsPressing(true)}
              onMouseUp={() => forced === 'default' && setIsPressing(false)}
              className={[
                'px-6 py-3 text-callout font-semibold text-on-brand rounded-lg outline-none transition-fast',
                btnBg,
                btnRing,
                btnDisabledLook,
              ].join(' ')}
              style={{ transform: liveState === 'active' ? 'scale(0.95)' : 'scale(1)' }}
            >
              Продолжить
            </button>
          </div>

          {/* Force-preview pills */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-elevated p-1">
            {STATES.map((s) => {
              const on = forced === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => selectState(s.key)}
                  className={[
                    'flex items-center gap-1 rounded-full px-3 py-1 text-footnote font-medium transition-fast',
                    on
                      ? 'bg-brand text-on-brand'
                      : 'text-secondary hover:bg-hover hover:text-primary',
                  ].join(' ')}
                >
                  {visited.has(s.key) && (
                    <Check className={on ? 'text-on-brand' : 'text-success'} size={13} strokeWidth={3} />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>

          <p className="text-caption text-tertiary">
            Наведи и нажми кнопку в режиме Default — она реагирует вживую.
          </p>
        </div>

        {/* RIGHT — recipe + checklist */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-elevated p-4 sm:rounded-xl lg:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-footnote font-semibold text-primary">
                Рецепт: {STATES.find((s) => s.key === liveState)?.label}
              </span>
              <span className="rounded-full bg-brand/10 px-2 py-1 text-caption font-medium text-brand">
                {liveState}
              </span>
            </div>
            <p className="mt-2 min-h-[2.5rem] text-caption text-secondary">{recipe.note}</p>
            <ul className="mt-3 flex min-h-[6.75rem] flex-col gap-1">
              {recipe.tokens.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-md bg-surface px-2 py-1 text-footnote text-primary"
                >
                  <span className="h-2 w-2 rounded-full bg-brand" />
                  <code className="font-mono text-caption text-secondary">{t}</code>
                </li>
              ))}
            </ul>
          </div>

          {/* Checklist / проверка */}
          <div className="rounded-lg border border-border bg-elevated p-4 sm:rounded-xl lg:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-footnote font-semibold text-primary">Проверка состояний</span>
              <span
                className={[
                  'text-caption font-semibold tabular-nums',
                  allSeen ? 'text-success' : 'text-tertiary',
                ].join(' ')}
              >
                {visited.size}/{STATES.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={[
                  'h-full rounded-full transition-base',
                  allSeen ? 'bg-success' : 'bg-brand',
                ].join(' ')}
                style={{ width: `${(visited.size / STATES.length) * 100}%` }}
              />
            </div>

            <ul className="mt-3 flex flex-col gap-1">
              {STATES.map((s) => {
                const seen = visited.has(s.key);
                return (
                  <li key={s.key} className="flex items-center gap-2 text-footnote">
                    <span
                      className={[
                        'flex h-4 w-4 items-center justify-center rounded-full border transition-fast',
                        seen ? 'border-success bg-success' : 'border-border-strong bg-transparent',
                      ].join(' ')}
                    >
                      {seen && <Check className="text-on-brand" size={11} strokeWidth={3} />}
                    </span>
                    <span className={seen ? 'text-primary' : 'text-tertiary'}>{s.label}</span>
                  </li>
                );
              })}
            </ul>

            <div
              className={[
                'mt-3 rounded-md px-3 py-2 text-caption font-medium transition-base',
                allSeen
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-tertiary',
              ].join(' ')}
            >
              {allSeen ? 'Все 5 состояний различимы ✓' : 'Осмотри каждое состояние, чтобы закрыть проверку.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
