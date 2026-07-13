import type { Difficulty, Exercise, Lesson, LessonVideo } from '@/lib/curriculum/types';
import { parseExercise, parseVideo } from './schema';

export interface AuthoredLessonRow {
  id: string;
  slug: string;
  title: string;
  pathTitle: string;
  skill: string;
  difficulty: string;
  estimatedMinutes: number;
  objectives: string;
  prerequisites: string;
}

export interface ContentBlockRow {
  id: string;
  kind: string;
  payload: string;
  order: number;
}

/**
 * Converts DB rows into the same `Lesson` shape the static lessons use, so
 * ExercisePlayer/the lesson page never need to know a lesson came from the DB.
 * The last exercise block (by `order`) becomes masteryChallenge — no separate
 * "is mastery" flag for the builder UI to manage.
 */
export function blocksToLesson(row: AuthoredLessonRow, blocks: ContentBlockRow[]): Lesson {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const theory: string[] = [];
  const videos: LessonVideo[] = [];
  const exercises: Exercise[] = [];

  for (const b of sorted) {
    const payload = JSON.parse(b.payload) as Record<string, unknown>;
    if (b.kind === 'theory') theory.push(String(payload.text ?? ''));
    else if (b.kind === 'video') videos.push(parseVideo(payload));
    else if (b.kind === 'exercise') exercises.push(parseExercise(payload));
  }

  const masteryChallenge = exercises.pop();
  if (!masteryChallenge) {
    throw new Error('Урок должен содержать хотя бы одно упражнение, чтобы быть опубликован');
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    pathTitle: row.pathTitle,
    skill: row.skill,
    difficulty: row.difficulty as Difficulty,
    estimatedMinutes: row.estimatedMinutes,
    objectives: JSON.parse(row.objectives) as string[],
    prerequisites: JSON.parse(row.prerequisites) as string[],
    theory,
    videos: videos.length ? videos : undefined,
    examples: [],
    exercises,
    masteryChallenge,
  };
}
