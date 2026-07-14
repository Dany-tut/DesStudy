import {
  designThinkingIntro,
  spacing8pt,
  radiusScale,
  typeHierarchy,
  colorContrast,
  uxHeuristics,
  uxHeuristicsControl,
  uxHeuristicsClarity,
  uxHeuristicsConsistency,
  userFlows,
  userFlowsEdge,
  informationArchitecture,
  designTokens,
  componentsVariants,
  navBars,
  forms,
  formsValidation,
  formsStructure,
  emptyStates,
  microTypography,
  gridsComposition,
  figmaComponentsSlots,
  aiDesignTools,
  briefResearch,
  researchMethods,
  insightsToConcept,
  paletteElements,
  responsiveLayout,
  microcopy,
} from './lessons';
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

export const PATHS: LearningPath[] = [
  {
    id: 'ui-foundations',
    title: 'UI Foundations',
    description: 'Сетки, отступы, иерархия, типографика — база визуального дизайна.',
    emoji: '📐',
    lessons: [
      entry(designThinkingIntro, { emoji: '🎓' }),
      entry(spacing8pt, { emoji: '📏', popular: true }),
      entry(radiusScale, { emoji: '⬜' }),
      entry(typeHierarchy, { emoji: '🔤', popular: true }),
      entry(colorContrast, { emoji: '🎨' }),
      entry(microTypography, { emoji: '✍️' }),
      entry(gridsComposition, { emoji: '🔲', popular: true }),
      entry(responsiveLayout, { emoji: '📱' }),
      entry(navBars, { emoji: '🧱' }),
    ],
  },
  {
    id: 'ux-foundations',
    title: 'UX Foundations',
    description: 'Пользовательские потоки, эвристики, продуктовое мышление.',
    emoji: '🧭',
    lessons: [
      entry(uxHeuristics, { emoji: '🔍', popular: true }),
      entry(uxHeuristicsControl, { emoji: '🛟' }),
      entry(uxHeuristicsClarity, { emoji: '💬' }),
      entry(uxHeuristicsConsistency, { emoji: '🧩' }),
      entry(userFlows, { emoji: '🧭' }),
      entry(userFlowsEdge, { emoji: '🔀' }),
      entry(informationArchitecture, { emoji: '🗂️' }),
      entry(forms, { emoji: '📝' }),
      entry(formsValidation, { emoji: '⚠️' }),
      entry(formsStructure, { emoji: '🧱' }),
      entry(microcopy, { emoji: '✏️' }),
      entry(emptyStates, { emoji: '🗂️' }),
    ],
  },
  {
    id: 'design-systems',
    title: 'Design Systems',
    description: 'Токены, компоненты, варианты, авто-лейаут.',
    emoji: '🧩',
    lessons: [
      entry(designTokens, { emoji: '🎛️' }),
      entry(componentsVariants, { emoji: '🧩' }),
      entry(figmaComponentsSlots, { emoji: '🧬', popular: true }),
      entry(aiDesignTools, { emoji: '🤖' }),
    ],
  },
  {
    id: 'design-process',
    title: 'Design Process',
    description: 'От брифа и исследования до концепции и вайрфреймов — как рождается проект.',
    emoji: '🗺️',
    lessons: [
      entry(briefResearch, { emoji: '📋', popular: true }),
      entry(researchMethods, { emoji: '🔬' }),
      entry(insightsToConcept, { emoji: '💡' }),
      entry(paletteElements, { emoji: '🎨' }),
    ],
  },
];

export const totalLessons = PATHS.reduce((n, p) => n + p.lessons.length, 0);
export const availableLessons = PATHS.reduce(
  (n, p) => n + p.lessons.filter((l) => l.status === 'available').length,
  0,
);
