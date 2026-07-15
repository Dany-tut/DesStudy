'use client';

import { useMemo, useState } from 'react';
import { Check, Sparkles, SlidersHorizontal } from 'lucide-react';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import type { Question } from '@/lib/assessment/questions';
import type { SkillLevel } from '@/lib/assessment/taxonomy';

/**
 * Renders one question. Self-assessment questions use a DS module
 * (SegmentedControl for terse options, ChoiceCard column for sentence-length
 * ones). Two UI/UX skills instead run a real interactive mini-task whose graded
 * outcome proposes the level; the learner can switch to self-assessment.
 *
 * Controlled: the resolved level is lifted via `onChange`. `value` is the
 * currently chosen level (or undefined until answered).
 */
export function QuestionStep({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: SkillLevel | undefined;
  onChange: (level: SkillLevel) => void;
}) {
  const [selfMode, setSelfMode] = useState(false);
  const interactive = question.interactive && !selfMode;

  return (
    <div>
      {interactive ? (
        <>
          {question.interactive === 'color-contrast' && (
            <ColorContrastTask value={value} onLevel={onChange} />
          )}
          {question.interactive === 'component-states' && (
            <ComponentStatesTask value={value} onLevel={onChange} />
          )}
          <button
            type="button"
            onClick={() => setSelfMode(true)}
            className="mt-5 text-footnote text-tertiary underline-offset-2 hover:text-secondary hover:underline"
          >
            Пропустить задание — оценю себя сам
          </button>
        </>
      ) : (
        <SelfAssessment question={question} value={value} onChange={onChange} />
      )}
    </div>
  );
}

// ── Self-assessment ─────────────────────────────────────────────────────────

function SelfAssessment({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: SkillLevel | undefined;
  onChange: (level: SkillLevel) => void;
}) {
  if (question.present === 'segmented') {
    return (
      <div className="flex flex-wrap">
        <SegmentedControl
          options={question.options.map((o) => ({ value: String(o.level), label: o.label }))}
          value={value ? String(value) : ''}
          onChange={(v) => onChange(Number(v) as SkillLevel)}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-2.5">
      {question.options.map((o) => (
        <ChoiceCard
          key={o.level}
          label={o.label}
          selected={value === o.level}
          onClick={() => onChange(o.level)}
        />
      ))}
    </div>
  );
}

// ── Interactive: colour contrast ────────────────────────────────────────────

/** WCAG relative luminance of an achromatic (grey) sRGB value 0..1. */
function greyLuminance(v: number): number {
  const lin = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return lin; // r=g=b for grey
}
function contrastRatio(v1: number, v2: number): number {
  const l1 = greyLuminance(v1);
  const l2 = greyLuminance(v2);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function levelFromRatio(ratio: number): SkillLevel {
  if (ratio >= 7) return 4; // AAA
  if (ratio >= 4.5) return 3; // AA
  if (ratio >= 3) return 2; // AA large only
  return 1;
}

const BG_VALUE = 0.16; // #292929 sample card

function ColorContrastTask({
  value,
  onLevel,
}: {
  value: SkillLevel | undefined;
  onLevel: (level: SkillLevel) => void;
}) {
  const [lightness, setLightness] = useState(45); // 0..100 text grey value
  const textV = lightness / 100;
  const ratio = useMemo(() => contrastRatio(textV, BG_VALUE), [textV]);
  const pass = ratio >= 4.5;
  const textGrey = `rgb(${Math.round(textV * 255)},${Math.round(textV * 255)},${Math.round(textV * 255)})`;

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-footnote text-secondary">
        <SlidersHorizontal size={14} className="text-brand" />
        Доведи текст до читаемого контраста (WCAG AA — от 4.5:1)
      </p>
      <div
        className="mb-5 flex h-28 items-center justify-center rounded-xl"
        style={{ background: `rgb(${Math.round(BG_VALUE * 255)},${Math.round(BG_VALUE * 255)},${Math.round(BG_VALUE * 255)})` }}
      >
        <span className="text-title3 font-semibold" style={{ color: textGrey }}>
          Купить за 4990 ₽
        </span>
      </div>
      <Slider
        value={lightness}
        min={16}
        max={100}
        unit=""
        celebrate={pass}
        onChange={(n) => {
          setLightness(n);
          onLevel(levelFromRatio(contrastRatio(n / 100, BG_VALUE)));
        }}
      />
      <div className="mt-4 flex items-center justify-between text-footnote">
        <span className="tabular-nums text-secondary">Контраст {ratio.toFixed(1)}:1</span>
        <span className={pass ? 'font-medium text-success' : 'text-danger'}>
          {ratio >= 7 ? 'AAA — отлично' : pass ? 'AA — норма' : ratio >= 3 ? 'только для крупного' : 'не читается'}
        </span>
      </div>
      {value && (
        <p className="mt-3 flex items-center gap-1.5 text-footnote text-tertiary">
          <Sparkles size={13} className="text-brand" /> Оценка навыка: уровень {value}/4
        </p>
      )}
    </div>
  );
}

// ── Interactive: component states ───────────────────────────────────────────

interface StateChip {
  id: string;
  label: string;
  kind: 'base' | 'advanced' | 'distractor';
}
const STATE_CHIPS: StateChip[] = [
  { id: 'default', label: 'Default', kind: 'base' },
  { id: 'hover', label: 'Hover', kind: 'base' },
  { id: 'pressed', label: 'Pressed', kind: 'base' },
  { id: 'disabled', label: 'Disabled', kind: 'base' },
  { id: 'focus', label: 'Focus (клавиатура)', kind: 'advanced' },
  { id: 'loading', label: 'Loading', kind: 'advanced' },
  { id: 'error', label: 'Ошибка / текст ошибки', kind: 'advanced' },
  { id: 'gradient', label: 'Градиентный', kind: 'distractor' },
  { id: 'italic', label: 'Курсивный', kind: 'distractor' },
];

function levelFromStates(selected: Set<string>): SkillLevel {
  const base = STATE_CHIPS.filter((c) => c.kind === 'base' && selected.has(c.id)).length;
  const adv = STATE_CHIPS.filter((c) => c.kind === 'advanced' && selected.has(c.id)).length;
  const bad = STATE_CHIPS.filter((c) => c.kind === 'distractor' && selected.has(c.id)).length;
  if (bad > 0) return base >= 3 ? 2 : 1; // picking noise caps the score
  if (base === 4 && adv === 3) return 4;
  if (base === 4 && adv >= 1) return 3;
  if (base >= 3) return 2;
  return 1;
}

function ComponentStatesTask({
  value,
  onLevel,
}: {
  value: SkillLevel | undefined;
  onLevel: (level: SkillLevel) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onLevel(levelFromStates(next));
  };

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-footnote text-secondary">
        <Sparkles size={14} className="text-brand" />
        Собери состояния, которые нужны кнопке перед передачей в разработку
      </p>
      <div className="flex flex-wrap gap-2">
        {STATE_CHIPS.map((c) => {
          const on = selected.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={[
                'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-footnote transition-fast',
                on
                  ? 'border-brand bg-brand/10 text-primary'
                  : 'border-border bg-canvas text-secondary hover:border-border-strong',
              ].join(' ')}
            >
              {on && <Check size={12} strokeWidth={3} className="text-brand" />}
              {c.label}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="mt-4 flex items-center gap-1.5 text-footnote text-tertiary">
          <Sparkles size={13} className="text-brand" /> Оценка навыка: уровень {value}/4
        </p>
      )}
    </div>
  );
}
