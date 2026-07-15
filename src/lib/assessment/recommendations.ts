/**
 * Growth recommendations: maps each test skill to the platform lessons and
 * videos that cover it. Drives the "точки роста" block on the result screen and
 * the teacher's admin view.
 *
 * Lesson slugs are validated against the static registry (src/content/lessons)
 * at module load in dev, so a renamed lesson fails loudly instead of producing a
 * dead /learn link. Skills not yet covered by a lesson (client-approval,
 * responses, interviews-job, …) fall back to the three curated videos and the
 * nearest-in-spirit lesson.
 */

import { lessons } from '@/content/lessons';
import { SKILLS } from './taxonomy';

export interface VideoRef {
  title: string;
  url: string;
}

// The three curated videos the user provided.
const VIDEO_REVERSTKA: VideoRef = {
  title: 'Переверстка плохого экрана',
  url: 'https://youtu.be/6Yqi2kNdOMw',
};
const VIDEO_CJM: VideoRef = {
  title: 'Построение CJM и скринфлоу',
  url: 'https://youtu.be/XknSft8VUn8',
};
const VIDEO_CAREER: VideoRef = {
  title: 'Карьерный разбор. Лечим резюме',
  url: 'https://youtu.be/m64-PE-IGR0',
};

export interface Recommendation {
  lessonSlugs: string[];
  video?: VideoRef;
}

/** skillId → recommendation. Lesson slugs must exist in the static registry. */
export const RECOMMENDATIONS: Record<string, Recommendation> = {
  // UI
  'client-approval': { lessonSlugs: ['grids-composition', 'palette-elements'] },
  layout: { lessonSlugs: ['spacing-8pt-grid', 'micro-typography', 'grids-composition'], video: VIDEO_REVERSTKA },
  composition: { lessonSlugs: ['grids-composition', 'spacing-8pt-grid'], video: VIDEO_REVERSTKA },
  color: { lessonSlugs: ['color-contrast', 'palette-elements', 'design-tokens'] },
  figma: { lessonSlugs: ['figma-intro', 'figma-components-slots'] },
  ds: { lessonSlugs: ['design-tokens', 'components-variants', 'figma-components-slots'] },
  style: { lessonSlugs: ['palette-elements', 'grids-composition', 'insights-to-concept'] },
  // UX
  scenarios: { lessonSlugs: ['user-flows', 'user-flows-edge', 'information-architecture'], video: VIDEO_CJM },
  'ux-writing': { lessonSlugs: ['microcopy', 'micro-typography'] },
  responsive: { lessonSlugs: ['responsive-layout'] },
  states: { lessonSlugs: ['forms-validation', 'empty-states', 'ux-heuristics-control'] },
  // Product
  confidence: { lessonSlugs: ['design-thinking-intro', 'brief-research'] },
  tasks: { lessonSlugs: ['brief-research', 'design-thinking-intro'] },
  metrics: { lessonSlugs: ['research-methods', 'insights-to-concept'] },
  hypotheses: { lessonSlugs: ['insights-to-concept', 'research-methods'] },
  audience: { lessonSlugs: ['brief-research', 'research-methods'] },
  interviews: { lessonSlugs: ['research-methods', 'brief-research'] },
  'ux-tests': { lessonSlugs: ['research-methods'] },
  'more-research': { lessonSlugs: ['research-methods'] },
  // Career
  cases: { lessonSlugs: ['insights-to-concept'], video: VIDEO_CAREER },
  responses: { lessonSlugs: [], video: VIDEO_CAREER },
  'interviews-job': { lessonSlugs: [], video: VIDEO_CAREER },
  'test-tasks': { lessonSlugs: ['grids-composition', 'brief-research'], video: VIDEO_CAREER },
  specialization: { lessonSlugs: [] },
  experience: { lessonSlugs: [] },
};

/** Resolved lesson link (slug + human title) for the UI. */
export interface LessonLink {
  slug: string;
  title: string;
}

export function recommendationFor(skillId: string): {
  lessons: LessonLink[];
  video?: VideoRef;
} {
  const rec = RECOMMENDATIONS[skillId] ?? { lessonSlugs: [] };
  const lessonLinks = rec.lessonSlugs
    .map((slug) => {
      const lesson = lessons[slug];
      return lesson ? { slug, title: lesson.title } : null;
    })
    .filter((l): l is LessonLink => l !== null);
  return { lessons: lessonLinks, video: rec.video };
}

// Dev-only integrity check: every skill has an entry, every slug resolves.
if (process.env.NODE_ENV !== 'production') {
  for (const s of SKILLS) {
    if (!RECOMMENDATIONS[s.id]) {
      console.warn(`[assessment] no recommendation for skill "${s.id}"`);
    }
  }
  for (const [skillId, rec] of Object.entries(RECOMMENDATIONS)) {
    for (const slug of rec.lessonSlugs) {
      if (!lessons[slug]) {
        console.warn(`[assessment] recommendation "${skillId}" points to missing lesson "${slug}"`);
      }
    }
  }
}
