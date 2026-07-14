'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  ArrowLeft,
  Calendar,
  Clock,
  Home,
  ClipboardList,
  MessageCircle,
  GraduationCap,
} from 'lucide-react';
import {
  FIX_DEFECTS,
  FIX_INITIAL,
  fixSolvedCount,
  type DefectKey,
  type FixDefect,
  type FixOption,
  type FixScreenAnswer,
} from '@/lib/curriculum/fixScreen';

/**
 * Fix-the-screen — the learner repairs a deliberately broken mobile mockup by
 * picking the correct fix for each flagged defect. Left is the frozen "before";
 * the middle "your screen" starts identically broken and updates live as each
 * fix is applied. Dual-mode: no `onChange` → standalone showcase; pass
 * `value`/`onChange` to drive it as a graded exercise (reports the per-defect
 * selection up, correct once every defect is fixed). The defect spec lives in
 * `@/lib/curriculum/fixScreen`, shared with the deterministic validator.
 */

const CATEGORIES = ['Class', 'Exam', 'Lab', 'Assignment'];

/** The phone mockup, rendered entirely from a fixes map. */
function PhonePreview({
  fixes,
  highlight,
  faded = false,
}: {
  fixes: FixScreenAnswer;
  highlight?: DefectKey | null;
  faded?: boolean;
}) {
  const cardRadius =
    fixes.radius === 'xl'
      ? 'rounded-2xl'
      : fixes.radius === 'md'
        ? 'rounded-lg'
        : fixes.radius === 'full'
          ? 'rounded-full'
          : 'rounded-[4px]';
  const blockGap =
    fixes.gap === 'even'
      ? 'gap-4'
      : fixes.gap === 'loose'
        ? 'gap-8'
        : fixes.gap === 'zero'
          ? 'gap-0'
          : 'gap-1';
  const pillMode = fixes.pillColor; // 'brand' | 'gray' | 'rainbow' | 'red'
  const ctaFull = fixes.cta === 'full';
  const ctaCenter = fixes.cta === 'center';
  const ctaRight = fixes.cta === 'right';

  // Distinct hue per chip for the "rainbow" distractor — deliberately noisy.
  const RAINBOW = ['#E5484D', '#F5A623', '#30A46C', '#0091FF'];

  const ring = (key: DefectKey) =>
    highlight === key ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '';

  return (
    <div
      className={[
        'flex h-full flex-col rounded-[28px] border border-border bg-surface p-4 shadow-sm transition-base',
        faded ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <ArrowLeft size={18} className="text-primary" />
      </div>
      <h4 className="mt-3 text-title-3 font-bold text-primary">Add a task</h4>

      <div className={['mt-4 flex flex-col', blockGap, ring('gap')].join(' ')}>
        {/* Category chips */}
        <div className={['flex flex-wrap gap-2 rounded-md p-0.5', ring('pillColor')].join(' ')}>
          {CATEGORIES.map((c, i) => (
            <span
              key={c}
              className={[
                'rounded-full px-3 py-1 text-caption font-semibold transition-fast',
                pillMode === 'brand'
                  ? i % 2 === 0
                    ? 'bg-brand text-on-brand'
                    : 'bg-brand/15 text-brand'
                  : 'text-white',
              ].join(' ')}
              style={
                pillMode === 'brand'
                  ? undefined
                  : {
                      backgroundColor:
                        pillMode === 'rainbow'
                          ? RAINBOW[i % RAINBOW.length]
                          : pillMode === 'red'
                            ? '#E5484D'
                            : '#9AA0A6',
                    }
              }
            >
              {c}
            </span>
          ))}
        </div>

        {/* Dropdown */}
        <div
          className={[
            'flex items-center justify-between border border-border bg-elevated px-3 py-2.5',
            cardRadius,
            ring('radius'),
            highlight === 'chevron' ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface' : '',
          ].join(' ')}
        >
          <span className="text-footnote text-secondary">Biology</span>
          {fixes.chevron === 'down' ? (
            <ChevronDown size={16} className="text-tertiary" />
          ) : fixes.chevron === 'up' ? (
            <ChevronUp size={16} className="text-tertiary" />
          ) : fixes.chevron === 'plus' ? (
            <Plus size={16} className="text-tertiary" />
          ) : (
            <ChevronRight size={16} className="text-tertiary" />
          )}
        </div>

        {/* Text field */}
        <div className={['border border-border bg-elevated px-3 py-2.5', cardRadius].join(' ')}>
          <span className="text-footnote text-tertiary">Topic / Chapter Name</span>
        </div>

        {/* Date + time rows */}
        <div className="flex items-center gap-2">
          <div className={['grid h-9 w-9 place-items-center bg-brand/15', cardRadius].join(' ')}>
            <Calendar size={16} className="text-brand" />
          </div>
          <span className="text-footnote text-secondary">Fri 25, September</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={['grid h-9 w-9 place-items-center bg-brand/15', cardRadius].join(' ')}>
            <Clock size={16} className="text-brand" />
          </div>
          <span className="text-footnote text-secondary">09:30 AM</span>
        </div>
      </div>

      {/* CTA */}
      <div
        className={[
          'mt-4',
          ctaFull
            ? ''
            : ctaCenter
              ? 'flex justify-center'
              : ctaRight
                ? 'flex justify-end'
                : 'flex justify-start',
          ring('cta'),
        ].join(' ')}
      >
        <button
          type="button"
          className={[
            'bg-success py-2.5 text-center text-footnote font-semibold text-on-brand',
            cardRadius,
            ctaFull ? 'w-full' : 'px-4',
          ].join(' ')}
        >
          Add Task
        </button>
      </div>

      {/* Nav bar */}
      <div
        className={[
          'mt-4 flex items-center justify-around rounded-2xl bg-elevated py-2',
          ring('navActive'),
        ].join(' ')}
      >
        {[
          { icon: Home, key: 'home' },
          { icon: ClipboardList, key: 'tasks' },
          { icon: GraduationCap, key: 'class' },
          { icon: MessageCircle, key: 'chat' },
        ].map(({ icon: Icon, key }) => {
          const active = fixes.navActive === 'all' || fixes.navActive === key;
          return (
            <Icon
              key={key}
              size={18}
              className={active ? 'text-brand' : 'text-tertiary'}
              strokeWidth={active ? 2.4 : 1.8}
            />
          );
        })}
      </div>
    </div>
  );
}

export function FixTheScreen({
  value,
  disabled = false,
  onChange,
}: {
  value?: FixScreenAnswer;
  disabled?: boolean;
  onChange?: (next: FixScreenAnswer) => void;
} = {}) {
  const controlled = onChange !== undefined;
  const [internalFixes, setInternalFixes] = useState<FixScreenAnswer>(FIX_INITIAL);
  const fixes = controlled ? (value ?? FIX_INITIAL) : internalFixes;

  const [active, setActive] = useState<DefectKey>(FIX_DEFECTS[0].key);
  // Defects the learner has actively picked on. Correct/wrong styling shows
  // only after a real click — never on the broken initial value, so the answer
  // is never pre-revealed.
  const [touched, setTouched] = useState<Set<DefectKey>>(() => new Set());

  const fixedCount = fixSolvedCount(fixes);
  const allFixed = fixedCount === FIX_DEFECTS.length;

  function choose(defect: FixDefect, option: FixOption) {
    if (disabled) return;
    const next = { ...fixes, [defect.key]: option.id };
    if (controlled) onChange!(next);
    else setInternalFixes(next);
    setTouched((prev) => new Set(prev).add(defect.key));
  }

  function reset() {
    setInternalFixes(FIX_INITIAL);
    setTouched(new Set());
    setActive(FIX_DEFECTS[0].key);
  }

  const activeDefect = FIX_DEFECTS.find((d) => d.key === active)!;
  const activePicked = activeDefect.options.find((o) => o.id === fixes[activeDefect.key]);
  const showWrong = touched.has(activeDefect.key) && activePicked && !activePicked.correct;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress counter */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-footnote text-secondary">
          Слева — как было (сломанный макет). Проходи по нарушениям и выбирай правильное
          исправление — по центру «твой экран» меняется на глазах.
        </p>
        <span
          className={[
            'shrink-0 rounded-full px-3 py-1 text-caption font-semibold tabular-nums',
            allFixed ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          {fixedCount}/{FIX_DEFECTS.length}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_1.1fr]">
        {/* LEFT — the original broken screen, frozen as the "before" reference. */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-tertiary">Было</span>
          <PhonePreview fixes={FIX_INITIAL} highlight={allFixed ? null : active} faded />
        </div>

        {/* MIDDLE — the learner's screen: starts identical (broken) and updates
            live as each fix is applied. */}
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-tertiary">Твой экран</span>
          <PhonePreview fixes={fixes} highlight={allFixed ? null : active} />
        </div>

        {/* RIGHT — defect list + options */}
        <div className="flex flex-col gap-4">
          {/* Progress */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={['h-full rounded-full transition-base', allFixed ? 'bg-success' : 'bg-brand'].join(' ')}
              style={{ width: `${(fixedCount / FIX_DEFECTS.length) * 100}%` }}
            />
          </div>

          {/* Defect tabs */}
          <div className="flex flex-col gap-1.5">
            {FIX_DEFECTS.map((d) => {
              const done = d.options.find((o) => o.id === fixes[d.key])?.correct;
              const on = active === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setActive(d.key)}
                  className={[
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-fast',
                    on ? 'border-brand bg-brand/5' : 'border-border bg-elevated hover:bg-hover',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                      done ? 'border-success bg-success' : 'border-border-strong',
                    ].join(' ')}
                  >
                    {done && <Check size={11} strokeWidth={3} className="text-on-brand" />}
                  </span>
                  <span className={['text-footnote', done ? 'text-secondary line-through' : 'text-primary'].join(' ')}>
                    {d.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active defect detail */}
          {!allFixed && (
            <div className="rounded-lg border border-border bg-elevated p-4">
              <p className="text-footnote font-semibold text-primary">{activeDefect.title}</p>
              <p className="mt-1 text-caption text-secondary">{activeDefect.hint}</p>
              <div className="mt-3 flex flex-col gap-2">
                {activeDefect.options.map((o) => {
                  const seen = touched.has(activeDefect.key);
                  const picked = seen && fixes[activeDefect.key] === o.id;
                  const isCorrectPick = picked && o.correct;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => choose(activeDefect, o)}
                      className={[
                        'flex items-center justify-between rounded-md border px-3 py-2 text-footnote transition-fast disabled:cursor-not-allowed',
                        isCorrectPick
                          ? 'border-success bg-success/10 text-success'
                          : picked
                            ? 'border-danger bg-danger/10 text-danger'
                            : 'border-border bg-surface text-primary hover:border-border-strong',
                      ].join(' ')}
                    >
                      <span className="font-mono text-caption">{o.label}</span>
                      {isCorrectPick && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              {showWrong && (
                <p className="mt-2 text-caption text-danger">
                  {activePicked?.feedback ?? 'Не то — сверься с эталоном «Было» слева.'}
                </p>
              )}
            </div>
          )}

          {/* Solved state — standalone showcase only; when graded, the
              ExercisePlayer owns the success panel and retry. */}
          {allFixed && !controlled && (
            <div className="rounded-lg border border-success/40 bg-success/10 p-4">
              <p className="text-footnote font-semibold text-success">
                Все {FIX_DEFECTS.length} нарушений исправлены ✓
              </p>
              <p className="mt-1 text-caption text-secondary">
                Сравни «было» слева и «твой экран» — увидишь, как мелочи складываются в аккуратный
                экран.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md border border-border px-3 py-1.5 text-caption font-medium text-secondary hover:bg-hover"
                >
                  Заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
