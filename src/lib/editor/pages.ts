/**
 * Pages inside one editor draft (Figma-style). A draft is no longer a single
 * imported screen — it's an ordered list of pages, each its own canvas (its own
 * SVG + layer tree + authoring draft), optionally split by visual dividers. One
 * page can be marked the "Title" (cover): its render becomes the draft's
 * thumbnail in the project list. Kept deliberately serialisable so the whole
 * structure round-trips through localStorage (and, later, a DB row).
 */

import type { ParseResult } from './types';
import type { EditorDraft } from '@/components/editor/EditorSteps';

/** A drawable page — an independent canvas with its own layers + draft. */
export interface EditorPage {
  id: string;
  kind: 'page';
  name: string;
  result: ParseResult;
  draft: EditorDraft;
}

/** A non-drawable separator row in the Pages panel (label between groups). */
export interface EditorDivider {
  id: string;
  kind: 'divider';
  name: string;
}

export type PageItem = EditorPage | EditorDivider;

/** Lightweight metadata the Pages panel renders from (no heavy result payload). */
export interface PageMeta {
  id: string;
  kind: 'page' | 'divider';
  name: string;
}

export const isPage = (i: PageItem | PageMeta): i is EditorPage & PageMeta =>
  i.kind === 'page';

/** The default authoring draft that rides on a fresh page. */
export function blankDraft(): EditorDraft {
  return { title: '', kind: 'critique', brokenSvg: undefined, zones: [], access: 'PUBLIC', audience: '' };
}

/**
 * An empty canvas for a newly-created page — a white artboard at the standard
 * mobile frame size that already ships with a real `frame` layer (just like an
 * imported file would), so the teacher can start drawing onto it immediately
 * instead of having to create the frame by hand first.
 */
export function blankResult(width = 375, height = 812): ParseResult {
  const fill = '#ffffff';
  return {
    screen: {
      width,
      height,
      layers: [
        {
          id: 'L0',
          name: 'Фрейм',
          type: 'frame',
          props: { fill, box: { x: 0, y: 0, w: width, h: height } },
          children: [],
        },
      ],
    },
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect data-layer-id="L0" width="${width}" height="${height}" fill="${fill}"/></svg>`,
    errors: [],
  };
}
