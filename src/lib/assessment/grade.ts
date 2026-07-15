/**
 * Pure grading logic for the entry test. Given per-skill levels (1..4), rolls up
 * to an overall grade and per-category grades. No DB, no React — trivially
 * testable and shared by the API route and the result screen.
 */

import {
  CATEGORIES,
  SKILLS,
  type Category,
  type Grade,
  type SkillLevel,
} from './taxonomy';

/** Grade thresholds on the 1..4 average. Tunable in one place. */
export const GRADE_THRESHOLDS = {
  /** avg below this → junior */
  middle: 2.0,
  /** avg at/above this → senior */
  senior: 3.25,
} as const;

export type Scores = Record<string, SkillLevel>;

export interface CategoryResult {
  category: Category;
  avg: number;
  grade: Grade;
}

export interface GradeResult {
  grade: Grade;
  avg: number;
  perCategory: CategoryResult[];
  /** normalized (0..1) per-category value for the radar chart */
  radar: { category: Category; value: number }[];
}

export function gradeFromAvg(avg: number): Grade {
  if (avg >= GRADE_THRESHOLDS.senior) return 'senior';
  if (avg >= GRADE_THRESHOLDS.middle) return 'middle';
  return 'junior';
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeGrade(scores: Scores): GradeResult {
  const perCategory: CategoryResult[] = CATEGORIES.map((c) => {
    const levels = SKILLS.filter((s) => s.category === c.id).map((s) => scores[s.id] ?? 1);
    const avg = mean(levels);
    return { category: c.id, avg, grade: gradeFromAvg(avg) };
  });

  const overallAvg = mean(SKILLS.map((s) => scores[s.id] ?? 1));

  return {
    grade: gradeFromAvg(overallAvg),
    avg: overallAvg,
    perCategory,
    // radar axis value normalized to 0..1 (level 1 → 0, level 4 → 1)
    radar: perCategory.map((c) => ({ category: c.category, value: (c.avg - 1) / 3 })),
  };
}

/** Skills at/below this level are surfaced as growth points (точки роста). */
export const GROWTH_MAX_LEVEL: SkillLevel = 2;

/** Weakest-first list of skill ids to grow, capped at `limit`. */
export function growthSkills(scores: Scores, limit = 6): string[] {
  return SKILLS.map((s) => ({ id: s.id, level: scores[s.id] ?? 1 }))
    .filter((s) => s.level <= GROWTH_MAX_LEVEL)
    .sort((a, b) => a.level - b.level)
    .slice(0, limit)
    .map((s) => s.id);
}

/** Serialize the per-category rollup for the DB `categoryGrades` JSON column. */
export function serializeCategoryGrades(result: GradeResult): string {
  return JSON.stringify(
    Object.fromEntries(result.perCategory.map((c) => [c.category, { grade: c.grade, avg: c.avg }])),
  );
}
