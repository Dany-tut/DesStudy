'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

type StateKey = 'default' | 'hover' | 'active' | 'focus' | 'disabled';

const STATES: { key: StateKey; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'hover', label: 'Hover' },
  { key: 'active', label: 'Active' },
  { key: 'focus', label: 'Focus' },
  { key: 'disabled', label: 'Disabled' },
];

/**
 * Token recipe per state.
 *  - `tokens` — the correct tokens for the state.
 *  - `wrong`  — a plausible-but-wrong token deliberately spliced into the shown
 *               recipe. If present, the learner must spot & flag it; if absent,
 *               the recipe is clean and the learner confirms it.
 *  - `note` / `wrongNote` — translation keys resolved at render via t().
 */
const RECIPES: Record<
  StateKey,
  { tokens: string[]; wrong?: string; note: string; wrongNote?: string }
> = {
  default: {
    tokens: ['bg-brand', 'text-on-brand', 'rounded-lg'],
    note: 'exercises.statesLab.noteDefault',
  },
  hover: {
    tokens: ['bg-brand-hover', 'cursor-pointer'],
    wrong: 'scale-95',
    note: 'exercises.statesLab.noteHover',
    wrongNote: 'exercises.statesLab.wrongHover',
  },
  active: {
    tokens: ['bg-pressed', 'scale-95'],
    note: 'exercises.statesLab.noteActive',
  },
  focus: {
    tokens: ['ring-2 ring-brand', 'outline-none'],
    wrong: 'opacity-50',
    note: 'exercises.statesLab.noteFocus',
    wrongNote: 'exercises.statesLab.wrongFocus',
  },
  disabled: {
    tokens: ['opacity-50', 'cursor-not-allowed'],
    wrong: 'bg-brand-hover',
    note: 'exercises.statesLab.noteDisabled',
    wrongNote: 'exercises.statesLab.wrongDisabled',
  },
};

/** Deterministic display order: wrong token (if any) sits at index 1. */
function shownTokens(r: (typeof RECIPES)[StateKey]): string[] {
  if (!r.wrong) return r.tokens;
  return [r.tokens[0], r.wrong, ...r.tokens.slice(1)];
}

/**
 * Exercise type — "states". The learner reviews each state's token recipe and
 * decides whether it's correct or hides a wrong token, then flags it. A state
 * is *resolved* only once judged correctly; the reported value is the list of
 * resolved state keys (graded correct when all five are resolved). Passing no
 * props renders a standalone showcase.
 */
