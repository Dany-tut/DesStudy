import { spacing8pt } from './lessons/spacing-8pt';
import type { Lesson } from '@/lib/curriculum/types';

export type Level = 'beginner' | 'medium' | 'advanced';

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Начальный',
  medium: 'Средний',
  advanced: 'Продвинутый',
};

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
    tasks: lesson.exercises.length + 1, // exercises + mastery challenge
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

export const PATHS: LearningPath[] = [
  {
    id: 'ui-foundations',
    title: 'UI Foundations',
    description: 'Сетки, отступы, иерархия, типографика — база визуального дизайна.',
    emoji: '📐',
    lessons: [
      entry(spacing8pt, { emoji: '📏', popular: true }),
      { slug: 'radius-scale', title: 'Скругления и шкала радиусов', minutes: 7, tasks: 8, level: 'beginner', emoji: '⬜', status: 'soon' },
      { slug: 'type-hierarchy', title: 'Типографическая иерархия', minutes: 10, tasks: 12, level: 'beginner', emoji: '🔤', status: 'soon' },
      { slug: 'color-contrast', title: 'Цвет и контраст (WCAG)', minutes: 9, tasks: 10, level: 'medium', emoji: '🎨', status: 'soon' },
    ],
  },
  {
    id: 'ux-foundations',
    title: 'UX Foundations',
    description: 'Пользовательские потоки, эвристики, продуктовое мышление.',
    emoji: '🧭',
    lessons: [
      { slug: 'ux-heuristics', title: 'Эвристики Нильсена', minutes: 12, tasks: 15, level: 'beginner', emoji: '🔍', popular: true, status: 'soon' },
      { slug: 'user-flows', title: 'Пользовательские потоки', minutes: 11, tasks: 9, level: 'medium', emoji: '🧭', status: 'soon' },
    ],
  },
  {
    id: 'design-systems',
    title: 'Design Systems',
    description: 'Токены, компоненты, варианты, авто-лейаут.',
    emoji: '🧩',
    lessons: [
      { slug: 'design-tokens', title: 'Дизайн-токены', minutes: 10, tasks: 11, level: 'medium', emoji: '🎛️', status: 'soon' },
      { slug: 'components-variants', title: 'Компоненты и варианты', minutes: 14, tasks: 16, level: 'advanced', emoji: '🧩', status: 'soon' },
    ],
  },
];

export const totalLessons = PATHS.reduce((n, p) => n + p.lessons.length, 0);
export const availableLessons = PATHS.reduce(
  (n, p) => n + p.lessons.filter((l) => l.status === 'available').length,
  0,
);
