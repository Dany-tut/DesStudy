'use client';

import { useState } from 'react';
import { Check, X, RotateCcw, Lightbulb, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Exercise,
  ValidationOutcome,
  BuildAnswer,
  BarBuildAnswer,
  AlignAnswer,
  ContrastAnswer,
  ScaleRampAnswer,
  EasingAnswer,
  TapTargetAnswer,
} from '@/lib/curriculum/types';
import { validate, contrastRatio } from '@/lib/curriculum/validate';
import { useT } from '@/lib/i18n/client';
import type { MentorReply } from '@/lib/ai/mentor';
import { AutoLayoutCanvas } from './AutoLayoutCanvas';
import { BarBuilder } from './BarBuilder';
import { OrderCanvas } from './OrderCanvas';
import { FigmaLinkSubmit } from './FigmaLinkSubmit';
import { FileUploadZone } from './FileUploadZone';
import { RadiusDragTune } from './RadiusDragTune';
import { MatchPairs } from './drafts/MatchPairs';
import { StatesLab } from './drafts/StatesLab';
import { Hotspot } from './drafts/Hotspot';
import { AlignSnap } from './drafts/AlignSnap';
import { ContrastTuner } from './drafts/ContrastTuner';
import { ScaleRamp } from './drafts/ScaleRamp';
import { EasingCurve } from './drafts/EasingCurve';
import { SpotDiff } from './drafts/SpotDiff';
import { TapTarget } from './drafts/TapTarget';
import { TrimZone } from './TrimZone';
import { NestedRadius } from './NestedRadius';
import { ResizeFrame } from './ResizeFrame';
import { Elevation } from './Elevation';
import { FixTheScreen } from './FixTheScreen';
import { ScreenCritiqueExercise } from './ScreenCritiqueExercise';
import { FIX_INITIAL, fixSolvedCount, type FixScreenAnswer } from '@/lib/curriculum/fixScreen';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { TilePicker } from '@/components/ui/TilePicker';
import { SwatchPicker } from '@/components/ui/SwatchPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

type HotspotAnswer = { x: number; y: number };
type Answer =
  | string
  | number
  | BuildAnswer
  | BarBuildAnswer
  | AlignAnswer
  | ContrastAnswer
  | ScaleRampAnswer
  | HotspotAnswer
  | EasingAnswer
  | TapTargetAnswer
  | FixScreenAnswer
  | string[]
  | null;

const DEFAULT_BAR: BarBuildAnswer = {
  placement: 'static',
  variant: 'full',
  parts: { logo: true, nav: true, search: false, cta: false, avatar: false },
  navAlign: 'left',
};

/**
 * Plays a single exercise: capture answer → validate deterministically →
 * show instant feedback → allow retry. Reports mastery up when solved.
 * This is the beating heart of the platform (PRD §3.2).
 */