export function StatesLab({
  value,
  disabled,
  onChange,
}: {
  value?: string[];
  disabled?: boolean;
  onChange?: (resolved: string[]) => void;
} = {}) {
  const { t } = useT();
  const controlled = onChange !== undefined;
  // Which state the learner is currently reviewing.
  const [forced, setForced] = useState<StateKey>('default');
  // Live pointer state on the preview button (only relevant when forced === 'default').
  const [isHovering, setIsHovering] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  // States judged correctly — drives the checklist + grading.
  const [internalResolved, setInternalResolved] = useState<Set<StateKey>>(new Set());
  const resolved = controlled ? new Set((value ?? []) as StateKey[]) : internalResolved;
  // Transient wrong-attempt feedback for the active state.
  const [mistake, setMistake] = useState<StateKey | null>(null);

  function commitResolved(key: StateKey) {
    if (resolved.has(key)) return;
    const next = new Set(resolved);
    next.add(key);
    if (controlled) onChange!([...next]);
    else setInternalResolved(next);
  }

  function selectState(key: StateKey) {
    if (disabled) return;
    setForced(key);
    setMistake(null);
    setIsHovering(false);
    setIsPressing(false);
  }

  const recipe = RECIPES[forced];
  const activeResolved = resolved.has(forced);

  // Learner flags a specific token as the wrong one.
  function flagToken(token: string) {
    if (disabled || activeResolved) return;
    if (recipe.wrong && token === recipe.wrong) {
      setMistake(null);
      commitResolved(forced);
    } else {
      setMistake(forced);
    }
  }

  // Learner declares the whole recipe correct.
  function confirmClean() {
    if (disabled || activeResolved) return;
    if (!recipe.wrong) {
      setMistake(null);
      commitResolved(forced);
    } else {
      setMistake(forced);
    }
  }

  // Preview visuals always reflect the *correct* state (the reference to check
  // the written recipe against) — driven live in Default, forced otherwise.
  const liveState: StateKey =
    forced !== 'default'
      ? forced
      : isPressing
        ? 'active'
        : isHovering
          ? 'hover'
          : 'default';

  const allSeen = resolved.size === STATES.length;

  const btnBg =
    liveState === 'active'
      ? 'bg-pressed'
      : liveState === 'hover'
        ? 'bg-brand-hover'
        : 'bg-brand';
  const btnRing = liveState === 'focus' ? 'ring-2 ring-brand ring-offset-2 ring-offset-canvas' : '';
  const btnDisabledLook = liveState === 'disabled' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  const shown = shownTokens(recipe);

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-5 sm:rounded-2xl lg:rounded-3xl">
      {/* Header */}
      <div>
        <h3 className="text-callout font-semibold text-primary">{t('exercises.statesLab.title')}</h3>
        <p className="mt-1 text-footnote text-secondary">
          {t('exercises.statesLab.reviewSubtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* LEFT — live reference preview + state pills */}
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
              {t('exercises.statesLab.continueBtn')}
            </button>
          </div>

          {/* State-review pills */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-elevated p-1">
            {STATES.map((s) => {
              const on = forced === s.key;
              const ok = resolved.has(s.key);
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
                  {ok && (
                    <Check className={on ? 'text-on-brand' : 'text-success'} size={13} strokeWidth={3} />
                  )}
                  {s.label}
                </button>
              );
            })}
          </div>

          <p className="text-caption text-tertiary">
            {t('exercises.statesLab.reviewHint')}
          </p>
        </div>

        {/* RIGHT — recipe to audit + checklist */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-elevated p-4 sm:rounded-xl lg:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-footnote font-semibold text-primary">
                {t('exercises.statesLab.recipe', { label: STATES.find((s) => s.key === forced)?.label ?? '' })}
              </span>
              <span className="rounded-full bg-brand/10 px-2 py-1 text-caption font-medium text-brand">
                {forced}
              </span>
            </div>
            <p className="mt-2 min-h-[2.5rem] text-caption text-secondary">
              {activeResolved && recipe.wrongNote ? t(recipe.wrongNote) : t(recipe.note)}
            </p>

            {/* Auditable token chips */}
            <ul className="mt-3 flex min-h-[6.75rem] flex-col gap-1">
              {shown.map((tok) => {
                const isFlagged = activeResolved && recipe.wrong === tok;
                return (
                  <li key={tok}>
                    <button
                      type="button"
                      onClick={() => flagToken(tok)}
                      disabled={disabled || activeResolved}
                      className={[
                        'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-footnote transition-fast',
                        isFlagged
                          ? 'bg-danger/10 ring-1 ring-danger/40'
                          : activeResolved
                            ? 'bg-surface'
                            : 'bg-surface hover:bg-hover',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'h-2 w-2 shrink-0 rounded-full',
                          isFlagged ? 'bg-danger' : 'bg-brand',
                        ].join(' ')}
                      />
                      <code className="font-mono text-caption text-secondary">{tok}</code>
                      {isFlagged && <X className="ml-auto text-danger" size={13} strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Verdict controls / result */}
            {activeResolved ? (
              <div className="mt-3 rounded-md bg-success/10 px-3 py-2 text-caption font-medium text-success">
                {recipe.wrong
                  ? t('exercises.statesLab.foundWrong')
                  : t('exercises.statesLab.confirmedClean')}
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={confirmClean}
                  disabled={disabled}
                  className="rounded-md border border-border bg-surface px-3 py-2 text-caption font-medium text-primary transition-fast hover:bg-hover disabled:opacity-60"
                >
                  {t('exercises.statesLab.recipeClean')}
                </button>
                <p className="text-caption text-tertiary">
                  {mistake === forced
                    ? t('exercises.statesLab.notQuite')
                    : t('exercises.statesLab.auditPrompt')}
                </p>
              </div>
            )}
          </div>

          {/* Checklist / проверка */}
          <div className="rounded-lg border border-border bg-elevated p-4 sm:rounded-xl lg:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-footnote font-semibold text-primary">{t('exercises.statesLab.statesCheck')}</span>
              <span
                className={[
                  'text-caption font-semibold tabular-nums',
                  allSeen ? 'text-success' : 'text-tertiary',
                ].join(' ')}
              >
                {resolved.size}/{STATES.length}
              </span>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={[
                  'h-full rounded-full transition-base',
                  allSeen ? 'bg-success' : 'bg-brand',
                ].join(' ')}
                style={{ width: `${(resolved.size / STATES.length) * 100}%` }}
              />
            </div>

            <ul className="mt-3 flex flex-col gap-1">
              {STATES.map((s) => {
                const ok = resolved.has(s.key);
                return (
                  <li key={s.key} className="flex items-center gap-2 text-footnote">
                    <span
                      className={[
                        'flex h-4 w-4 items-center justify-center rounded-full border transition-fast',
                        ok ? 'border-success bg-success' : 'border-border-strong bg-transparent',
                      ].join(' ')}
                    >
                      {ok && <Check className="text-on-brand" size={11} strokeWidth={3} />}
                    </span>
                    <span className={ok ? 'text-primary' : 'text-tertiary'}>{s.label}</span>
                  </li>
                );
              })}
            </ul>

            <div
              className={[
                'mt-3 rounded-md px-3 py-2 text-caption font-medium transition-base',
                allSeen ? 'bg-success/10 text-success' : 'bg-muted text-tertiary',
              ].join(' ')}
            >
              {allSeen ? t('exercises.statesLab.allAudited') : t('exercises.statesLab.auditEach')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
