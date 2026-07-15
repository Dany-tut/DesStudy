/**
 * DesStudy — Entry Grading Test taxonomy.
 * ========================================
 * 28 skills across 4 categories (UI / UX / Product / Career), mirroring the
 * FormFactor "тест на грейд" result screen. Each skill maps 1:1 to one question
 * in questions.ts. A skill level is 1..4 on the dmpatterns scale:
 *   1 awareness · 2 competence · 3 expertise · 4 leadership
 * which renders as the dot bar 🟣🟣🟣⚪️ and rolls up into a junior/middle/senior
 * grade (see grade.ts).
 *
 * This file is the single source of truth for skill ids, labels and grouping —
 * the DB stores only { skillId: level } JSON, never the labels.
 */

export type Category = 'ui' | 'ux' | 'product' | 'career';

export type SkillLevel = 1 | 2 | 3 | 4;

export interface SkillDef {
  /** stable id, also used as the questions.ts key and DB scores key */
  id: string;
  /** short Russian label shown on the result dot-bars */
  label: string;
  category: Category;
}

export interface CategoryDef {
  id: Category;
  /** heading on the result screen, e.g. "ui design" */
  title: string;
  /** compact form for tight spots like radar axis labels */
  short: string;
  /** one-line description under the heading */
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'ui', title: 'UI design', short: 'UI', blurb: 'Визуал, верстка, композиция, система' },
  { id: 'ux', title: 'UX design', short: 'UX', blurb: 'Сценарии, тексты, состояния, адаптивы' },
  { id: 'product', title: 'Product', short: 'Product', blurb: 'Данные, гипотезы, исследования' },
  { id: 'career', title: 'Career', short: 'Career', blurb: 'Кейсы, отклики, собесы, опыт' },
];

/** Ordered exactly as the 28 questions appear (order === array index + 1). */
export const SKILLS: SkillDef[] = [
  // UI design
  { id: 'client-approval', label: 'нравится заказчику', category: 'ui' },
  { id: 'layout', label: 'верстка', category: 'ui' },
  { id: 'composition', label: 'композиция', category: 'ui' },
  { id: 'color', label: 'цвет', category: 'ui' },
  { id: 'figma', label: 'figma', category: 'ui' },
  { id: 'ds', label: 'DS (системы)', category: 'ui' },
  { id: 'style', label: 'стиль, образ', category: 'ui' },
  // UX design
  { id: 'scenarios', label: 'сценарии', category: 'ux' },
  { id: 'ux-writing', label: 'ux writing', category: 'ux' },
  { id: 'responsive', label: 'адаптивы', category: 'ux' },
  { id: 'states', label: 'состояния', category: 'ux' },
  // Product
  { id: 'confidence', label: 'уверенность', category: 'product' },
  { id: 'tasks', label: 'задачи', category: 'product' },
  { id: 'metrics', label: 'метрики', category: 'product' },
  { id: 'hypotheses', label: 'гипотезы', category: 'product' },
  { id: 'audience', label: 'аудитория', category: 'product' },
  { id: 'interviews', label: 'интервью', category: 'product' },
  { id: 'ux-tests', label: 'ux тесты', category: 'product' },
  { id: 'more-research', label: 'ещё методы', category: 'product' },
  // Career
  { id: 'cases', label: 'кейсы', category: 'career' },
  { id: 'responses', label: 'отклики', category: 'career' },
  { id: 'interviews-job', label: 'собесы', category: 'career' },
  { id: 'test-tasks', label: 'тестовые', category: 'career' },
  { id: 'specialization', label: 'спец. опыт', category: 'career' },
  { id: 'experience', label: 'общий опыт', category: 'career' },
  { id: 'portfolio', label: 'портфолио', category: 'career' },
  { id: 'case-structure', label: 'структура кейса', category: 'career' },
  { id: 'interview-craft', label: 'вайтборды', category: 'career' },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s]),
);

export const CATEGORY_BY_ID: Record<Category, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<Category, CategoryDef>;

export function skillsInCategory(category: Category): SkillDef[] {
  return SKILLS.filter((s) => s.category === category);
}

export type Grade = 'junior' | 'middle' | 'senior';

export const GRADE_LABEL: Record<Grade, string> = {
  junior: 'junior',
  middle: 'middle',
  senior: 'senior',
};
