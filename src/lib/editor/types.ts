/**
 * Editor core — the layer model an imported SVG is parsed into. This is the
 * shared vocabulary for the Figma-like assignment editor: the parser produces
 * it, the canvas renders from it, the properties panel edits it, and (later)
 * critique zones attach to individual layers. Deliberately small — only the
 * handful of props the teacher actually tweaks (radius / fill / text), not a
 * full SVG DOM. Faithful pixels come from rendering the original SVG; this tree
 * is the editable/inspectable structure laid over it.
 */

export type LayerType = 'frame' | 'text' | 'block' | 'image' | 'vector';

/** The subset of visual attributes surfaced in the properties panel. */
export interface LayerProps {
  /** Corner radius (rect rx), in SVG user units. */
  radius?: number;
  /** Resolved fill colour (hex/rgb), or undefined when `fill="none"`. */
  fill?: string;
  /** Text content (concatenated tspans), for `text` layers. */
  text?: string;
  /** Font size in SVG user units, for `text` layers. */
  fontSize?: number;
  /** Font weight, for `text` layers. */
  fontWeight?: string;
  /** Text colour (fill of a text node). */
  color?: string;
  /** Numeric bounding box when statically known (rect/image). Absolute
   *  positioning for highlights is computed at render time via the DOM, so this
   *  is best-effort metadata, not the source of truth for geometry. */
  box?: { x: number; y: number; w: number; h: number };
}

export interface Layer {
  /** Stable id assigned at parse time; also written to the source SVG node as
   *  `data-layer-id` so the canvas can locate it for selection highlights. */
  id: string;
  /** Human name — from `data-name`/`id`/`<title>`/`aria-label`, else derived. */
  name: string;
  type: LayerType;
  props: LayerProps;
  children: Layer[];
}

export interface ParsedScreen {
  /** viewBox / width-height of the root svg, in user units. */
  width: number;
  height: number;
  /** The layer tree (top-level children of the root svg). */
  layers: Layer[];
}

export interface ParseResult {
  screen: ParsedScreen;
  /** The (mutated) SVG markup to render on the canvas — every parsed node now
   *  carries a `data-layer-id`. Empty string when parsing failed. */
  svg: string;
  /** Human-readable problems (bad XML, no svg root, empty file) — surfaced in
   *  the dropzone so the teacher knows why an import produced nothing. */
  errors: string[];
}
