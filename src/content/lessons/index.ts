import type { Lesson } from '@/lib/curriculum/types';
import { spacing8pt } from './spacing-8pt';
import { radiusScale } from './radius-scale';
import { typeHierarchy } from './type-hierarchy';
import { colorContrast } from './color-contrast';
import { uxHeuristics } from './ux-heuristics';
import { uxHeuristicsControl } from './ux-heuristics-control';
import { uxHeuristicsClarity } from './ux-heuristics-clarity';
import { uxHeuristicsConsistency } from './ux-heuristics-consistency';
import { userFlows } from './user-flows';
import { designTokens } from './design-tokens';
import { componentsVariants } from './components-variants';
import { navBars } from './nav-bars';
import { forms } from './forms';
import { emptyStates } from './empty-states';
import { microTypography } from './micro-typography';
import { gridsComposition } from './grids-composition';
import { figmaComponentsSlots } from './figma-components-slots';
import { aiDesignTools } from './ai-design-tools';
import { briefResearch } from './brief-research';
import { researchMethods } from './research-methods';
import { insightsToConcept } from './insights-to-concept';
import { paletteElements } from './palette-elements';
import { responsiveLayout } from './responsive-layout';
import { microcopy } from './microcopy';

/** Central registry — every built lesson, keyed by slug. */
export const lessons: Record<string, Lesson> = {
  [spacing8pt.slug]: spacing8pt,
  [radiusScale.slug]: radiusScale,
  [typeHierarchy.slug]: typeHierarchy,
  [colorContrast.slug]: colorContrast,
  [microTypography.slug]: microTypography,
  [gridsComposition.slug]: gridsComposition,
  [responsiveLayout.slug]: responsiveLayout,
  [navBars.slug]: navBars,
  [uxHeuristics.slug]: uxHeuristics,
  [uxHeuristicsControl.slug]: uxHeuristicsControl,
  [uxHeuristicsClarity.slug]: uxHeuristicsClarity,
  [uxHeuristicsConsistency.slug]: uxHeuristicsConsistency,
  [userFlows.slug]: userFlows,
  [microcopy.slug]: microcopy,
  [designTokens.slug]: designTokens,
  [componentsVariants.slug]: componentsVariants,
  [figmaComponentsSlots.slug]: figmaComponentsSlots,
  [aiDesignTools.slug]: aiDesignTools,
  [forms.slug]: forms,
  [emptyStates.slug]: emptyStates,
  [briefResearch.slug]: briefResearch,
  [researchMethods.slug]: researchMethods,
  [insightsToConcept.slug]: insightsToConcept,
  [paletteElements.slug]: paletteElements,
};

export {
  spacing8pt,
  radiusScale,
  typeHierarchy,
  colorContrast,
  uxHeuristics,
  uxHeuristicsControl,
  uxHeuristicsClarity,
  uxHeuristicsConsistency,
  userFlows,
  designTokens,
  componentsVariants,
  navBars,
  forms,
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
};
