import type { Lesson } from '@/lib/curriculum/types';
import { spacing8pt } from './spacing-8pt';
import { radiusScale } from './radius-scale';
import { typeHierarchy } from './type-hierarchy';
import { colorContrast } from './color-contrast';
import { uxHeuristics } from './ux-heuristics';
import { userFlows } from './user-flows';
import { designTokens } from './design-tokens';
import { componentsVariants } from './components-variants';
import { navBars } from './nav-bars';
import { forms } from './forms';
import { emptyStates } from './empty-states';

/** Central registry — every built lesson, keyed by slug. */
export const lessons: Record<string, Lesson> = {
  [spacing8pt.slug]: spacing8pt,
  [radiusScale.slug]: radiusScale,
  [typeHierarchy.slug]: typeHierarchy,
  [colorContrast.slug]: colorContrast,
  [uxHeuristics.slug]: uxHeuristics,
  [userFlows.slug]: userFlows,
  [designTokens.slug]: designTokens,
  [componentsVariants.slug]: componentsVariants,
  [navBars.slug]: navBars,
  [forms.slug]: forms,
  [emptyStates.slug]: emptyStates,
};

export {
  spacing8pt,
  radiusScale,
  typeHierarchy,
  colorContrast,
  uxHeuristics,
  userFlows,
  designTokens,
  componentsVariants,
  navBars,
  forms,
  emptyStates,
};
