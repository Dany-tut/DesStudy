import type { Lesson } from '@/lib/curriculum/types';
import { getLessonsMap } from './lessons/localized';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';

export type Level = 'beginner' | 'medium' | 'advanced';

/** Human labels per level, by locale. */
export const LEVEL_LABEL_BY_LOCALE: Record<Locale, Record<Level, string>> = {
  ru: { beginner: 'Начальный', medium: 'Средний', advanced: 'Продвинутый' },
  en: { beginner: 'Beginner', medium: 'Intermediate', advanced: 'Advanced' },
};

/** Back-compat default (Russian) — prefer LEVEL_LABEL_BY_LOCALE[locale]. */
export const LEVEL_LABEL: Record<Level, string> = LEVEL_LABEL_BY_LOCALE[DEFAULT_LOCALE];

/** A lesson entry in a path — either a built lesson or a planned placeholder. */
export interface LessonEntry {
  slug: string;
  title: string;
  minutes: number;
  /** Number of interactive tasks in the lesson (Kodree-style metadata). */
  tasks: number;
  level: Level;
  emoji: string;
  popular?: boolean;
  status: 'available' | 'soon';
  /** 'lecture' cards show a "Лекция" chip instead of a task count. */
  kind?: 'lesson' | 'lecture';
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  emoji: string;
  lessons: LessonEntry[];
}

function entry(lesson: Lesson, extra: { emoji: string; popular?: boolean }): LessonEntry {
  return {
    slug: lesson.slug,
    title: lesson.title,
    minutes: lesson.estimatedMinutes,
    // exercises + mastery challenge (if any)
    tasks: lesson.exercises.length + (lesson.masteryChallenge ? 1 : 0),
    kind: lesson.kind ?? 'lesson',
    level:
      lesson.difficulty === 'hard'
        ? 'advanced'
        : lesson.difficulty === 'medium'
          ? 'medium'
          : 'beginner',
    emoji: extra.emoji,
    popular: extra.popular,
    status: 'available',
  };
}

/** One lesson slot inside a path: which lesson, its card emoji, popularity. */
interface PathLessonRef {
  slug: string;
  emoji: string;
  popular?: boolean;
}

/** Locale-independent path structure + per-locale path descriptions. Path
 * titles are English brand terms ("UI Foundations") and stay the same in both
 * languages; only the description is translated. Lesson titles come from the
 * (localized) lesson objects, resolved by slug at build time. */
interface PathDef {
  id: string;
  title: string;
  emoji: string;
  description: Record<Locale, string>;
  lessons: PathLessonRef[];
}

const PATH_DEFS: PathDef[] = [
  {
    id: 'ui-foundations',
    title: 'UI Foundations',
    emoji: '📐',
    description: {
      ru: 'Сетки, отступы, иерархия, типографика — база визуального дизайна.',
      en: 'Grids, spacing, hierarchy, typography — the base of visual design.',
    },
    lessons: [
      { slug: 'design-thinking-intro', emoji: '🎓' },
      { slug: 'figma-intro', emoji: '🖌️' },
      { slug: 'spacing-8pt-grid', emoji: '📏', popular: true },
      { slug: 'radius-scale', emoji: '⬜' },
      { slug: 'type-hierarchy', emoji: '🔤', popular: true },
      { slug: 'color-contrast', emoji: '🎨' },
      { slug: 'micro-typography', emoji: '✍️' },
      { slug: 'grids-composition', emoji: '🔲', popular: true },
      { slug: 'responsive-layout', emoji: '📱' },
      { slug: 'nav-bars', emoji: '🧱' },
    ],
  },
  {
    id: 'ux-foundations',
    title: 'UX Foundations',
    emoji: '🧭',
    description: {
      ru: 'Пользовательские потоки, эвристики, продуктовое мышление.',
      en: 'User flows, heuristics, product thinking.',
    },
    lessons: [
      { slug: 'ux-heuristics', emoji: '🔍', popular: true },
      { slug: 'ux-heuristics-control', emoji: '🛟' },
      { slug: 'ux-heuristics-clarity', emoji: '💬' },
      { slug: 'ux-heuristics-consistency', emoji: '🧩' },
      { slug: 'user-flows', emoji: '🧭' },
      { slug: 'user-flows-edge', emoji: '🔀' },
      { slug: 'information-architecture', emoji: '🗂️' },
      { slug: 'forms', emoji: '📝' },
      { slug: 'forms-validation', emoji: '⚠️' },
      { slug: 'forms-structure', emoji: '🧱' },
      { slug: 'microcopy', emoji: '✏️' },
      { slug: 'editing-milchin', emoji: '📖' },
      { slug: 'empty-states', emoji: '🗂️' },
    ],
  },
  {
    id: 'design-systems',
    title: 'Design Systems',
    emoji: '🧩',
    description: {
      ru: 'Токены, компоненты, варианты, авто-лейаут.',
      en: 'Tokens, components, variants, auto-layout.',
    },
    lessons: [
      { slug: 'design-tokens', emoji: '🎛️' },
      { slug: 'components-variants', emoji: '🧩' },
      { slug: 'figma-components-slots', emoji: '🧬', popular: true },
      { slug: 'ai-design-tools', emoji: '🤖' },
    ],
  },
  {
    id: 'design-process',
    title: 'Design Process',
    emoji: '🗺️',
    description: {
      ru: 'От брифа и исследования до концепции и вайрфреймов — как рождается проект.',
      en: 'From brief and research to concept and wireframes — how a project is born.',
    },
    lessons: [
      { slug: 'brief-research', emoji: '📋', popular: true },
      { slug: 'jtbd-jobs', emoji: '🎯', popular: true },
      { slug: 'research-methods', emoji: '🔬' },
      { slug: 'insights-to-concept', emoji: '💡' },
      { slug: 'cjm-map', emoji: '🗺️' },
      { slug: 'palette-elements', emoji: '🎨' },
    ],
  },
];

/** Build the learning paths for a locale, pulling lesson titles/metadata from
 * the localized lesson objects (English falls back to Russian per lesson). */
export function getPaths(locale: Locale = DEFAULT_LOCALE): LearningPath[] {
  const map = getLessonsMap(locale);
  return PATH_DEFS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description[locale],
    emoji: def.emoji,
    lessons: def.lessons
      .map((ref) => {
        const lesson = map[ref.slug];
        return lesson ? entry(lesson, { emoji: ref.emoji, popular: ref.popular }) : null;
      })
      .filter((e): e is LessonEntry => e !== null),
  }));
}

/** The lesson that follows `slug` in curriculum order — next in the same path,
 * then rolling into the first lesson of the following path. Returns `null` when
 * `slug` is the very last lesson (or isn't found). Used for the end-of-lesson
 * "next" CTA. */
export function getNextLesson(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): { slug: string; title: string; emoji: string } | null {
  const flat = getPaths(locale).flatMap((p) => p.lessons);
  const i = flat.findIndex((l) => l.slug === slug);
  if (i === -1 || i === flat.length - 1) return null;
  const next = flat[i + 1];
  return { slug: next.slug, title: next.title, emoji: next.emoji };
}

/** Russian paths — back-compat for call sites that haven't threaded a locale. */
export const PATHS: LearningPath[] = getPaths(DEFAULT_LOCALE);

export const totalLessons = PATHS.reduce((n, p) => n + p.lessons.length, 0);
export const availableLessons = PATHS.reduce(
  (n, p) => n + p.lessons.filter((l) => l.status === 'available').length,
  0,
);
