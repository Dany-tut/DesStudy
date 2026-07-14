'use client';

import { useState } from 'react';
import { Check, X, RotateCcw, Lightbulb, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Exercise,
  ValidationOutcome,
  BuildAnswer,
  BarBuildAnswer,
} from '@/lib/curriculum/types';
import { validate } from '@/lib/curriculum/validate';
import type { MentorReply } from '@/lib/ai/mentor';
import { AutoLayoutCanvas } from './AutoLayoutCanvas';
import { BarBuilder } from './BarBuilder';
import { OrderCanvas } from './OrderCanvas';
import { FigmaLinkSubmit } from './FigmaLinkSubmit';
import { FileUploadZone } from './FileUploadZone';
import { RadiusDragTune } from './RadiusDragTune';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { ChoiceCard } from '@/components/ui/ChoiceCard';
import { TilePicker } from '@/components/ui/TilePicker';
import { SwatchPicker } from '@/components/ui/SwatchPicker';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

type Answer = string | number | BuildAnswer | BarBuildAnswer | string[] | null;

const DEFAULT_BAR: BarBuildAnswer = {
  placement: 'static',
  variant: 'full',
  parts: { logo: true, nav: true, search: false, cta: false, avatar: false },
  navCenter: false,
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
  const initialChoice: Answer =
    exercise.type === 'build'
      ? { gap: exercise.min, padding: exercise.min }
      : exercise.type === 'order'
        ? exercise.items.map((i) => i.id)
        : exercise.type === 'bar-build'
          ? DEFAULT_BAR
          : null;
  const [choice, setChoice] = useState<Answer>(initialChoice);
  const [outcome, setOutcome] = useState<ValidationOutcome | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [mentor, setMentor] = useState<MentorReply | null>(null);
  const [mentorLoading, setMentorLoading] = useState(false);

  const solved = outcome?.correct ?? false;
  const awaitingReview = solved && !!outcome?.reviewRequired;

  function answerLabel(value: Answer): string {
    switch (exercise.type) {
      case 'choose':
        return exercise.options.find((o) => o.id === value)?.label ?? String(value);
      case 'build': {
        const v = value as BuildAnswer;
        return `отступ ${v.gap}px, поля ${v.padding}px`;
      }
      case 'order': {
        const ids = value as string[];
        const byId = new Map(exercise.items.map((i) => [i.id, i.label]));
        return ids.map((id) => byId.get(id) ?? id).join(' → ');
      }
      case 'figma-link':
        return 'ссылка на Figma';
      case 'file-upload':
        return 'прикреплённый файл';
      case 'tune':
        return `${value}${exercise.unitLabel}`;
      case 'bar-build': {
        const v = value as BarBuildAnswer;
        const placementRu: Record<BarBuildAnswer['placement'], string> = {
          static: 'статичный',
          fixedTop: 'фиксированный',
          floatTop: 'плавающий сверху',
          floatBottom: 'плавающий снизу',
          sidebarLeft: 'боковой слева',
          sidebarRight: 'боковой справа',
        };
        const variantRu: Record<BarBuildAnswer['variant'], string> = {
          full: 'полный',
          burger: 'бургер',
          mini: 'мини',
        };
        return `${placementRu[v.placement]}, ${variantRu[v.variant]}`;
      }
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
                  <span className="text-primary">Отправлено на проверку</span>
                </>
              ) : outcome.correct ? (
                <>
                  <Check size={16} className="text-success" />
                  <span className="text-primary">Верно</span>
                </>
              ) : (
                <>
                  <X size={16} className="text-danger" />
                  <span className="text-primary">Не совсем</span>
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
              AI-ментор
              {mentor?.offline && (
                <span className="text-tertiary">· офлайн-режим</span>
              )}
            </div>
            {mentorLoading ? (
              <p className="text-body text-tertiary">Думаю над твоим ответом…</p>
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
                <RotateCcw size={16} /> Ещё попытка
              </>
            ) : (
              'Проверить'
            )}
          </Button>
        ) : awaitingReview ? (
          <span className="flex items-center gap-2 text-footnote text-secondary">
            <Clock size={14} className="text-brand" />
            Отправлено на проверку
          </span>
        ) : (
          <span className="flex items-center gap-2 text-footnote text-secondary">
            <Check size={14} className="text-success" />
            Решено с {attempts}-й попытки
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
