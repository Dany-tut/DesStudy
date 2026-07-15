'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Target, Trophy, CheckCircle2, BookOpen, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lesson } from '@/lib/curriculum/types';
import { useT } from '@/lib/i18n/client';
import { ExampleVisual } from '@/components/examples/ExampleVisual';
import { LectureVisual } from '@/components/examples/LectureVisual';
import { ExercisePlayer } from '@/components/exercises/ExercisePlayer';
import { VideoEmbed } from '@/components/lesson/VideoEmbed';
import { ConfettiBurst } from '@/components/lesson/ConfettiBurst';
import { AchievementReveal } from '@/components/achievements/AchievementReveal';
import type { GemTone } from '@/components/achievements/CrystalGem';

/** Deterministically pick a crystal tone from the lesson so the reveal feels themed. */
const GEM_TONES: GemTone[] = ['sapphire', 'ember', 'amethyst', 'emerald', 'gold'];
function toneFor(seed: string): GemTone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GEM_TONES[Math.abs(h) % GEM_TONES.length];
}

/**
 * All the interactive bits of the lesson page (progress state, ExercisePlayer
 * instances) — split out from the route so the route itself can be an async
 * Server Component that resolves both static and DB-authored lessons via
 * getLesson() before ever reaching the client.
 */
const READ_EXERCISE_ID = '__read__';

export function LessonPageClient({
  lesson,
  nextLesson,
}: {
  lesson: Lesson;
  nextLesson?: { slug: string; title: string; emoji: string } | null;
}) {
  const { t: tr } = useT();
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

  // Crystal-reveal overlay: fire once, the moment the lesson flips to complete.
  const gemTone = useMemo(() => toneFor(lesson.slug), [lesson.slug]);
  const [reveal, setReveal] = useState(false);
  const [revealShown, setRevealShown] = useState(false);
  useEffect(() => {
    if (done && !revealShown) {
      setReveal(true);
      setRevealShown(true);
    }
  }, [done, revealShown]);

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
      <AchievementReveal
        open={reveal}
        tone={gemTone}
        label={tr('exercises.lesson.achievementUnlocked')}
        title={lesson.title}
        hint={tr('exercises.lesson.tapToContinue')}
        onDone={() => setReveal(false)}
      />

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
            <BookOpen size={14} /> {tr('exercises.lesson.lecture')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Clock size={14} /> {lesson.estimatedMinutes} {tr('exercises.lesson.minutes')}
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
          <SectionTitle>{tr('exercises.lesson.theory')}</SectionTitle>
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
                  <LectureVisual visual={s.visual} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Video */}
      {lesson.videos && lesson.videos.length > 0 && (
        <>
          <SectionTitle>{tr('exercises.lesson.video')}</SectionTitle>
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
          <SectionTitle>{tr('exercises.lesson.examples')}</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2">
            {lesson.examples.map((ex, i) => (
              <div key={i}>
                <span
                  className={[
                    'mb-2 inline-block rounded-full px-2.5 py-0.5 text-caption font-medium',
                    ex.kind === 'good' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                  ].join(' ')}
                >
                  {ex.kind === 'good' ? tr('exercises.lesson.good') : tr('exercises.lesson.bad')}
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
          <SectionTitle>{tr('exercises.lesson.practice')}</SectionTitle>
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
            <CheckCircle2 size={18} />{' '}
            {reading ? tr('exercises.lesson.marking') : tr('exercises.lesson.markRead')}
          </button>
        </div>
      )}

      {/* Completion */}
      {done && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-10 overflow-hidden rounded-xl bg-brand/10 p-6 text-center"
        >
          <ConfettiBurst />
          <Trophy size={28} className="mx-auto mb-2 text-brand" />
          <p className="text-title3 font-semibold text-primary">
            {isLecture ? tr('exercises.lesson.lectureDone') : tr('exercises.lesson.lessonDone')}
          </p>
          <p className="mt-1 text-body text-secondary">
            {isLecture
              ? tr('exercises.lesson.lectureDoneBody')
              : tr('exercises.lesson.lessonDoneBody')}
          </p>

          {nextLesson ? (
            <div className="relative mt-5 flex flex-col items-center gap-2">
              <span className="text-caption font-medium uppercase tracking-wide text-tertiary">
                {tr('exercises.lesson.nextUp')}
              </span>
              <Link
                href={`/learn/${nextLesson.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-callout font-semibold text-white transition-base hover:opacity-90"
              >
                <span aria-hidden>{nextLesson.emoji}</span>
                <span>{nextLesson.title}</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="relative mt-5 flex justify-center">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-callout font-semibold text-primary transition-base hover:bg-hover"
              >
                {tr('exercises.lesson.backToPaths')}
                <ArrowRight size={18} />
              </Link>
            </div>
          )}
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
