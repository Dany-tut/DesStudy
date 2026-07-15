'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QUESTIONS } from '@/lib/assessment/questions';
import { CATEGORY_BY_ID, type SkillLevel } from '@/lib/assessment/taxonomy';
import { computeGrade, type Scores } from '@/lib/assessment/grade';
import { QuestionStep } from './QuestionStep';
import { ResultScreen } from './ResultScreen';

type Phase = 'name' | 'questions' | 'result';

/**
 * The entry grading test flow: optional ФИ step → 25 questions (DS modules +
 * interactive mini-tasks) → result. Progress bar + AnimatePresence between
 * steps, mirroring ScreenWalkthrough. Submits to /api/assessment on finish and
 * renders the celebratory result client-side.
 */
export function AssessmentPlayer({ initialName }: { initialName: string | null }) {
  const [phase, setPhase] = useState<Phase>(initialName ? 'questions' : 'name');
  const [name, setName] = useState(initialName ?? '');
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Scores>({});
  const [submitting, setSubmitting] = useState(false);

  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;
  const answered = scores[q?.skillId] as SkillLevel | undefined;
  const progress = phase === 'name' ? 0 : ((idx + 1) / total) * 100;

  const result = useMemo(() => computeGrade(scores), [scores]);

  function setAnswer(level: SkillLevel) {
    setScores((prev) => ({ ...prev, [q.skillId]: level }));
  }

  async function finish(finalScores: Scores) {
    setSubmitting(true);
    try {
      await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, scores: finalScores }),
      });
    } catch {
      // Best-effort — still show the result; teacher view just won't have it.
    } finally {
      setSubmitting(false);
      setPhase('result');
    }
  }

  function next() {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
    } else {
      void finish(scores);
    }
  }

  if (phase === 'result') {
    return <ResultScreen scores={scores} result={result} name={name} />;
  }

  return (
    <main className="mx-auto max-w-[720px] px-6 py-12">
      {/* progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-footnote text-tertiary">
          <span>Тест на грейд</span>
          <span className="tabular-nums">
            {phase === 'name' ? 'Знакомство' : `${idx + 1} / ${total}`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-base ease-standard"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* No mode="wait": if a tab is backgrounded mid-transition, rAF throttling
          would otherwise leave the exiting step stuck and never mount the next. */}
      <AnimatePresence initial={false}>
        {phase === 'name' ? (
          <motion.section
            key="name"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-2 flex items-center gap-2 text-brand">
              <UserRound size={18} />
              <span className="text-footnote font-medium">Перед стартом</span>
            </div>
            <h1 className="text-title1 font-bold text-primary">Как вас зовут?</h1>
            <p className="mt-2 text-body text-secondary">
              Имя и фамилия нужны, чтобы преподаватель видел ваш результат и мог собрать
              персональные точки роста.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) setPhase('questions');
              }}
              placeholder="Имя Фамилия"
              className="mt-6 w-full rounded-lg border border-border bg-canvas px-4 py-3 text-callout text-primary outline-none transition-fast placeholder:text-tertiary focus:border-brand"
            />
            <div className="mt-6">
              <Button disabled={!name.trim()} onClick={() => setPhase('questions')}>
                Начать тест <ArrowRight size={16} />
              </Button>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key={q.order}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <span className="text-footnote font-medium uppercase tracking-wide text-brand">
              {CATEGORY_BY_ID[q.category].title}
            </span>
            <h2 className="mb-6 mt-1 text-title2 font-bold text-primary">{q.prompt}</h2>

            <QuestionStep question={q} value={answered} onChange={setAnswer} />

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="flex items-center gap-1.5 text-footnote text-tertiary transition-fast hover:text-secondary disabled:opacity-0"
              >
                <ArrowLeft size={15} /> Назад
              </button>
              <Button disabled={!answered || submitting} onClick={next}>
                {idx === total - 1 ? (submitting ? 'Считаем…' : 'Показать результат') : 'Далее'}
                {!submitting && <ArrowRight size={16} />}
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
