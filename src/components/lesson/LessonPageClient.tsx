'use client';

import { useMemo, useState } from 'react';
import { Clock, Target, Trophy, CheckCircle2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lesson } from '@/lib/curriculum/types';
import { ExampleVisual } from '@/components/examples/ExampleVisual';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { VideoEmbed } from '@/components/lesson/VideoEmbed';

/**
 * All the interactive bits of the lesson page (progress state, ExercisePlayer
 * instances) — split out from the route so the route itself can be an async
 * Server Component that resolves both static and DB-authored lessons via
 * getLesson() before ever reaching the client.
 */
const READ_EXERCISE_ID = '__read__';

export function LessonPageClient({ lesson }: { lesson: Lesson }) {
  const isLecture = lesson.kind === 'lecture';
  const allExercises = useMemo(
    () => [...lesson.exercises, ...(lesson.masteryChallenge ? [lesson.masteryChallenge] : [])],
    [lesson],
  );
  /** A pure lecture has no graded work — completion is "marked as read". */
  const readOnly = allExercises.length === 0;
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);

  const markSolved = (id: string) => setSolved((prev) => new Set(prev).add(id));

  const denom = readOnly ? 1 : allExercises.length;
  const numer = readOnly ? (solved.has(READ_EXERCISE_ID) ? 1 : 0) : solved.size;
  const progress = Math.round((numer / denom) * 100);
  const done = numer === denom;

  async function markRead() {
    if (solved.has(READ_EXERCISE_ID) || reading) return;
    setReading(true);
    try {
      await fetch('/api/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonSlug: lesson.slug,
          exerciseId: READ_EXERCISE_ID,
          skill: lesson.skill,
          correct: true,
          tries: 1,
          lessonTotal: 1,
        }),
      });
      markSolved(READ_EXERCISE_ID);
    } finally {
      setReading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12">
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
      <div className="mt-4 flex flex-wrap items-center gap-4 text-footnote text-secondary">
        {isLecture && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand">
            <BookOpen size={14} /> Лекция
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {lesson.estimatedMinutes} мин
        </span>
        <span className="flex items-center gap-1.5">
          <Target size={14} /> {lesson.difficulty}
        </span>
      </div>

      <ul className="mt-6 max-w-[70ch] space-y-2">
        {lesson.objectives.map((o) => (
          <li key={o} className="flex items-start gap-2 text-body text-secondary">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
            {o}
          </li>
        ))}
      </ul>

      {/* Theory */}
      {lesson.theory.length > 0 && (
        <>
          <SectionTitle>Теория</SectionTitle>
          <div className="max-w-[70ch] space-y-3">
            {lesson.theory.map((t, i) => (
              <p key={i} className="text-body text-secondary">
                <Bold text={t} />
              </p>
            ))}
          </div>
        </>
      )}

      {/* Lecture sections — slide-like reading */}
      {lesson.sections && lesson.sections.length > 0 && (
        <div className="mt-4 space-y-8">
          {lesson.sections.map((s, i) => (
            <section key={i} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="text-title3 font-semibold text-primary">{s.heading}</h2>
              {s.body && s.body.length > 0 && (
                <div className="mt-4 max-w-[70ch] space-y-3">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-body text-secondary">
                      <Bold text={p} />
                    </p>
                  ))}
                </div>
              )}
              {s.chips && s.chips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.chips.map((c, j) => (
                    <span
                      key={j}
                      className="rounded-full bg-muted px-3 py-1 text-footnote text-secondary"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {s.visual && (
                <div className="mt-5">
                  <ExampleVisual visual={s.visual} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Video */}
      {lesson.videos && lesson.videos.length > 0 && (
        <>
          <SectionTitle>Видео</SectionTitle>
          <div className="space-y-6">
            {lesson.videos.map((v, i) => (
              <VideoEmbed key={i} video={v} />
            ))}
          </div>
        </>
      )}

      {/* Examples */}
      {lesson.examples.length > 0 && (
        <>
          <SectionTitle>Примеры</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            {lesson.examples.map((ex, i) => (
              <div key={i}>
                <span
                  className={[
                    'mb-2 inline-block rounded-full px-2.5 py-0.5 text-caption font-medium',
                    ex.kind === 'good' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                  ].join(' ')}
                >
                  {ex.kind === 'good' ? '✓ Хорошо' : '✕ Плохо'}
                </span>
                <ExampleVisual visual={ex.visual} />
                <p className="mt-2 text-footnote text-tertiary">{ex.caption}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Practice */}
      {lesson.exercises.length > 0 && (
        <>
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
        </>
      )}

      {/* Mastery */}
      {lesson.masteryChallenge && (
        <>
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
            onSolved={() => markSolved(lesson.masteryChallenge!.id)}
          />
        </>
      )}

      {/* Mark-as-read — pure lecture with no graded work */}
      {readOnly && !done && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={markRead}
            disabled={reading}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-callout font-semibold text-white transition-base hover:opacity-90 disabled:opacity-60"
          >
            <CheckCircle2 size={18} /> {reading ? 'Отмечаем…' : 'Отметить прочитанной'}
          </button>
        </div>
      )}

      {/* Completion */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-xl bg-brand/10 p-6 text-center"
        >
          <Trophy size={28} className="mx-auto mb-2 text-brand" />
          <p className="text-title3 font-semibold text-primary">
            {isLecture ? 'Лекция пройдена 🎉' : 'Урок пройден 🎉'}
          </p>
          <p className="mt-1 text-body text-secondary">
            {isLecture
              ? 'Дальше — практические уроки раздела, где эти идеи закрепляются на деле.'
              : 'Ты закрепил материал на практике. Следующий шаг — сохранение прогресса и адаптивная сложность.'}
          </p>
        </motion.div>
      )}
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 mt-12 text-title3 font-semibold text-primary">{children}</h2>;
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