export function ExercisePlayer({
  exercise,
  lessonTitle = '',
  lessonSlug = '',
  skill = '',
  lessonTotal = 1,
  onSolved,
}: {
  exercise: Exercise;
  lessonTitle?: string;
  lessonSlug?: string;
  skill?: string;
  lessonTotal?: number;
  onSolved?: (attempts: number) => void;
}) {
  const { t, tp } = useT();
  const initialChoice: Answer =
    exercise.type === 'build'
      ? { gap: exercise.min, padding: exercise.min }
      : exercise.type === 'order'
        ? exercise.items.map((i) => i.id)
        : exercise.type === 'bar-build'
          ? DEFAULT_BAR
          : exercise.type === 'match'
            ? []
            : exercise.type === 'states'
              ? ['default']
              : exercise.type === 'contrast-tune'
                ? { textL: 38, bgL: 96 }
                : exercise.type === 'scale-ramp'
                  ? { base: 16, ratio: 1.25 }
                  : exercise.type === 'trim-zone' || exercise.type === 'nested-radius'
                    ? 0
                    : exercise.type === 'resize-frame'
                      ? exercise.minWidth
                      : exercise.type === 'elevation'
                        ? 0
                        : exercise.type === 'easing'
                          ? { p1: { x: 0.25, y: 0.25 }, p2: { x: 0.75, y: 0.75 } }
                          : exercise.type === 'tap-target'
                            ? { w: 30, h: 28 }
                            : exercise.type === 'spot-diff'
                              ? null
                              : exercise.type === 'fix-screen'
                                ? FIX_INITIAL
                                : null;
  const [choice, setChoice] = useState<Answer>(initialChoice);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [mentor, setMentor] = useState<MentorReply | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);

  const solved = outcome?.correct ?? false;
  const awaitingReview = solved && !!outcome?.reviewRequired;

  // screen-critique owns its whole flow (diagnose → reconstruct → results) and
  // records its own attempt — render it directly, skipping the generic shell.
  if (exercise.type === 'screen-critique') {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="mb-5 text-callout font-medium text-primary">{exercise.prompt}</p>
        <ScreenCritiqueExercise
          exercise={exercise}
          lessonSlug={lessonSlug}
          skill={skill}
          lessonTotal={lessonTotal}
          onSolved={onSolved}
        />
      </div>
    );
  }

  function answerLabel(value: Answer): string {
    switch (exercise.type) {
      case 'choose':
        return exercise.options.find((o) => o.id === value)?.label ?? String(value);
      case 'build': {
        const v = value as BuildAnswer;
        return t('exercises.player.buildAnswer', { gap: v.gap, padding: v.padding });
      }
      case 'order': {
        const ids = value as string[];
        const byId = new Map(exercise.items.map((i) => [i.id, i.label]));
        return ids.map((id) => byId.get(id) ?? id).join(' → ');
      }
      case 'figma-link':
        return t('exercises.player.figmaLink');
      case 'file-upload':
        return t('exercises.player.fileUpload');
      case 'tune':
        return `${value}${exercise.unitLabel}`;
      case 'bar-build': {
        const v = value as BarBuildAnswer;
        return `${t(`exercises.player.placement.${v.placement}`)}, ${t(`exercises.player.variant.${v.variant}`)}`;
      }
      case 'match': {
        const ids = (value as string[]) ?? [];
        return tp('exercises.player.matched', exercise.pairs.length, { done: ids.length });
      }
      case 'states': {
        const ids = (value as string[]) ?? [];
        return t('exercises.player.inspected', { count: ids.length });
      }
      case 'hotspot': {
        const p = value as HotspotAnswer | null;
        return p
          ? t('exercises.player.clickAt', { x: Math.round(p.x), y: Math.round(p.y) })
          : t('exercises.player.noClick');
      }
      case 'align': {
        const a = value as AlignAnswer;
        return a?.x && a?.y
          ? `${t(`exercises.player.alignX.${a.x}`)} · ${t(`exercises.player.alignY.${a.y}`)}`
          : t('exercises.player.notAligned');
      }
      case 'contrast-tune': {
        const v = value as ContrastAnswer;
        return t('exercises.player.contrast', {
          ratio: contrastRatio(v.textL, v.bgL).toFixed(2),
        });
      }
      case 'scale-ramp': {
        const v = value as ScaleRampAnswer;
        return `${v.base}px × ${v.ratio}`;
      }
      case 'trim-zone':
        return t('exercises.player.trim', { value: value as number });
      case 'nested-radius':
        return t('exercises.player.innerRadius', { value: value as number });
      case 'resize-frame':
        return t('exercises.player.width', { value: Math.round(value as number) });
      case 'elevation':
        return t('exercises.player.level', { value: value as number });
      case 'easing': {
        const v = value as EasingAnswer;
        return v
          ? `cubic-bezier(${v.p1.x.toFixed(2)}, ${v.p1.y.toFixed(2)}, ${v.p2.x.toFixed(2)}, ${v.p2.y.toFixed(2)})`
          : t('exercises.player.noCurve');
      }
      case 'spot-diff':
        return value == null
          ? t('exercises.player.noClick')
          : t('exercises.player.tilePicked', { n: (value as number) + 1 });
      case 'tap-target': {
        const v = value as TapTargetAnswer;
        return v ? `${v.w}×${v.h}px` : t('exercises.player.noSize');
      }
      case 'fix-screen': {
        const solved = fixSolvedCount(value as FixScreenAnswer);
        return t('exercises.player.fixed', { count: solved });
      }
      case 'screen-critique':
        return t('exercises.player.screenReview');
    }
  }

  async function askMentor(result: ValidationOutcome, nextAttempts: number, value: Answer) {
    setMentorLoading(true);
    setMentor(null);
    try {
      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle,
          prompt: exercise.prompt,
          correct: result.correct,
          attempts: nextAttempts,
          answer: answerLabel(value),
          validatorExplanation: result.explanation,
          hint: result.hint,
        }),
      });
      setMentor((await res.json()) as MentorReply);
    } catch {
      setMentor(null);
    } finally {
      setMentorLoading(false);
    }
  }

  function submit() {
    if (choice === null) return;
    const result = validate(exercise, choice);
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setOutcome(result);
    if (result.correct) {
      onSolved?.(nextAttempts);
      void recordAttempt(nextAttempts);
    }
    // Submission-style exercises (figma-link/file-upload) aren't graded —
    // asking the mentor to judge "correct/incorrect" on them doesn't apply.
    if (!result.reviewRequired) {
      void askMentor(result, nextAttempts, choice);
    }
  }

  async function recordAttempt(tries: number) {
    // file-upload already logs its Submission row from /api/upload at upload
    // time; only figma-link needs the URL logged here, alongside the answer.
    const submission =
      exercise.type === 'figma-link' && typeof choice === 'string'
        ? ({ kind: 'figma-link', value: choice } as const)
        : undefined;
    try {
      await fetch('/api/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonSlug,
          exerciseId: exercise.id,
          skill,
          correct: true,
          tries,
          lessonTotal,
          submission,
        }),
      });
    } catch {
      /* progress is best-effort; never block the learner */
    }
  }

  function retry() {
    setOutcome(null);
    setChoice(initialChoice);
    setMentor(null);
  }

  function renderControl() {
    switch (exercise.type) {
      case 'choose': {
        const selected = typeof choice === 'string' ? choice : '';
        if (exercise.picker === 'tiles') {
          return (
            <TilePicker
              options={exercise.options.map((o) => ({ value: o.id, label: o.label, icon: o.icon }))}
              value={selected}
              disabled={solved}
              onChange={setChoice}
            />
          );
        }
        if (exercise.picker === 'swatches') {
          return (
            <SwatchPicker
              options={exercise.options.map((o) => ({ value: o.id, label: o.label, swatch: o.swatch }))}
              value={selected}
              disabled={solved}
              onChange={setChoice}
            />
          );
        }
        if (exercise.picker === 'segmented') {
          return (
            <SegmentedControl
              options={exercise.options.map((o) => ({ value: o.id, label: o.label }))}
              value={selected}
              disabled={solved}
              onChange={setChoice}
            />
          );
        }
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {exercise.options.map((opt) => {
              const isChosen = choice === opt.id;
              const isCorrect = solved && opt.id === exercise.correctOptionId;
              return (
                <ChoiceCard
                  key={opt.id}
                  label={opt.label}
                  selected={isChosen}
                  correct={isCorrect}
                  disabled={solved}
                  onClick={() => setChoice(opt.id)}
                />
              );
            })}
          </div>
        );
      }
      case 'tune':
        return (
          <TuneControl
            exercise={exercise}
            value={typeof choice === 'number' ? choice : exercise.min}
            disabled={solved}
            onChange={setChoice}
          />
        );
      case 'build':
        return (
          <AutoLayoutCanvas
            exercise={exercise}
            value={(choice as BuildAnswer) ?? { gap: exercise.min, padding: exercise.min }}
            disabled={solved}
            onChange={(update) =>
              setChoice((prev) =>
                update((prev as BuildAnswer) ?? { gap: exercise.min, padding: exercise.min }),
              )
            }
          />
        );
      case 'order':
        return (
          <OrderCanvas
            exercise={exercise}
            value={(choice as string[]) ?? exercise.items.map((i) => i.id)}
            disabled={solved}
            onChange={(order) => setChoice(order)}
          />
        );
      case 'bar-build':
        return (
          <BarBuilder
            exercise={exercise}
            value={(choice as BarBuildAnswer) ?? DEFAULT_BAR}
            disabled={solved}
            onChange={(next) => setChoice(next)}
          />
        );
      case 'figma-link':
        return (
          <FigmaLinkSubmit
            value={typeof choice === 'string' ? choice : ''}
            disabled={solved}
            onChange={setChoice}
          />
        );
      case 'file-upload':
        return (
          <FileUploadZone
            lessonSlug={lessonSlug}
            exerciseId={exercise.id}
            accept={exercise.accept}
            maxSizeMB={exercise.maxSizeMB}
            value={typeof choice === 'string' ? choice : null}
            disabled={solved}
            onChange={setChoice}
          />
        );
      case 'match':
        return (
          <MatchPairs
            pairs={exercise.pairs}
            value={(choice as string[]) ?? []}
            disabled={solved}
            onChange={(m) => setChoice(m)}
          />
        );
      case 'states':
        return (
          <StatesLab
            value={(choice as string[]) ?? ['default']}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'hotspot':
        return (
          <Hotspot
            zone={exercise.zone}
            value={(choice as HotspotAnswer) ?? null}
            disabled={solved}
            onChange={(p) => setChoice(p)}
          />
        );
      case 'align':
        return (
          <AlignSnap
            target={exercise.target}
            disabled={solved}
            onChange={(a) => setChoice(a as AlignAnswer)}
          />
        );
      case 'contrast-tune':
        return (
          <ContrastTuner
            targetRatio={exercise.targetRatio}
            value={(choice as ContrastAnswer) ?? { textL: 38, bgL: 96 }}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'scale-ramp':
        return (
          <ScaleRamp
            value={(choice as ScaleRampAnswer) ?? { base: 16, ratio: 1.25 }}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'trim-zone':
        return (
          <TrimZone
            label={exercise.label}
            targetTrim={exercise.targetTrim}
            maxTrim={exercise.maxTrim}
            value={typeof choice === 'number' ? choice : 0}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'nested-radius':
        return (
          <NestedRadius
            outerRadius={exercise.outerRadius}
            padding={exercise.padding}
            maxRadius={exercise.maxRadius}
            value={typeof choice === 'number' ? choice : 0}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'resize-frame':
        return (
          <ResizeFrame
            minWidth={exercise.minWidth}
            maxWidth={exercise.maxWidth}
            targetWidth={exercise.targetWidth}
            tolerance={exercise.tolerance}
            breakpoints={exercise.breakpoints}
            value={typeof choice === 'number' ? choice : exercise.minWidth}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'elevation':
        return (
          <Elevation
            maxLevel={exercise.maxLevel}
            targetLevel={exercise.targetLevel}
            label={exercise.label}
            value={typeof choice === 'number' ? choice : 0}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'easing':
        return (
          <EasingCurve
            target={exercise.target}
            value={(choice as EasingAnswer) ?? null}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'spot-diff':
        return (
          <SpotDiff
            roundId={exercise.roundId}
            value={typeof choice === 'number' ? choice : null}
            disabled={solved}
            onChange={(picked) => setChoice(picked)}
          />
        );
      case 'tap-target':
        return (
          <TapTarget
            min={exercise.min}
            value={(choice as TapTargetAnswer) ?? { w: 30, h: 28 }}
            disabled={solved}
            onChange={(v) => setChoice(v)}
          />
        );
      case 'fix-screen':
        return (
          <FixTheScreen
            value={(choice as FixScreenAnswer) ?? FIX_INITIAL}
            disabled={solved}
            onChange={(next) => setChoice(next)}
          />
        );
      // screen-critique is self-contained — handled by an early return above and
      // never reaches renderControl; this case only satisfies exhaustiveness.
      case 'screen-critique':
        return null;
      default: {
        // Exhaustiveness guard — a TS error here means a new Exercise type
        // was added without a matching case.
        const neverExercise: never = exercise;
        return neverExercise;
      }
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="mb-5 text-callout font-medium text-primary">{exercise.prompt}</p>

      {renderControl()}

      {/* Feedback */}
      <AnimatePresence mode="wait">
        {outcome && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={[
              'mt-5 rounded-lg p-4 text-body',
              awaitingReview ? 'bg-brand/10' : outcome.correct ? 'bg-success/10' : 'bg-danger/10',
            ].join(' ')}
          >
            <div className="mb-1 flex items-center gap-2 font-medium">
              {awaitingReview ? (
                <>
                  <Clock size={16} className="text-brand" />
                  <span className="text-primary">{t('exercises.player.submittedForReview')}</span>
                </>
              ) : outcome.correct ? (
                <>
                  <Check size={16} className="text-success" />
                  <span className="text-primary">{t('exercises.player.correct')}</span>
                </>
              ) : (
                <>
                  <X size={16} className="text-danger" />
                  <span className="text-primary">{t('exercises.player.notQuite')}</span>
                </>
              )}
            </div>
            {!outcome.correct && outcome.hint && (
              <p className="mb-2 flex items-start gap-2 text-secondary">
                <Lightbulb size={15} className="mt-0.5 shrink-0 text-warning" />
                {outcome.hint}
              </p>
            )}
            <p className="text-secondary">{outcome.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Mentor */}
      <AnimatePresence>
        {outcome && (mentorLoading || mentor) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-lg border border-border bg-muted/50 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-footnote font-medium text-brand">
              <Sparkles size={14} />
              {t('exercises.player.aiMentor')}
              {mentor?.offline && (
                <span className="text-tertiary">· {t('exercises.player.offline')}</span>
              )}
            </div>
            {mentorLoading ? (
              <p className="text-body text-tertiary">{t('exercises.player.thinking')}</p>
            ) : mentor ? (
              <div className="space-y-2 text-body text-secondary">
                <p className="text-primary">{mentor.diagnosis}</p>
                <p>{mentor.concept}</p>
                <p className="text-tertiary">{mentor.encouragement}</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        {!solved ? (
          <Button onClick={outcome ? retry : submit} disabled={!outcome && choice === null}>
            {outcome ? (
              <>
                <RotateCcw size={16} /> {t('exercises.player.retry')}
              </>
            ) : (
              t('exercises.player.check')
            )}
          </Button>
        ) : awaitingReview ? (
          <span className="flex items-center gap-2 text-footnote text-secondary">
            <Clock size={14} className="text-brand" />
            {t('exercises.player.submittedForReview')}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-footnote text-secondary">
            <Check size={14} className="text-success" />
            {tp('exercises.player.solvedIn', attempts)}
          </span>
        )}
      </div>
    </div>
  );
}

function TuneControl({
  exercise,
  value,
  disabled,
  onChange,
}: {
  exercise: Extract<Exercise, { type: 'tune' }>;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  if (exercise.visual === 'radius') {
    return (
      <RadiusDragTune
        value={value}
        min={exercise.min}
        max={exercise.max}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }

  return (
    <div>
      <Slider
        value={value}
        min={exercise.min}
        max={exercise.max}
        step={exercise.step}
        unit={exercise.unitLabel}
        disabled={disabled}
        onChange={onChange}
      />
      {/* Live preview of the gap being tuned */}
      <div className="mt-5 rounded-lg border border-border bg-canvas p-5">
        <div className="h-3 w-2/3 rounded-sm bg-brand/60" />
        <div style={{ height: value }} />
        <div className="h-3 w-1/2 rounded-sm bg-muted" />
      </div>
    </div>
  );
}
