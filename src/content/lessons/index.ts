import type { Lesson } from '@/lib/curriculum/types';
import { spacing8pt } from './spacing-8pt';
import { radiusScale } from './radius-scale';
import { typeHierarchy } from './type-hierarchy';
import { colorContrast } from './color-contrast';
import { uxHeuristics } from './ux-heuristics';

/** Central registry — every built lesson, keyed by slug. */
export const lessons: Record<string, Lesson> = {
  [spacing8pt.slug]: spacing8pt,
  [radiusScale.slug]: radiusScale,
  [typeHierarchy.slug]: typeHierarchy,
  [colorContrast.slug]: colorContrast,
  [uxHeuristics.slug]: uxHeuristics,
};

export { spacing8pt, radiusScale, typeHierarchy, colorContrast, uxHeuristics };
