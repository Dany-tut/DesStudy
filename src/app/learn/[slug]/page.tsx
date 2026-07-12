'use client';

import { use, useMemo, useState } from 'react';
import { notFound } from 'next/navigation';
import { Clock, Target, Trophy, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { lessons } from '@/content/lessons/spacing-8pt';
import { ExampleVisual } from '@/components/examples/ExampleVisual';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';

export default function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const lesson = lessons[slug];
  if (!lesson) notFound();

  const allExercises = useMemo(
    () => [...lesson.exercises, lesson.masteryChallenge],
    [lesson],
  );
  const [solved, setSolved] = useState<Set<string>>(new Set());

  const markSolved = (id: string) =>
    setSolved((prev) => new Set(prev).add(id));

  const progress = Math.round((solved.size / allExercises.length) * 100);
  const done = solved.size === allExercises.length;

  return (
    <main className="mx-auto max-w-[760px] px-6 py-12">
      {/* Sticky progress */}
      <div className="glass sticky top-4 z-sticky mb-10 flex items-center gap-4 rounded-full px-5 py-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
          />
        </div>
        <span className="text-footnote tabular-nums text-secondary">{progress}%</span>
      </div>

      {/* Intro */}
      <p className="mb-2 text-footnote font-medium text-brand">{lesson.pathTitle}</p>
      <h1 className="text-title1 font-bold text-primary">{lesson.title}</h1>
      <div className="mt-4 flex flex-wrap gap-4 text-footnote text-secondary">
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {lesson.estimatedMinutes} мин
        </span>
        <span className="flex items-center gap-1.5">
          <Target size={14} /> {lesson.difficulty}
        </span>
      </div>

      <ul className="mt-6 space-y-2">
        {lesson.objectives.map((o) => (
          <li key={o} className="flex items-start gap-2 text-body text-secondary">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
            {o}
          </li>
        ))}
      </ul>

      {/* Theory */}
      <SectionTitle>Теория</SectionTitle>
      <div className="space-y-3">
        {lesson.theory.map((t, i) => (
          <p key={i} className="text-body text-secondary">
            <Bold text={t} />
          </p>
        ))}
      </div>

      {/* Examples */}
      <SectionTitle>Примеры</SectionTitle>
      <div className="grid gap-5 sm:grid-cols-2">
        {lesson.examples.map((ex, i) => (
          <div key={i}>
            <span
              className={[
                'mb-2 inline-block rounded-full px-2.5 py-0.5 text-caption font-medium',
                ex.kind === 'good'
                  ? 'bg-success/10 text-success'
                  : 'bg-danger/10 text-danger',
              ].join(' ')}
            >
              {ex.kind === 'good' ? '✓ Хорошо' : '✕ Плохо'}
            </span>
            <ExampleVisual visual={ex.visual} />
            <p className="mt-2 text-footnote text-tertiary">{ex.caption}</p>
          </div>
        ))}
      </div>

      {/* Practice */}
      <SectionTitle>Практика</SectionTitle>
      <div className="space-y-6">
        {lesson.exercises.map((ex) => (
          <ExercisePlayer
            key={ex.id}
            exercise={ex}
            lessonTitle={lesson.title}
            lessonSlug={lesson.slug}
            skill={lesson.skill}
            lessonTotal={allExercises.length}
            onSolved={() => markSolved(ex.id)}
          />
        ))}
      </div>

      {/* Mastery */}
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Trophy size={18} className="text-warning" /> Mastery Challenge
        </span>
      </SectionTitle>
      <ExercisePlayer
        exercise={lesson.masteryChallenge}
        lessonTitle={lesson.title}
        lessonSlug={lesson.slug}
        skill={lesson.skill}
        lessonTotal={allExercises.length}
        onSolved={() => markSolved(lesson.masteryChallenge.id)}
      />

      {/* Completion */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-xl bg-brand/10 p-6 text-center"
        >
          <Trophy size={28} className="mx-auto mb-2 text-brand" />
          <p className="text-title3 font-semibold text-primary">Урок пройден 🎉</p>
          <p className="mt-1 text-body text-secondary">
            Ты закрепил 8pt-сетку на практике. Следующий шаг — сохранение прогресса и
            адаптивная сложность.
          </p>
        </motion.div>
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-5 mt-12 text-title3 font-semibold text-primary">{children}</h2>
  );
}

/** Minimal **bold** renderer for theory text. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i} className="font-semibold text-primary">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
