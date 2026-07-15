import type { Lesson } from '@/lib/curriculum/types';
import { designThinkingIntroEn } from './design-thinking-intro';
import { figmaIntroEn } from './figma-intro';
import { spacing8ptEn } from './spacing-8pt';
import { radiusScaleEn } from './radius-scale';
import { typeHierarchyEn } from './type-hierarchy';
import { colorContrastEn } from './color-contrast';
import { microTypographyEn } from './micro-typography';
import { gridsCompositionEn } from './grids-composition';
import { responsiveLayoutEn } from './responsive-layout';
import { navBarsEn } from './nav-bars';
import { motionEasingEn } from './motion-easing';
import { designTokensEn } from './design-tokens';
import { componentsVariantsEn } from './components-variants';
import { figmaComponentsSlotsEn } from './figma-components-slots';
import { aiDesignToolsEn } from './ai-design-tools';
import { uxHeuristicsEn } from './ux-heuristics';
import { uxHeuristicsControlEn } from './ux-heuristics-control';
import { uxHeuristicsClarityEn } from './ux-heuristics-clarity';
import { uxHeuristicsConsistencyEn } from './ux-heuristics-consistency';
import { userFlowsEn } from './user-flows';
import { userFlowsEdgeEn } from './user-flows-edge';
import { informationArchitectureEn } from './information-architecture';
import { formsEn } from './forms';
import { formsValidationEn } from './forms-validation';
import { formsStructureEn } from './forms-structure';
import { microcopyEn } from './microcopy';
import { emptyStatesEn } from './empty-states';
import { briefResearchEn } from './brief-research';
import { researchMethodsEn } from './research-methods';
import { insightsToConceptEn } from './insights-to-concept';
import { paletteElementsEn } from './palette-elements';

/**
 * English lesson registry, keyed by slug. Mirrors the Russian ../index.ts.
 * Any slug absent here falls back to the Russian source (see ../localized.ts),
 * so the app never shows a blank lesson mid-translation.
 */
export const lessonsEn: Record<string, Lesson> = {
  [designThinkingIntroEn.slug]: designThinkingIntroEn,
  [figmaIntroEn.slug]: figmaIntroEn,
  [spacing8ptEn.slug]: spacing8ptEn,
  [radiusScaleEn.slug]: radiusScaleEn,
  [typeHierarchyEn.slug]: typeHierarchyEn,
  [colorContrastEn.slug]: colorContrastEn,
  [microTypographyEn.slug]: microTypographyEn,
  [gridsCompositionEn.slug]: gridsCompositionEn,
  [responsiveLayoutEn.slug]: responsiveLayoutEn,
  [navBarsEn.slug]: navBarsEn,
  [motionEasingEn.slug]: motionEasingEn,
  [designTokensEn.slug]: designTokensEn,
  [componentsVariantsEn.slug]: componentsVariantsEn,
  [figmaComponentsSlotsEn.slug]: figmaComponentsSlotsEn,
  [aiDesignToolsEn.slug]: aiDesignToolsEn,
  [uxHeuristicsEn.slug]: uxHeuristicsEn,
  [uxHeuristicsControlEn.slug]: uxHeuristicsControlEn,
  [uxHeuristicsClarityEn.slug]: uxHeuristicsClarityEn,
  [uxHeuristicsConsistencyEn.slug]: uxHeuristicsConsistencyEn,
  [userFlowsEn.slug]: userFlowsEn,
  [userFlowsEdgeEn.slug]: userFlowsEdgeEn,
  [informationArchitectureEn.slug]: informationArchitectureEn,
  [formsEn.slug]: formsEn,
  [formsValidationEn.slug]: formsValidationEn,
  [formsStructureEn.slug]: formsStructureEn,
  [microcopyEn.slug]: microcopyEn,
  [emptyStatesEn.slug]: emptyStatesEn,
  [briefResearchEn.slug]: briefResearchEn,
  [researchMethodsEn.slug]: researchMethodsEn,
  [insightsToConceptEn.slug]: insightsToConceptEn,
  [paletteElementsEn.slug]: paletteElementsEn,
};
