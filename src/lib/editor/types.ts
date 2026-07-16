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

/** The active canvas tool. `move` = select/drag (default); the rest draw new
 *  layers. Wired incrementally — `shape` and `text` draw today, the others are
 *  selectable and fall back to move behaviour until their draw logic lands. */
export type EditorTool = 'move' | 'frame' | 'shape' | 'pen' | 'text' | 'comment' | 'components';

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
  /** Layer opacity 0–1 (from `opacity`/`fill-opacity`), when explicitly set. */
  opacity?: number;
  /** Auto-layout flow inferred from children geometry — how the group arranges
   *  its immediate children. `none` = free/absolute (a plain group). */
  layout?: 'row' | 'column' | 'grid' | 'none';
  /** Whether the frame/group clips its children to its own bounds (Figma's
   *  "Clip content"). When true the canvas hides anything overflowing the frame
   *  rather than letting the bounds grow to enclose it. */
  clip?: boolean;
  /** Whether this `frame`-typed node is a REAL frame (its own bounds, own clip)
   *  vs a plain group. Every `<g>` parses to `type: 'frame'`, but only genuine
   *  frames — an explicit auto-layout, or a group the teacher converted via
   *  "group → frame" (framify, persisted as `data-frame` on the SVG) — get
   *  frame-only affordances like "Clip content". A plain group has this unset,
   *  matching Figma where groups have no clip toggle. */
  frame?: boolean;
  /** Role of a `frame` layer in a critique exercise, shown as an icon in the
   *  on-canvas frame chrome. `reference` = эталон (the correct original),
   *  `flawed` = косячный (the version with planted defects). Undefined = plain
   *  frame. Only meaningful on `frame` layers; toggled by the teacher. */
  frameRole?: 'reference' | 'flawed';
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
