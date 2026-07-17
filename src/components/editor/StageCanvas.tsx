'use client';

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Frame as FrameIcon, BadgeCheck, Bug } from 'lucide-react';
import type { EditorTool } from '@/lib/editor/types';
import { useT } from '@/lib/i18n/client';
import { RENAME_RADIUS_PX } from './renameField';

/** A top-level frame the canvas draws chrome for: a name label above the frame
 *  and a role icon (frame / эталон / косячный) that cycles on click. */
export interface FrameChrome {
  id: string;
  name: string;
  role?: 'reference' | 'flawed';
}

/**
 * The infinite editor stage — Figma-style. The imported SVG floats on a grid
 * (not framed), centred on load. The whole scene lives in a CSS-transformed
 * content layer (`translate + scale`), so pan and zoom are a single matrix:
 *
 *  · wheel                → pan (the page itself never scrolls — the stage does)
 *  · Alt + wheel          → zoom toward the cursor
 *  · drag empty grid      → pan
 *  · drag a layer         → move that layer (mutates the SVG on drop)
 *  · hover                → outermost group highlights (Figma default)
 *  · Alt + hover / click  → pierce through groups to the deepest leaf
 *
 * Highlight overlays are measured from the live DOM (getBoundingClientRect) and
 * converted back into the unscaled content space, so they ride the transform
 * exactly — no matrix math on our side.
 */

interface View {
  x: number;
  y: number;
  scale: number;
}
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
/** Magnet distance for move/resize alignment snapping, in screen px. */
const SNAP_PX = 6;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Modifier that means "go deep" — pierce groups down to the leaf. Cmd · Ctrl ·
 *  Alt, any of them (used by click / hover). */
const wantsDeep = (e: { altKey: boolean; metaKey: boolean; ctrlKey: boolean }) =>
  e.altKey || e.metaKey || e.ctrlKey;

/** Wheel modifier that means "zoom" — Cmd / Ctrl (and trackpad pinch, which the
 *  browser reports as ctrl+wheel). Alt is intentionally NOT here: Alt+wheel pans
 *  vertically, matching a mouse-wheel scroll. */
const wantsZoom = (e: { metaKey: boolean; ctrlKey: boolean }) => e.metaKey || e.ctrlKey;

/**
 * The topmost *leaf* layer whose bounding box contains the point, if any.
 *
 * Native SVG hit-testing only fires where an element actually paints, so a
 * glyph's counters, the gaps between letters, and the hollow of an unfilled
 * path all fall through to whatever is behind them. Figma hit-tests a text or
 * vector layer by its box, so we do the same: scan the leaves (anything with no
 * nested [data-layer-id] — i.e. not a frame or group, whose boxes are large
 * enough that a box test would swallow every click inside them) back-to-front
 * and take the last one that covers the point.
 */
function bboxLeafIdAt(root: Element | null, clientX: number, clientY: number): string | null {
  if (!root) return null;
  let hit: string | null = null;
  for (const el of root.querySelectorAll('[data-layer-id]')) {
    if (el.querySelector('[data-layer-id]')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue;
    // Document order paints back-to-front, so the last match is the topmost.
    hit = el.getAttribute('data-layer-id');
  }
  return hit;
}

/** Screen-space area of an element's bounding box. */
function boxArea(el: Element): number {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
}

/** The layer id under a hit target — deepest leaf, or the outermost group. */
function layerIdAt(target: EventTarget | null, deep: boolean, root?: Element | null, clientX?: number, clientY?: number): string | null {
  let el = target instanceof Element ? target.closest('[data-layer-id]') : null;
  // Native SVG hit-testing only fires on painted ink, so clicking a gap between
  // outlined-text glyphs (or a glyph's counter) falls through to whatever paints
  // there — usually the full-bleed background rect. bboxLeafIdAt recovers the
  // intended target by box, but we must decide when it beats the browser's hit.
  if (root != null && clientX != null && clientY != null) {
    const boxId = bboxLeafIdAt(root, clientX, clientY);
    const boxEl = boxId ? root.querySelector(`[data-layer-id="${boxId}"]`) : null;
    if (boxEl && boxEl !== el) {
      // Take the box hit when the browser resolved nothing, when it's the gap
      // inside a frame/group we landed on (containment), or when it's a smaller
      // leaf painted ABOVE whatever we hit — the outlined-text case: the glyph
      // gap lands on the background, but the text object's box covers the gap and
      // sits on top, so it wins. The size guard stops a large backdrop from
      // stealing clicks off the small elements drawn over it.
      const above = el ? (el.compareDocumentPosition(boxEl) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : true;
      if (!el || el.contains(boxEl) || (above && boxArea(boxEl) <= boxArea(el))) el = boxEl;
    }
  }
  if (!el) return null;
  if (deep) return el.getAttribute('data-layer-id');
  let top = el;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.hasAttribute('data-layer-id')) top = p;
    else break;
  }
  return top.getAttribute('data-layer-id');
}

/**
 * The rect backing an element's `clip-path="url(#id)"`, wherever the <clipPath>
 * lives. Frames come in two shapes: ones we author inline (<clipPath> is a child
 * of the frame's <g>), and imported ones, whose <clipPath> Figma parks in <defs>
 * (see parseSvg). Resolving through the URL reference covers both — a `:scope >
 * clipPath > rect` selector silently misses the imported case, which leaves the
 * clip frozen at its old bounds and crops the frame as it grows.
 */
function clipRectOf(el: Element): Element | null {
  const cp = el.getAttribute('clip-path') || '';
  const m = /url\(#(.+?)\)/.exec(cp);
  if (!m) return null;
  const doc = el.ownerDocument;
  if (!doc) return null;
  const id = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(m[1]) : m[1];
  return doc.querySelector(`clipPath[id="${id}"] > rect`);
}

/** SVG tags that actually render ink (so their bounds mean something visible). */
const PAINT_TAGS = new Set([
  'text', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'image', 'use',
]);

/** Whether an element paints anything — a fill or a stroke that's actually visible. */
function paints(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (!PAINT_TAGS.has(tag)) return false;
  if (tag === 'image' || tag === 'use') return true;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
  const blank = (v: string) => v === 'none' || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';
  const hasFill = !blank(cs.fill) && +cs.fillOpacity !== 0;
  const hasStroke = !blank(cs.stroke) && parseFloat(cs.strokeWidth) > 0 && +cs.strokeOpacity !== 0;
  return hasFill || hasStroke;
}

/**
 * Screen-space bounds of only the *visible ink* under a node. Figma exports a
 * text (or outlined-text) layer as a `<g>` holding the glyphs plus a transparent
 * frame rect that marks the design-time text box — and `getBoundingClientRect`
 * on the group unions that invisible rect, so the selection box trails far past
 * the glyphs. Unioning only painted descendants hugs what you actually see.
 *
 * Leaves paint on their own, so they take the plain rect (fast path); only groups
 * pay for the descendant sweep. Returns null when nothing paints, so the caller
 * falls back to the node's own rect.
 */
function inkClientRect(node: Element): DOMRect | null {
  if (PAINT_TAGS.has(node.tagName.toLowerCase())) return node.getBoundingClientRect();
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, found = false;
  for (const el of Array.from(node.querySelectorAll('*'))) {
    if (!paints(el)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    left = Math.min(left, r.left); top = Math.min(top, r.top);
    right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    found = true;
  }
  if (!found) return null;
  return new DOMRect(left, top, right - left, bottom - top);
}

/** A layer's content-space bounds plus its centre, for alignment snapping. */
type SnapBox = { left: number; top: number; right: number; bottom: number; cx: number; cy: number };

/** Content-space box of an element, given the content rect origin and scale. */
function snapBoxOf(el: Element, crLeft: number, crTop: number, scale: number): SnapBox {
  const r = el.getBoundingClientRect();
  const left = (r.left - crLeft) / scale;
  const top = (r.top - crTop) / scale;
  const right = (r.right - crLeft) / scale;
  const bottom = (r.bottom - crTop) / scale;
  return { left, top, right, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}

export function StageCanvas({
  svg,
  width,
  height,
  background = null,
  selectedIds,
  hoveredId,
  onSelect,
  onSelectMany,
  onHover,
  onMoveLayers,
  onDuplicateLayers,
  onTransformLayers,
  onResizeFrame,
  onResizeRect,
  onSetRadius,
  onContextMenu,
  tool = 'move',
  scaleMode = false,
  radiusLayerId = null,
  radius = 0,
  onCreateRect,
  onCreateFrame,
  onCreateText,
  onCanvasActivate,
  fitSignal = 0,
  zoneIds,
  svgHostRef,
  frames,
  onCycleFrameRole,
  onRename,
}: {
  svg: string;
  /** viewBox size in user units — one unit renders as one content-space px. */
  width: number;
  height: number;
  /** Canvas (page) background colour. null → the themed default (dotted grid). */
  background?: string | null;
  /** Selected layer ids. The last entry is the "primary" (drives side panels). */
  selectedIds: string[];
  hoveredId: string | null;
  /** Select a layer. `additive` (Shift) toggles it in/out of the current set;
   *  otherwise it replaces the selection. Pass null to clear. */
  onSelect: (id: string | null, additive?: boolean) => void;
  /** Replace (or, when `additive`, extend) the selection with a set of ids — used
   *  by the marquee. */
  onSelectMany?: (ids: string[], additive?: boolean) => void;
  onHover: (id: string | null) => void;
  /** Commit a finished drag: shift every given layer by (dx,dy) user units. */
  onMoveLayers: (ids: string[], dx: number, dy: number) => void;
  /** Alt/Option-drag drop: leave the originals put and stamp a copy of each at the
   *  dragged (dx,dy) offset — Figma's Alt-drag-to-duplicate. */
  onDuplicateLayers?: (ids: string[], dx: number, dy: number) => void;
  /** Commit a finished resize/rotate: prepend `matrix(...)` (content/root space)
   *  to every given layer's transform. */
  onTransformLayers?: (ids: string[], matrix: string) => void;
  /** Commit a frame-border resize: set the frame's bg/clip rect to the new local
   *  box, leaving its children untouched (Figma frame semantics). */
  /** Commit a frame-border resize. `radius` (when given) is the re-clamped corner
   *  radius applied to the frame's bg + clip rects, keeping rx == ry. */
  onResizeFrame?: (id: string, box: { x: number; y: number; w: number; h: number }, radius?: number) => void;
  /** Commit a plain-rect resize: set the rect's x/y/width/height to the new box,
   *  leaving rx/ry untouched so the corner radius doesn't stretch. */
  /** Commit a plain-rect resize. `radius` (when given) is the re-clamped corner
   *  radius that keeps rx == ry, so a shrunk rect never reads as an ellipse. */
  onResizeRect?: (id: string, box: { x: number; y: number; w: number; h: number }, radius?: number) => void;
  /** Commit a corner-radius drag on a single rect layer. */
  onSetRadius?: (id: string, r: number) => void;
  /** Right-click — opens the shared context menu. `layerId` is null on empty grid. */
  onContextMenu: (e: React.MouseEvent, layerId: string | null) => void;
  /** Active tool. `move` selects/drags; `shape`/`text` draw new layers. */
  tool?: EditorTool;
  /** Scale mode (K): corner handles scale the selection proportionally. Off (V):
   *  corners resize each axis freely (Shift locks aspect). */
  scaleMode?: boolean;
  /** When the single selection is a rounded-rect, its id — enables the on-canvas
   *  corner-radius handle. Null otherwise. */
  radiusLayerId?: string | null;
  /** Current corner radius of `radiusLayerId`, in user units. */
  radius?: number;
  /** Commit a drawn rectangle (user-space box). */
  onCreateRect?: (box: { x: number; y: number; w: number; h: number }) => void;
  /** Commit a drawn frame (user-space box) — a new white artboard. */
  onCreateFrame?: (box: { x: number; y: number; w: number; h: number }) => void;
  /** Commit a placed text node (user-space point = top-left baseline anchor). */
  onCreateText?: (pt: { x: number; y: number }) => void;
  /** Any canvas pointer-down — lets the shell morph the dock into tools mode. */
  onCanvasActivate?: () => void;
  /** Bumped counter — refit the scene to the viewport on change. */
  fitSignal?: number;
  /** Layer ids promoted to critique zones — outlined in green. */
  zoneIds?: Set<string>;
  /** Ref to the div wrapping the injected `<svg>`, so callers can measure nodes. */
  svgHostRef?: React.Ref<HTMLDivElement>;
  /** Top-level frames to draw Figma-style chrome for (name label + role icon). */
  frames?: FrameChrome[];
  /** Cycle a frame's role (обычный → эталон → косячный → обычный). */
  onCycleFrameRole?: (id: string) => void;
  /** Rename a layer — drives the frame name label's double-click editing, the
   *  same gesture (and the same commit) as renaming a row in the layers panel. */
  onRename?: (id: string, name: string) => void;
}) {
  const { t } = useT();
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selHiRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  // Alt held over the stage → show the duplicate (copy) cursor, Figma-style.
  const [altHeld, setAltHeld] = useState(false);
  const [selBoxes, setSelBoxes] = useState<Box[]>([]);
  const [hovBox, setHovBox] = useState<Box | null>(null);
  const [zoneBoxes, setZoneBoxes] = useState<Box[]>([]);
  const [frameBoxes, setFrameBoxes] = useState<(FrameChrome & { box: Box })[]>([]);

  // The committed view is mirrored in a ref so imperative gesture code reads the
  // latest without depending on it (and without re-binding listeners).
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;

  // A live gesture — panning the stage or dragging a layer. Kept in a ref so the
  // window listeners read the latest without re-binding every move. During the
  // gesture we mutate the DOM directly (transform on the content layer / dragged
  // node) and only push the result into React state on pointer-up — so a drag is
  // one style write per frame, not a full re-render + getBoundingClientRect.
  const drag = useRef<
    | null
    | { kind: 'pan'; startX: number; startY: number; ox: number; oy: number; scale: number }
    | { kind: 'move'; ids: string[]; nodes: { node: SVGGraphicsElement; base: string }[]; startX: number; startY: number; scale: number; dx: number; dy: number; baseBox: SnapBox; targets: SnapBox[]; duplicate: boolean; clones?: Element[] }
    | { kind: 'draw'; crLeft: number; crTop: number; scale: number; sx: number; sy: number; box: { x: number; y: number; w: number; h: number }; hitId: string | null; frame?: boolean }
    | { kind: 'marquee'; crLeft: number; crTop: number; scale: number; sx: number; sy: number; box: { x: number; y: number; w: number; h: number }; additive: boolean; base: string[] }
    | {
        kind: 'transform';
        sub: 'resize' | 'rotate' | 'radius';
        ids: string[];
        nodes: { node: SVGGraphicsElement; base: string }[];
        scale: number;
        crLeft: number;
        crTop: number;
        box: { left: number; top: number; width: number; height: number };
        movesE: boolean; movesW: boolean; movesN: boolean; movesS: boolean;
        anchorX: number; anchorY: number;
        cx: number; cy: number; startAngle: number;
        cornerX: number; cornerY: number; maxRadius: number; layerId: string | null;
        // Radius drag: inward direction of the grabbed corner (+1/-1 per axis), so
        // the same distance maths works from any of the four corners.
        radiusSx: number; radiusSy: number;
        lockAspect: boolean;
        lastMatrix: string | null;
        lastRadius: number | null;
        // Neighbour + content edges the resized frame's moving border magnetises
        // to (a frame's own children so its border can hug the content, plus its
        // siblings). Empty for rotate/radius. Snap is on by default; Shift bypasses.
        targets: SnapBox[];
        // Frame-border resize: when the sole selected node is a top-level frame
        // with an explicit bg/clip rect, we move its edges instead of scaling its
        // children (Figma's frame vs group distinction). Null for plain groups.
        frameRects?: { el: Element; x0: number; y0: number; w0: number; h0: number }[] | null;
        frameId?: string | null;
        lastFrameBox?: { x: number; y: number; w: number; h: number } | null;
        // Plain-rect resize (V only): when the sole selected node is a bare <rect>, we
        // resize by mutating its x/y/width/height instead of baking a matrix scale —
        // otherwise the scale stretches the rounded corners into ellipses. The radius
        // is held absolute at `rectR0` but re-clamped to min(w,h)/2 with rx == ry each
        // frame (`lastRectRadius`), so corners stay circular. Reuses the frameRects
        // live-mutation path; commits via onResizeRect.
        rectResize?: boolean;
        rectId?: string | null;
        /** Corner radius at drag start — the absolute value to hold. */
        rectR0?: number;
        /** Latest re-clamped radius written to the rect; committed on drop. */
        lastRectRadius?: number | null;
        // Frame-chrome strips (name + role icon) of the resized frames, captured at
        // drag start so `flush` can ride them along live — otherwise the label/icon
        // lag behind the frame's edges until the resize commits. `off` is the fixed
        // screen-space gap the label sits above the frame's top edge.
        chromes?: { el: HTMLElement; left: number; top: number; width: number; off: number }[];
      }
  >(null);

  // Live rubber-band rectangle drawn while a shape tool is dragging — positioned
  // in content space (1px = 1 user unit) and toggled without a re-render.
  const drawRef = useRef<HTMLDivElement>(null);

  // The size/angle badge shown under the selection and the corner-radius handle —
  // both updated imperatively during a transform gesture, then re-derived from
  // React state on commit.
  const dimLabelRef = useRef<HTMLDivElement>(null);
  // One radius handle per corner (all four move together — SVG rx/ry is uniform).
  const radiusHandleRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Imperative alignment guides drawn during a Shift-drag — positioned in
  // content space (so 1px = 1 user unit) and toggled without a re-render.
  const vGuideRef = useRef<HTMLDivElement>(null);
  const hGuideRef = useRef<HTMLDivElement>(null);

  // Latest pointer event awaiting a frame — coalesces the burst of pointermove
  // events the OS fires between two paints into a single visual update.
  const pending = useRef<{ x: number; y: number; shift: boolean } | null>(null);
  const raf = useRef<number | null>(null);

  // Last known cursor position over the stage, so pressing/releasing the deep
  // modifier (Alt/Cmd/Ctrl) can re-resolve the hover target without waiting for
  // the mouse to move — the highlight dives to the leaf the instant Alt goes down.
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Space held → temporary hand tool: a left-drag pans instead of marquee-
  // selecting, matching Figma. Tracked globally so it works regardless of focus.
  const spaceHeld = useRef(false);
  useEffect(() => {
    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const down = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      spaceHeld.current = true;
    };
    const up = (e: KeyboardEvent) => { if (isSpace(e)) spaceHeld.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Fit-and-centre the scene in the viewport (with a margin). Shared by the
  // initial layout and the "показать по размеру" action.
  const fitToScreen = useCallback(() => {
    const host = hostRef.current;
    if (!host || !width || !height) return;
    const { width: hw, height: hh } = host.getBoundingClientRect();
    if (!hw || !hh) return;
    const scale = clamp(Math.min((hw - 96) / width, (hh - 96) / height, 1), MIN_SCALE, MAX_SCALE);
    setView({ x: (hw - width * scale) / 2, y: (hh - height * scale) / 2, scale });
  }, [width, height]);

  // Fit the first time we know both sizes.
  useLayoutEffect(() => {
    if (view || !width || !height) return;
    fitToScreen();
  }, [view, width, height, fitToScreen]);

  // Refit on demand (context-menu "показать по размеру" bumps the signal).
  useEffect(() => {
    if (fitSignal > 0) fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  // Give every parse-derived frame rect its real geometry, now that the SVG is
  // live. parseSvg runs off-DOM: it can only union the children that carry
  // explicit x/y/width/height, so a frame full of <path>/<text> ends up boxed
  // around a subset of what it draws. Here getBBox() reports what's actually
  // rendered. Only "auto" rects are touched — a drawn/framified/resized frame's
  // rect is authoritative and must keep its own edges, even inside the content.
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    for (const bg of Array.from(content.querySelectorAll('rect[data-frame-bg="auto"]'))) {
      const g = bg.parentNode as SVGGraphicsElement | null;
      if (!g) continue;
      // A rect-based clip already states the frame's bounds exactly — content
      // deliberately overflows it, so measuring the children would over-inflate.
      const clip = clipRectOf(g);
      let box: { x: number; y: number; w: number; h: number } | null = null;
      if (clip) {
        box = {
          x: +(clip.getAttribute('x') ?? 0),
          y: +(clip.getAttribute('y') ?? 0),
          w: +(clip.getAttribute('width') ?? 0),
          h: +(clip.getAttribute('height') ?? 0),
        };
      } else {
        // Measure the children alone: the bg rect sits in the same user space and
        // would otherwise pin the union to the stale box we're replacing.
        const anchor = bg.nextSibling;
        g.removeChild(bg);
        try {
          const b = g.getBBox();
          if (b.width > 0 && b.height > 0) box = { x: b.x, y: b.y, w: b.width, h: b.height };
        } catch {
          // No rendered geometry — leave the parse-time box alone.
        }
        g.insertBefore(bg, anchor);
      }
      if (!box || !(box.w > 0) || !(box.h > 0)) continue;
      bg.setAttribute('x', String(box.x));
      bg.setAttribute('y', String(box.y));
      bg.setAttribute('width', String(box.w));
      bg.setAttribute('height', String(box.h));
    }
  }, [svg]);

  const measure = useCallback(
    (id: string | null): Box | null => {
      const content = contentRef.current;
      const v = view;
      if (!content || !id || !v) return null;
      const node = content.querySelector<SVGGraphicsElement>(`[data-layer-id="${id}"]`);
      if (!node) return null;
      const cr = content.getBoundingClientRect();
      // A frame is bounded by its own rect (data-frame-bg), not the union of its
      // children — otherwise content overflowing the frame inflates the box, and
      // shrinking the border below the content makes the selection snap back to
      // the children's extent. Plain layers measure their own bbox as before.
      const bounds = node.querySelector<SVGGraphicsElement>(':scope > rect[data-frame-bg]');
      // Non-frames measure their visible ink, not the raw node box — a text/vector
      // layer wrapped with a transparent Figma frame rect would otherwise select
      // far past the glyphs (see inkClientRect).
      const r = bounds ? bounds.getBoundingClientRect() : inkClientRect(node) ?? node.getBoundingClientRect();
      return {
        left: (r.left - cr.left) / v.scale,
        top: (r.top - cr.top) / v.scale,
        width: r.width / v.scale,
        height: r.height / v.scale,
      };
    },
    [view],
  );

  const selKey = selectedIds.join(',');
  useLayoutEffect(() => {
    setSelBoxes(selectedIds.map((id) => measure(id)).filter((b): b is Box => b != null));
    setHovBox(hoveredId && !selectedIds.includes(hoveredId) ? measure(hoveredId) : null);
    if (zoneIds && zoneIds.size) {
      const boxes: Box[] = [];
      for (const id of zoneIds) {
        const b = measure(id);
        if (b) boxes.push(b);
      }
      setZoneBoxes(boxes);
    } else {
      setZoneBoxes([]);
    }
    if (frames && frames.length) {
      const out: (FrameChrome & { box: Box })[] = [];
      for (const f of frames) {
        const b = measure(f.id);
        if (b) out.push({ ...f, box: b });
      }
      setFrameBoxes(out);
    } else {
      setFrameBoxes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, hoveredId, svg, view, measure, zoneIds, frames]);

  // Bounding box enclosing the whole selection (content space) — the frame the
  // transform handles ride on. Null when nothing is selected.
  const unionBox = useMemo(() => {
    if (!selBoxes.length) return null;
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const bx of selBoxes) {
      l = Math.min(l, bx.left); t = Math.min(t, bx.top);
      r = Math.max(r, bx.left + bx.width); b = Math.max(b, bx.top + bx.height);
    }
    return { left: l, top: t, width: r - l, height: b - t };
  }, [selBoxes]);

  // Selection-chrome accent by role: a selected «сломанный» frame paints its
  // transform gizmo red and an эталон frame green (matching the frame badge and
  // the layers panel); anything else stays brand-blue.
  const selAccent = useMemo(() => {
    const roles = new Set<string>();
    for (const id of selectedIds) {
      const f = frames?.find((fr) => fr.id === id);
      if (f?.role) roles.add(f.role);
    }
    if (roles.size === 1) {
      if (roles.has('flawed')) return 'var(--flaw-red)';
      if (roles.has('reference')) return 'var(--ref-green)';
    }
    return 'var(--brand)';
  }, [selectedIds, frames]);

  // Wheel: pan by default, zoom-to-cursor with Alt. Bound natively so we can
  // preventDefault (the page must not scroll behind the fixed stage).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        if (!v) return v;
        if (wantsZoom(e)) {
          const rect = host.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const next = clamp(v.scale * Math.exp(-e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
          const k = next / v.scale;
          return { scale: next, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
        }
        // Alt+wheel → vertical pan (mouse-wheel scroll). Plain wheel pans on both
        // axes (trackpad two-finger); Shift+wheel pans horizontally.
        if (e.altKey) return { ...v, y: v.y - e.deltaY };
        if (e.shiftKey) return { ...v, x: v.x - (e.deltaX || e.deltaY) };
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
      });
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => host.removeEventListener('wheel', onWheel);
  }, []);

  // Global move/up so a gesture keeps tracking outside the host bounds. The move
  // handler only records the latest pointer position and schedules a frame; all
  // DOM work happens in `flush`, at most once per paint.
  useEffect(() => {
    const flush = () => {
      raf.current = null;
      const g = drag.current;
      const p = pending.current;
      if (!g || !p) return;
      if (g.kind === 'pan') {
        const x = g.ox + (p.x - g.startX);
        const y = g.oy + (p.y - g.startY);
        const content = contentRef.current;
        if (content) content.style.transform = `translate(${x}px, ${y}px) scale(${g.scale})`;
      } else if (g.kind === 'draw') {
        const ux = (p.x - g.crLeft) / g.scale;
        const uy = (p.y - g.crTop) / g.scale;
        let w = Math.abs(ux - g.sx);
        let h = Math.abs(uy - g.sy);
        // Shift constrains to a square, sized by the larger dragged edge.
        if (p.shift) w = h = Math.max(w, h);
        const x = ux < g.sx ? g.sx - w : g.sx;
        const y = uy < g.sy ? g.sy - h : g.sy;
        g.box = { x, y, w, h };
        const el = drawRef.current;
        if (el) {
          el.style.display = 'block';
          el.style.left = `${g.box.x}px`;
          el.style.top = `${g.box.y}px`;
          el.style.width = `${g.box.w}px`;
          el.style.height = `${g.box.h}px`;
        }
      } else if (g.kind === 'marquee') {
        const ux = (p.x - g.crLeft) / g.scale;
        const uy = (p.y - g.crTop) / g.scale;
        g.box = {
          x: Math.min(ux, g.sx), y: Math.min(uy, g.sy),
          w: Math.abs(ux - g.sx), h: Math.abs(uy - g.sy),
        };
        const el = drawRef.current;
        if (el) {
          el.style.display = 'block';
          el.style.left = `${g.box.x}px`;
          el.style.top = `${g.box.y}px`;
          el.style.width = `${g.box.w}px`;
          el.style.height = `${g.box.h}px`;
        }
      } else if (g.kind === 'transform') {
        let px = (p.x - g.crLeft) / g.scale;
        let py = (p.y - g.crTop) / g.scale;
        if (g.sub === 'resize') {
          // Magnetise the moving edge to the nearest neighbour/content edge — on
          // by default (Shift or aspect-lock bypasses it). Snapping `px`/`py` here
          // feeds the same scale maths below, so it works for both frame-border
          // and matrix-scale resizes. `guide*` marks the matched line for the rule.
          let guideX: number | null = null;
          let guideY: number | null = null;
          if (!g.lockAspect && !p.shift && g.targets.length) {
            const T = SNAP_PX / g.scale;
            if (g.movesE || g.movesW) {
              let best = T;
              for (const t of g.targets) for (const tv of [t.left, t.cx, t.right]) {
                const d = Math.abs(tv - px);
                if (d < best) { best = d; px = tv; guideX = tv; }
              }
            }
            if (g.movesN || g.movesS) {
              let best = T;
              for (const t of g.targets) for (const tv of [t.top, t.cy, t.bottom]) {
                const d = Math.abs(tv - py);
                if (d < best) { best = d; py = tv; guideY = tv; }
              }
            }
          }
          const vg = vGuideRef.current;
          if (vg) { vg.style.display = guideX == null ? 'none' : 'block'; if (guideX != null) vg.style.left = `${guideX}px`; }
          const hg = hGuideRef.current;
          if (hg) { hg.style.display = guideY == null ? 'none' : 'block'; if (guideY != null) hg.style.top = `${guideY}px`; }
          let sx = 1, sy = 1;
          if (g.movesE) sx = (px - g.anchorX) / g.box.width;
          else if (g.movesW) sx = (g.anchorX - px) / g.box.width;
          if (g.movesS) sy = (py - g.anchorY) / g.box.height;
          else if (g.movesN) sy = (g.anchorY - py) / g.box.height;
          sx = Math.max(sx, 0.02);
          sy = Math.max(sy, 0.02);
          // K (scaleMode) or Shift → uniform scale. For a corner, follow the axis
          // the cursor moved furthest on; for an edge, mirror onto the other axis.
          if (g.lockAspect || p.shift) {
            const hasH = g.movesE || g.movesW;
            const hasV = g.movesN || g.movesS;
            if (hasH && hasV) { const u = Math.abs(sx - 1) >= Math.abs(sy - 1) ? sx : sy; sx = sy = u; }
            else if (hasH) sy = sx;
            else if (hasV) sx = sy;
          }
          const e = g.anchorX * (1 - sx);
          const f = g.anchorY * (1 - sy);
          if (g.frameRects) {
            // Move the frame's own edges: scale factors are dimensionless, so the
            // new local rect follows the same sx/sy from the anchored edge. Children
            // (siblings of the bg/clip rect) are never touched — they just clip.
            let nb = { x: 0, y: 0, w: 0, h: 0 };
            for (const r of g.frameRects) {
              const nw = r.w0 * sx;
              const nh = r.h0 * sy;
              const nx = g.movesW ? r.x0 + r.w0 - nw : r.x0;
              const ny = g.movesN ? r.y0 + r.h0 - nh : r.y0;
              r.el.setAttribute('x', nx.toFixed(1));
              r.el.setAttribute('y', ny.toFixed(1));
              r.el.setAttribute('width', nw.toFixed(1));
              r.el.setAttribute('height', nh.toFixed(1));
              nb = { x: +nx.toFixed(1), y: +ny.toFixed(1), w: +nw.toFixed(1), h: +nh.toFixed(1) };
              // Hold the corner radius absolute, but keep rx == ry and capped at
              // min(w,h)/2 so the shape never degrades into an ellipse (see the
              // rectR0 note in startTransform). Applies to a plain rect (V) and to a
              // frame's bg/clip rects alike — every rect here gets the same radius,
              // so the background and its clip can't drift apart.
              if ((g.rectR0 ?? 0) > 0) {
                const rr = +Math.min(g.rectR0 ?? 0, Math.min(nw, nh) / 2).toFixed(2);
                r.el.setAttribute('rx', String(rr));
                r.el.setAttribute('ry', String(rr));
                g.lastRectRadius = rr;
              }
            }
            g.lastFrameBox = nb;
          } else {
            const m = `matrix(${sx.toFixed(5)} 0 0 ${sy.toFixed(5)} ${e.toFixed(3)} ${f.toFixed(3)})`;
            g.lastMatrix = m;
            for (const { node, base } of g.nodes) node.setAttribute('transform', `${m} ${base}`.trim());
          }
          // Either way the selection border spans the same new box, so scale the
          // highlight overlay from the anchor to preview it.
          const hi = selHiRef.current;
          if (hi) {
            hi.style.transform = `matrix(${sx},0,0,${sy},${e},${f})`;
            // Feed the handles their inverse scale so they counter the stretch and
            // stay crisp squares (see TransformHandles). Inherited, so one write here.
            hi.style.setProperty('--gizmo-inv-x', `${1 / sx}`);
            hi.style.setProperty('--gizmo-inv-y', `${1 / sy}`);
          }
          const lab = dimLabelRef.current;
          if (lab) {
            lab.textContent = `${Math.round(g.box.width * sx)} × ${Math.round(g.box.height * sy)}`;
            // The label rides selHiRef's non-uniform matrix(sx,sy), which would
            // stretch the glyphs. Counter-scale about the top-center anchor so the
            // badge keeps its true size while still tracking the resized box.
            lab.style.transformOrigin = 'center top';
            lab.style.transform = `translateX(-50%) scale(${1 / sx}, ${1 / sy})`;
          }
          // Ride each frame's chrome (name + role icon) along with the new box —
          // reposition its strip via the same matrix so the right-aligned icon
          // tracks the moving edge instead of lagging until commit. The label's gap
          // above the top (`off`) is fixed screen space, so it's kept unscaled.
          if (g.chromes) {
            for (const c of g.chromes) {
              c.el.style.left = `${sx * c.left + e}px`;
              c.el.style.width = `${sx * c.width}px`;
              c.el.style.top = `${sy * c.top + f - c.off}px`;
            }
          }
        } else if (g.sub === 'rotate') {
          let ang = Math.atan2(py - g.cy, px - g.cx) - g.startAngle;
          if (p.shift) ang = Math.round(ang / (Math.PI / 12)) * (Math.PI / 12);
          const cos = Math.cos(ang), sin = Math.sin(ang);
          const e = g.cx - g.cx * cos + g.cy * sin;
          const f = g.cy - g.cx * sin - g.cy * cos;
          const m = `matrix(${cos.toFixed(6)} ${sin.toFixed(6)} ${(-sin).toFixed(6)} ${cos.toFixed(6)} ${e.toFixed(3)} ${f.toFixed(3)})`;
          g.lastMatrix = m;
          for (const { node, base } of g.nodes) node.setAttribute('transform', `${m} ${base}`.trim());
          const hi = selHiRef.current;
          if (hi) hi.style.transform = `matrix(${cos},${sin},${-sin},${cos},${e},${f})`;
          const lab = dimLabelRef.current;
          if (lab) lab.textContent = `${Math.round((ang * 180) / Math.PI)}°`;
        } else {
          // radius: drag any corner handle toward the centre to round more. The
          // grabbed corner's inward signs make the distance positive from any corner.
          let d = Math.min((px - g.cornerX) * g.radiusSx, (py - g.cornerY) * g.radiusSy);
          d = Math.max(0, Math.min(d, g.maxRadius));
          g.lastRadius = d;
          for (const { node } of g.nodes) {
            // Plain rect rounds itself; a frame <g> rounds its bg + clip rects so the
            // corner and the clipping both follow the drag live (commit mirrors this).
            const targets = node.tagName.toLowerCase() === 'rect'
              ? [node as Element]
              : Array.from(node.querySelectorAll(':scope > rect[data-frame-bg], :scope > clipPath > rect'));
            for (const t of targets) { t.setAttribute('rx', String(d)); t.setAttribute('ry', String(d)); }
          }
          // rx/ry is uniform, so slide all four handles inward from their own corners.
          const hs = 9 / g.scale / 2;
          const b = g.box;
          const spots = [
            { x: b.left, y: b.top, sx: 1, sy: 1 },
            { x: b.left + b.width, y: b.top, sx: -1, sy: 1 },
            { x: b.left + b.width, y: b.top + b.height, sx: -1, sy: -1 },
            { x: b.left, y: b.top + b.height, sx: 1, sy: -1 },
          ];
          radiusHandleRefs.current.forEach((rh, i) => {
            const sp = spots[i];
            if (rh && sp) { rh.style.left = `${sp.x + sp.sx * d - hs}px`; rh.style.top = `${sp.y + sp.sy * d - hs}px`; }
          });
        }
      } else {
        let dx = (p.x - g.startX) / g.scale;
        let dy = (p.y - g.startY) / g.scale;
        let guideX: number | null = null;
        let guideY: number | null = null;
        // Shift → constrain the move to one axis (Figma): keep the dominant delta
        // and zero the other, so the copy stays exactly parallel to the original
        // horizontally or vertically. The locked axis is also excluded from snapping
        // below — otherwise a neighbour could pull it back off the straight line.
        const lockY = p.shift && Math.abs(dx) >= Math.abs(dy); // moving along X, Y pinned
        const lockX = p.shift && !lockY; // moving along Y, X pinned
        if (lockY) dy = 0;
        if (lockX) dx = 0;
        // Snap the dragged box's edges/centre to any neighbour's edges/centre
        // within a small threshold, and remember the matched line for the guide.
        // On by default (Figma-style), and it keeps working under Shift — but only
        // on the axis Shift left free.
        if (g.targets.length) {
          const T = SNAP_PX / g.scale;
          const b = g.baseBox;
          let bestX = T;
          let bestY = T;
          for (const t of g.targets) {
            const tXs = [t.left, t.cx, t.right];
            const tYs = [t.top, t.cy, t.bottom];
            if (!lockX) {
              for (const dv of [b.left + dx, b.cx + dx, b.right + dx]) {
                for (const tv of tXs) {
                  const d = tv - dv;
                  if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx += d; guideX = tv; }
                }
              }
            }
            if (!lockY) {
              for (const dv of [b.top + dy, b.cy + dy, b.bottom + dy]) {
                for (const tv of tYs) {
                  const d = tv - dv;
                  if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy += d; guideY = tv; }
                }
              }
            }
          }
        }
        g.dx = dx;
        g.dy = dy;
        // Move every selected layer and the selection outlines together — all by
        // the same content-space delta, so no re-measure is needed.
        for (const { node, base } of g.nodes) {
          node.setAttribute('transform', `translate(${dx} ${dy}) ${base}`.trim());
        }
        const hi = selHiRef.current;
        if (hi) hi.style.transform = `translate(${dx}px, ${dy}px)`;
        // Frame chrome (name + role icon) lives outside the selection-outline
        // wrapper, so ride each dragged frame's chrome along by the same delta —
        // otherwise the label/icon lag behind the frame until the drop commits.
        const content = contentRef.current;
        if (content && !g.duplicate) {
          for (const id of g.ids) {
            const c = content.querySelector<HTMLElement>(`[data-frame-chrome-id="${id}"]`);
            if (c) c.style.transform = `translate(${dx}px, ${dy}px)`;
          }
        }
        const vg = vGuideRef.current;
        if (vg) { vg.style.display = guideX == null ? 'none' : 'block'; if (guideX != null) vg.style.left = `${guideX}px`; }
        const hg = hGuideRef.current;
        if (hg) { hg.style.display = guideY == null ? 'none' : 'block'; if (guideY != null) hg.style.top = `${guideY}px`; }
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      pending.current = { x: e.clientX, y: e.clientY, shift: e.shiftKey };
      if (raf.current == null) raf.current = requestAnimationFrame(flush);
    };
    const onUp = () => {
      if (raf.current != null) {
        cancelAnimationFrame(raf.current);
        raf.current = null;
      }
      const g = drag.current;
      drag.current = null;
      pending.current = null;
      if (!g) return;
      if (g.kind === 'pan') {
        // Adopt the transform we've been writing imperatively into React state.
        const content = contentRef.current;
        const v = viewRef.current;
        if (content && v) {
          const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(content.style.transform);
          if (m) setView({ x: +m[1], y: +m[2], scale: v.scale });
        }
      } else if (g.kind === 'draw') {
        if (drawRef.current) drawRef.current.style.display = 'none';
        // A real drag commits a rectangle; a plain click (no size) falls back to
        // selecting whatever object sits under the cursor — so the shape tool can
        // still pick objects the way the arrow tool does.
        if (g.box.w > 2 && g.box.h > 2) (g.frame ? onCreateFrame : onCreateRect)?.(g.box);
        else onSelect(g.hitId);
      } else if (g.kind === 'marquee') {
        if (drawRef.current) drawRef.current.style.display = 'none';
        // A real drag selects every top-level layer the box touches (Figma marquee);
        // a click with no size is just an empty-canvas click — selection was already
        // cleared on pointer-down, so there's nothing left to do.
        if (g.box.w > 2 || g.box.h > 2) {
          const content = contentRef.current;
          const hits: string[] = [];
          if (content) {
            for (const node of content.querySelectorAll<SVGGraphicsElement>('[data-layer-id]')) {
              // Only outermost layers — skip nodes nested inside another layer.
              let nested = false;
              for (let p = node.parentElement; p && content.contains(p); p = p.parentElement) {
                if (p.hasAttribute('data-layer-id')) { nested = true; break; }
              }
              if (nested) continue;
              const b = snapBoxOf(node, g.crLeft, g.crTop, g.scale);
              const bx = g.box.x, by = g.box.y, bx2 = g.box.x + g.box.w, by2 = g.box.y + g.box.h;
              if (b.right >= bx && b.left <= bx2 && b.bottom >= by && b.top <= by2) {
                const id = node.getAttribute('data-layer-id');
                if (id) hits.push(id);
              }
            }
          }
          if (onSelectMany) onSelectMany(hits, g.additive);
          else if (hits.length) onSelect(hits[0], false);
        }
      } else if (g.kind === 'transform') {
        if (vGuideRef.current) vGuideRef.current.style.display = 'none';
        if (hGuideRef.current) hGuideRef.current.style.display = 'none';
        const hi = selHiRef.current;
        if (hi) {
          hi.style.transform = '';
          hi.style.removeProperty('--gizmo-inv-x');
          hi.style.removeProperty('--gizmo-inv-y');
        }
        // Undo the dimension badge's counter-scale (see `flush`). This MUST be
        // imperative: React renders the badge with the constant style
        // `transform: translateX(-50%)`, so on the next render it diffs identical
        // strings, skips the DOM write, and the scale(...) we set during the drag
        // would stick — leaving the label permanently stretched.
        const lab = dimLabelRef.current;
        if (lab) {
          lab.style.transform = 'translateX(-50%)';
          lab.style.removeProperty('transform-origin');
        }
        // Restore each chrome to its pre-drag position. A committed resize then
        // re-renders it to the new box (React's style prop wins on the next paint);
        // a no-op drag just leaves it where it was. Restoring (vs clearing) matters
        // because left/top/width come from React's style prop — blanking them would
        // strip the base position until an unrelated re-render happened to restore it.
        if (g.chromes) {
          for (const c of g.chromes) {
            c.el.style.left = `${c.left}px`;
            c.el.style.width = `${c.width}px`;
            c.el.style.top = `${c.top - c.off}px`;
          }
        }
        if (g.sub === 'radius') {
          if (g.lastRadius != null && g.layerId) onSetRadius?.(g.layerId, Math.round(g.lastRadius));
        } else if (g.frameId && g.lastFrameBox) {
          onResizeFrame?.(g.frameId, g.lastFrameBox, g.lastRectRadius ?? undefined);
        } else if (g.rectResize && g.rectId && g.lastFrameBox) {
          onResizeRect?.(g.rectId, g.lastFrameBox, g.lastRectRadius ?? undefined);
        } else if (g.lastMatrix) {
          onTransformLayers?.(g.ids, g.lastMatrix);
        }
      } else {
        const hi = selHiRef.current;
        if (hi) hi.style.transform = '';
        // Clear the imperative chrome offset — the commit re-measures each frame's
        // box, so the label/icon get their new position from React state instead.
        const content = contentRef.current;
        if (content) {
          for (const id of g.ids) {
            const c = content.querySelector<HTMLElement>(`[data-frame-chrome-id="${id}"]`);
            if (c) c.style.transform = '';
          }
        }
        if (vGuideRef.current) vGuideRef.current.style.display = 'none';
        if (hGuideRef.current) hGuideRef.current.style.display = 'none';
        // Discard the throwaway drag clones — the commit re-renders the real
        // duplicates from React state. Removing them here (before the commit)
        // avoids a one-frame flash of clone + committed copy stacked together.
        if (g.clones) for (const c of g.clones) c.remove();
        if (Math.abs(g.dx) > 0.5 || Math.abs(g.dy) > 0.5) {
          // Alt-drag (Figma): drop commits a real copy of the selection at the
          // dragged offset, leaving the originals put. A plain drag just moves them.
          if (g.duplicate && onDuplicateLayers) onDuplicateLayers(g.ids, g.dx, g.dy);
          else onMoveLayers(g.ids, g.dx, g.dy);
        }
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [onMoveLayers, onDuplicateLayers, onCreateRect, onCreateFrame, onSelect, onSelectMany, onTransformLayers, onResizeFrame, onResizeRect, onSetRadius]);

  function onPointerDown(e: React.PointerEvent) {
    if (!view) return;
    // Any press on the stage tells the shell to show tools in the dock.
    if (e.button === 0 || e.button === 1) onCanvasActivate?.();

    // Drawing tools take over the left button: text places on click, shape
    // rubber-bands on drag. Other (not-yet-wired) tools fall through to select.
    if (e.button === 0 && (tool === 'shape' || tool === 'text' || tool === 'frame')) {
      const content = contentRef.current;
      if (content) {
        e.preventDefault();
        const cr = content.getBoundingClientRect();
        const ux = (e.clientX - cr.left) / view.scale;
        const uy = (e.clientY - cr.top) / view.scale;
        if (tool === 'text') {
          onCreateText?.({ x: ux, y: uy });
        } else {
          drag.current = { kind: 'draw', crLeft: cr.left, crTop: cr.top, scale: view.scale, sx: ux, sy: uy, box: { x: ux, y: uy, w: 0, h: 0 }, hitId: layerIdAt(e.target, wantsDeep(e), contentRef.current, e.clientX, e.clientY), frame: tool === 'frame' };
        }
        return;
      }
    }

    // Middle mouse button (wheel press): always pan. preventDefault kills the
    // browser's middle-click autoscroll, which otherwise fights the stage.
    if (e.button === 1) {
      e.preventDefault();
      onSelect(null);
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, scale: view.scale };
      return;
    }
    if (e.button !== 0) return;
    const deep = wantsDeep(e);
    // Alt held → this drag duplicates on drop (Figma Alt-drag). Alt also reads as
    // "deep" for hover, but while duplicating we want to grab the whole selection
    // rather than pierce to a child, so `dup` relaxes the grab check below.
    const dup = e.altKey;
    const additive = e.shiftKey;
    const content = contentRef.current;

    // Arm a move gesture over `ids`: snapshot each node's transform, the union
    // bounding box of the whole selection, and the neighbours to snap against —
    // all read once here, never per frame.
    const armMove = (ids: string[]) => {
      if (!content || !view) return;
      const cr = content.getBoundingClientRect();
      const nodes: { node: SVGGraphicsElement; base: string }[] = [];
      const selected = new Set(ids);
      let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
      const targets: SnapBox[] = [];
      for (const sid of ids) {
        const node = content.querySelector<SVGGraphicsElement>(`[data-layer-id="${sid}"]`);
        if (!node) continue;
        nodes.push({ node, base: node.getAttribute('transform') ?? '' });
        const b = snapBoxOf(node, cr.left, cr.top, view.scale);
        L = Math.min(L, b.left); T = Math.min(T, b.top);
        R = Math.max(R, b.right); B = Math.max(B, b.bottom);
        for (const sib of node.parentElement?.querySelectorAll(':scope > [data-layer-id]') ?? []) {
          if (!selected.has(sib.getAttribute('data-layer-id') ?? '')) {
            targets.push(snapBoxOf(sib, cr.left, cr.top, view.scale));
          }
        }
      }
      if (!nodes.length) return;
      const baseBox: SnapBox = { left: L, top: T, right: R, bottom: B, cx: (L + R) / 2, cy: (T + B) / 2 };
      // Alt-drag (Figma): create the copy up front and drag *that*, leaving the
      // originals untouched — so the source never appears to move and the new
      // node exists from the first pixel. We clone each node in place (stripping
      // layer ids so hover/queries still resolve to the originals) and steer the
      // clones; on drop we commit real duplicates and discard the throwaway clones.
      let dragNodes = nodes;
      let clones: Element[] | undefined;
      if (dup) {
        dragNodes = [];
        clones = [];
        for (const { node, base } of nodes) {
          const clone = node.cloneNode(true) as SVGGraphicsElement;
          clone.removeAttribute('data-layer-id');
          clone.querySelectorAll('[data-layer-id]').forEach((el) => el.removeAttribute('data-layer-id'));
          clone.setAttribute('data-drag-clone', '');
          clone.style.pointerEvents = 'none';
          node.parentElement?.appendChild(clone);
          dragNodes.push({ node: clone, base });
          clones.push(clone);
        }
      }
      drag.current = {
        kind: 'move', ids, nodes: dragNodes, startX: e.clientX, startY: e.clientY,
        scale: view.scale, dx: 0, dy: 0, baseBox, targets, duplicate: dup, clones,
      };
    };

    // Resolve the layer under the cursor. A plain press inside any already-
    // selected layer grabs the whole selection (Figma: drag within selection
    // moves it) — even if the hit resolves to a child or a different group.
    // Pressing a frame's name chrome grabs that frame — Figma moves a frame by its
    // label, and Alt-dragging it duplicates. The chrome is HTML living outside the
    // SVG, so it carries no data-layer-id; resolve the frame from the chrome
    // wrapper instead. (The role-icon button stops pointerdown itself, so it never
    // reaches here and still just cycles the role.)
    const chromeEl = e.target instanceof Element ? e.target.closest('[data-frame-chrome-id]') : null;
    let id = chromeEl ? chromeEl.getAttribute('data-frame-chrome-id') : layerIdAt(e.target, deep, contentRef.current, e.clientX, e.clientY);
    if (!chromeEl && !additive && (!deep || dup) && selectedIds.length) {
      const hitEl = e.target instanceof Element ? e.target : null;
      for (const sid of selectedIds) {
        const selNode = content?.querySelector<Element>(`[data-layer-id="${sid}"]`);
        if (selNode && hitEl && selNode.contains(hitEl)) { id = sid; break; }
      }
    }

    if (!id) {
      // Empty grid. Space (temporary hand) pans; otherwise a left-drag rubber-
      // bands a marquee selection, Figma-style — panning lives on middle-mouse,
      // Space, and the wheel. Shift keeps the current selection as the marquee base.
      if (spaceHeld.current) {
        if (!additive) onSelect(null);
        drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, scale: view.scale };
        return;
      }
      if (content) {
        const cr = content.getBoundingClientRect();
        const ux = (e.clientX - cr.left) / view.scale;
        const uy = (e.clientY - cr.top) / view.scale;
        drag.current = {
          kind: 'marquee', crLeft: cr.left, crTop: cr.top, scale: view.scale,
          sx: ux, sy: uy, box: { x: ux, y: uy, w: 0, h: 0 },
          additive, base: additive ? selectedIds : [],
        };
        if (!additive) onSelect(null);
      }
      return;
    }

    if (additive) {
      const wasSelected = selectedIds.includes(id);
      onSelect(id, true); // toggle membership
      // Removing a layer just updates the selection — no drag. Adding one arms a
      // move over the whole (now larger) selection, so a Shift-drag moves all.
      if (!wasSelected) armMove([...selectedIds, id]);
      return;
    }

    if (selectedIds.includes(id)) {
      armMove(selectedIds); // press within the current selection: move all of it
    } else {
      onSelect(id, false);  // fresh single selection
      armMove([id]);
    }
  }

  // Begin a resize / rotate / radius gesture from a handle. Snapshots each
  // selected node's transform and the union box once, then the window listeners
  // drive it frame-by-frame (see `flush`). `handle` is a compass code for resize
  // ('nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'), a corner for rotate, or '' for radius.
  function startTransform(e: React.PointerEvent, sub: 'resize' | 'rotate' | 'radius', handle: string) {
    if (!view || !unionBox) return;
    e.stopPropagation();
    e.preventDefault();
    const content = contentRef.current;
    if (!content) return;
    const cr = content.getBoundingClientRect();
    const ids = selectedIds;
    const nodes: { node: SVGGraphicsElement; base: string }[] = [];
    for (const id of ids) {
      const node = content.querySelector<SVGGraphicsElement>(`[data-layer-id="${id}"]`);
      if (node) nodes.push({ node, base: node.getAttribute('transform') ?? '' });
    }
    if (!nodes.length) return;
    const box = unionBox;
    const right = box.left + box.width;
    const bottom = box.top + box.height;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const movesE = handle.includes('e');
    const movesW = handle.includes('w');
    const movesN = handle.includes('n');
    const movesS = handle.includes('s');
    const px = (e.clientX - cr.left) / view.scale;
    const py = (e.clientY - cr.top) / view.scale;
    onCanvasActivate?.();

    // Frame-border resize: a lone top-level frame (bg and/or clip rect, no own
    // transform) moves its edges rather than scaling its children. Grabbing the
    // rects up front lets the drag resize them live. Plain groups → null → the
    // usual matrix scale runs instead.
    let frameRects: { el: Element; x0: number; y0: number; w0: number; h0: number }[] | null = null;
    let frameId: string | null = null;
    let frameR0 = 0;
    if (sub === 'resize' && ids.length === 1) {
      const node = nodes[0].node;
      // Any frame carrying its own bounds — a bg rect (drawn frame) and/or a clip
      // rect (clip-content on). Nesting and a translate/scale transform on the g
      // are fine: sx/sy are ratios, and the anchor comes from the rect's own local
      // edges. (Rotation would misplace the anchor, but that's a rare edge.)
      const rects = [
        node.querySelector(':scope > rect[data-frame-bg]'),
        clipRectOf(node),
      ].filter(Boolean) as Element[];
      if (rects.length) {
        frameRects = rects.map((el) => ({
          el,
          x0: +(el.getAttribute('x') ?? 0),
          y0: +(el.getAttribute('y') ?? 0),
          w0: +(el.getAttribute('width') ?? 0),
          h0: +(el.getAttribute('height') ?? 0),
        }));
        frameId = ids[0];
        // A frame's corner radius lives on its bg/clip rects and needs the same
        // circular re-clamp as a plain rect (see rectR0 below) — without it the
        // independent rx/ry clamp turns a small frame into an ellipse.
        frameR0 = Math.max(
          +(rects[0].getAttribute('rx') ?? 0) || 0,
          +(rects[0].getAttribute('ry') ?? 0) || 0,
        );
      }
    }

    // Plain-rect resize (V / move only): the sole selected node is a <rect> whose
    // transform carries NO rotation or skew (translate and/or scale are fine).
    // Resize it via its x/y/width/height so the corner radius stays ABSOLUTE
    // instead of being stretched by a matrix scale. With b==c==0 the local→content
    // map is `content = a·x+e` per axis, so the sx/sy ratios and the local anchor
    // math (x0+w0-nw etc.) still hold — the constant scale factors a/d ride along.
    // A baked rotate/skew breaks that, so those fall through to the matrix path.
    //
    // K (scaleMode) deliberately skips this: there the radius must scale WITH the
    // shape (proportional), which is exactly what the uniform matrix scale gives.
    let rectResize = false;
    let rectId: string | null = null;
    let rectR0 = 0;
    if (!frameRects && !scaleMode && sub === 'resize' && ids.length === 1) {
      const node = nodes[0].node;
      const m = node.transform?.baseVal?.consolidate()?.matrix;
      const noRotate = !m || (Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6);
      if (node.tagName.toLowerCase() === 'rect' && noRotate) {
        frameRects = [{
          el: node,
          x0: +(node.getAttribute('x') ?? 0),
          y0: +(node.getAttribute('y') ?? 0),
          w0: +(node.getAttribute('width') ?? 0),
          h0: +(node.getAttribute('height') ?? 0),
        }];
        rectResize = true;
        rectId = ids[0];
        // The radius to hold constant. SVG clamps rx to w/2 and ry to h/2
        // INDEPENDENTLY, which turns a small non-square rect into an ellipse — the
        // "broken" corners. We re-clamp both to the same min(w,h)/2 each frame, so
        // corners stay circular: a rounded rect degrades to a stadium, then a
        // circle, never an ellipse.
        rectR0 = Math.max(
          +(node.getAttribute('rx') ?? 0) || 0,
          +(node.getAttribute('ry') ?? 0) || 0,
        );
      }
    }

    // Frame-chrome strips (name + role icon) of the selected frames, so a resize
    // can ride them along live from the same matrix instead of leaving the icon at
    // the old edge until commit. `off` = the fixed gap the label sits above the top.
    const chromes: { el: HTMLElement; left: number; top: number; width: number; off: number }[] = [];
    if (sub === 'resize') {
      for (const id of ids) {
        const el = content.querySelector<HTMLElement>(`[data-frame-chrome-id="${id}"]`);
        const fb = frameBoxes.find((f) => f.id === id);
        if (el && fb) {
          chromes.push({
            el,
            left: fb.box.left,
            top: fb.box.top,
            width: fb.box.width,
            off: fb.box.top - (parseFloat(el.style.top) || 0),
          });
        }
      }
    }

    // Edges the moving border magnetises to: the resized node's own children
    // (so the frame border can hug its content), plus its unselected siblings.
    const targets: SnapBox[] = [];
    if (sub === 'resize') {
      const selected = new Set(ids);
      for (const { node } of nodes) {
        for (const ch of node.querySelectorAll(':scope > [data-layer-id]')) {
          targets.push(snapBoxOf(ch, cr.left, cr.top, view.scale));
        }
        for (const sib of node.parentElement?.querySelectorAll(':scope > [data-layer-id]') ?? []) {
          if (!selected.has(sib.getAttribute('data-layer-id') ?? '')) {
            targets.push(snapBoxOf(sib, cr.left, cr.top, view.scale));
          }
        }
      }
    }

    drag.current = {
      kind: 'transform', sub, ids, nodes, scale: view.scale, crLeft: cr.left, crTop: cr.top, box,
      frameRects, frameId, rectResize, rectId, rectR0: rectR0 || frameR0, lastFrameBox: null, lastRectRadius: null, chromes, targets,
      movesE, movesW, movesN, movesS,
      anchorX: movesE ? box.left : movesW ? right : cx,
      anchorY: movesS ? box.top : movesN ? bottom : cy,
      cx, cy, startAngle: Math.atan2(py - cy, px - cx),
      // Radius: `handle` is the grabbed corner ('nw'|'ne'|'se'|'sw'). Anchor at that
      // corner; the inward sign per axis (+1 from a left/top edge, -1 from right/
      // bottom) lets the drag maths run the same from any corner. Defaults to nw.
      cornerX: handle.includes('e') ? right : box.left,
      cornerY: handle.includes('s') ? bottom : box.top,
      radiusSx: handle.includes('e') ? -1 : 1,
      radiusSy: handle.includes('s') ? -1 : 1,
      maxRadius: Math.min(box.width, box.height) / 2,
      layerId: radiusLayerId,
      lockAspect: scaleMode,
      lastMatrix: null, lastRadius: null,
    };
  }

  function onPointerMoveHover(e: React.PointerEvent) {
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (drag.current) return;
    onHover(layerIdAt(e.target, wantsDeep(e), contentRef.current, e.clientX, e.clientY));
  }

  // Pressing (or releasing) the deep modifier re-resolves the hover target at the
  // current cursor position — so just holding Alt dives to the leaf under the
  // cursor without needing to nudge the mouse first.
  useEffect(() => {
    const isModifier = (k: string) => k === 'Alt' || k === 'Meta' || k === 'Control';
    const rehover = (deep: boolean) => {
      if (drag.current) return;
      const p = lastPointer.current;
      if (!p) return;
      const el = document.elementFromPoint(p.x, p.y);
      if (!el || !hostRef.current?.contains(el)) return;
      onHover(layerIdAt(el, deep));
    };
    // Mirror the Alt state onto <html> so panels outside the canvas (the layer
    // tree, the frame-name chrome) can flip to the copy cursor via CSS — Figma
    // shows the duplicate affordance anywhere you can Alt-drag, not just on shapes.
    const setAlt = (on: boolean) => {
      setAltHeld(on);
      document.documentElement.classList.toggle('alt-copy', on);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt') setAlt(true); if (isModifier(e.key)) rehover(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Alt') setAlt(false); if (isModifier(e.key)) rehover(wantsDeep(e)); };
    // A window blur (Alt-Tab, focus lost) never fires keyup, so clear the flag.
    const onBlur = () => setAlt(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.documentElement.classList.remove('alt-copy');
    };
  }, [onHover]);

  return (
    <div
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveHover}
      onContextMenu={(e) => {
        // Layer under the cursor → layer menu; empty grid → canvas menu.
        onContextMenu(e, layerIdAt(e.target, wantsDeep(e), contentRef.current, e.clientX, e.clientY));
      }}
      onPointerLeave={() => onHover(null)}
      className="canvas-grid relative h-full w-full touch-none select-none overflow-hidden bg-canvas"
      style={{
        // Override the themed canvas colour when a page background is set; the
        // dotted grid (a background-image) rides on top either way.
        ...(background ? { backgroundColor: background } : null),
        cursor:
          drag.current?.kind === 'pan'
            ? 'grabbing'
            // Duplicate drag in progress, or Alt held over any object (selected or
            // not): show the copy cursor (arrow + «＋») so it reads as Figma's
            // Alt-drag-to-duplicate before and during the drag.
            : (drag.current?.kind === 'move' && drag.current.duplicate) ||
                (altHeld && (hovBox || hoveredId))
              ? 'copy'
              : tool === 'text'
              ? 'text'
              : tool === 'shape' || tool === 'frame'
                ? 'crosshair'
                : 'default',
      }}
    >
      {view && (
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <div
            ref={svgHostRef}
            className="editor-svg-host relative [&_text]:[pointer-events:bounding-box] [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
            style={{ width, height }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {zoneBoxes.map((b, i) => (
            <Highlight key={`z-${i}`} box={b} kind="zone" scale={view.scale} />
          ))}
          {frameBoxes.map((f) => (
            <FrameChromeLabel
              key={f.id}
              frame={f}
              scale={view.scale}
              selected={selectedIds.includes(f.id)}
              onSelect={(additive) => onSelect(f.id, additive)}
              onCycleRole={onCycleFrameRole ? () => onCycleFrameRole(f.id) : undefined}
              onRename={onRename ? (name) => onRename(f.id, name) : undefined}
            />
          ))}
          {hovBox && <Highlight box={hovBox} kind="hover" scale={view.scale} />}
          {selBoxes.length > 0 && (
            <div ref={selHiRef} className="pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform" style={{ width, height }}>
              {selBoxes.length > 1 &&
                selBoxes.map((b, i) => <Highlight key={`s-${i}`} box={b} kind="select" scale={view.scale} color={selAccent} />)}
              {tool === 'move' && unionBox && (
                <TransformHandles
                  box={unionBox}
                  scale={view.scale}
                  scaleMode={scaleMode}
                  showRadius={radiusLayerId != null}
                  radius={radius}
                  radiusHandleRefs={radiusHandleRefs}
                  dimLabelRef={dimLabelRef}
                  accent={selAccent}
                  onStart={startTransform}
                />
              )}
            </div>
          )}
          {/* Alignment guides for Shift-drag — full-span lines, positioned imperatively. */}
          <div
            ref={vGuideRef}
            className="pointer-events-none absolute top-0 hidden bg-[#f24822]"
            style={{ height, width: `${1 / view.scale}px` }}
          />
          <div
            ref={hGuideRef}
            className="pointer-events-none absolute left-0 hidden bg-[#f24822]"
            style={{ width, height: `${1 / view.scale}px` }}
          />
          {/* Live rubber-band while drawing a shape. */}
          <div
            ref={drawRef}
            className="pointer-events-none absolute left-0 top-0 hidden bg-[rgba(var(--brand-rgb),0.12)]"
            style={{ outline: `${1.5 / view.scale}px solid var(--brand)` }}
          />
        </div>
      )}

      {view && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5">
          <span className="rounded-md bg-elevated/80 px-2 py-1 text-caption tabular-nums text-tertiary backdrop-blur">
            {Math.round(view.scale * 100)}%
          </span>
          {scaleMode && (
            <span className="rounded-md bg-brand px-2 py-1 text-caption font-medium text-white backdrop-blur">
              Scale (K)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** The Figma-style transform gizmo: a union frame, eight resize handles, four
 *  corner rotation hotspots, an optional corner-radius handle, and the size/angle
 *  badge — all drawn in content space (sizes divided by `scale` so they stay a
 *  constant screen size) and riding the selection group's transform. */
function TransformHandles({
  box,
  scale,
  scaleMode,
  showRadius,
  radius,
  radiusHandleRefs,
  dimLabelRef,
  accent = 'var(--brand)',
  onStart,
}: {
  box: { left: number; top: number; width: number; height: number };
  scale: number;
  scaleMode: boolean;
  showRadius: boolean;
  radius: number;
  radiusHandleRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  dimLabelRef: React.Ref<HTMLDivElement>;
  /** Gizmo stroke/handle colour — role-tinted (red flawed / green reference). */
  accent?: string;
  onStart: (e: React.PointerEvent, sub: 'resize' | 'rotate' | 'radius', handle: string) => void;
}) {
  const { t } = useT();
  const s = 9 / scale;
  const rz = 22 / scale;
  const border = 1.5 / scale;
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const midX = box.left + box.width / 2;
  const corners = [
    { k: 'nw', x: box.left, y: box.top, cur: 'nwse-resize' },
    { k: 'ne', x: right, y: box.top, cur: 'nesw-resize' },
    { k: 'se', x: right, y: bottom, cur: 'nwse-resize' },
    { k: 'sw', x: box.left, y: bottom, cur: 'nesw-resize' },
  ];
  // Invisible hit-strips along each side of the frame: grabbing anywhere on the
  // blue line resizes from that edge, even though no square dot is drawn there.
  // `hit` is the grab thickness in content px (constant screen size). Strips are
  // inset by the corner size so they don't steal the corner squares' clicks.
  const hit = 8 / scale;
  const edges = [
    { k: 'n', left: box.left + s, top: box.top - hit / 2, width: Math.max(box.width - 2 * s, 0), height: hit, cur: 'ns-resize' },
    { k: 's', left: box.left + s, top: bottom - hit / 2, width: Math.max(box.width - 2 * s, 0), height: hit, cur: 'ns-resize' },
    { k: 'w', left: box.left - hit / 2, top: box.top + s, width: hit, height: Math.max(box.height - 2 * s, 0), cur: 'ew-resize' },
    { k: 'e', left: right - hit / 2, top: box.top + s, width: hit, height: Math.max(box.height - 2 * s, 0), cur: 'ew-resize' },
  ];
  const handleStyle = (x: number, y: number, cur: string): React.CSSProperties => ({
    left: x - s / 2, top: y - s / 2, width: s, height: s,
    border: `${border}px solid ${accent}`, background: '#fff', cursor: cur,
    // During a resize the parent (selHiRef) is scaled by matrix(sx,sy) to preview
    // the new box — which would stretch these fixed-size squares. Counter-scale by
    // the inverse (fed as CSS vars on the parent, default 1) about each handle's
    // centre so it keeps its true square size while riding to the new edge.
    transform: 'scale(var(--gizmo-inv-x, 1), var(--gizmo-inv-y, 1))',
  });
  // The 14px floor keeps the handle grabbable on an unrounded corner, but it must
  // never push past the box centre — on a short box that flings the handles out
  // past the opposite edge.
  const rHalf = Math.min(box.width, box.height) / 2;
  const rInset = Math.min(Math.max(Math.min(radius, rHalf), 14 / scale), rHalf);
  return (
    <>
      <div
        className="pointer-events-none absolute"
        // Border (not outline) so each side can be compensated independently: a
        // resize scales the parent by matrix(sx,sy), which would fatten the stroke
        // unevenly. Per-axis widths × the inverse-scale vars (default 1) keep the
        // rendered line a constant thickness on both axes. border-box + the box
        // grown/offset by the same per-side width puts the stroke OUTSIDE the frame
        // edges (the old `outline` look) while the content edge stays exactly on the
        // box, so the frame dimensions read true.
        style={{
          left: `calc(${box.left}px - ${border}px * var(--gizmo-inv-x, 1))`,
          top: `calc(${box.top}px - ${border}px * var(--gizmo-inv-y, 1))`,
          width: `calc(${box.width}px + 2 * ${border}px * var(--gizmo-inv-x, 1))`,
          height: `calc(${box.height}px + 2 * ${border}px * var(--gizmo-inv-y, 1))`,
          boxSizing: 'border-box',
          borderStyle: 'solid', borderColor: accent,
          borderLeftWidth: `calc(${border}px * var(--gizmo-inv-x, 1))`,
          borderRightWidth: `calc(${border}px * var(--gizmo-inv-x, 1))`,
          borderTopWidth: `calc(${border}px * var(--gizmo-inv-y, 1))`,
          borderBottomWidth: `calc(${border}px * var(--gizmo-inv-y, 1))`,
        }}
      />
      {corners.map((c) => (
        <div
          key={`rot-${c.k}`}
          onPointerDown={(e) => onStart(e, 'rotate', c.k)}
          className="pointer-events-auto absolute"
          style={{ left: c.x - rz / 2, top: c.y - rz / 2, width: rz, height: rz, cursor: 'grab' }}
        />
      ))}
      {edges.map((h) => (
        <div
          key={h.k}
          onPointerDown={(e) => onStart(e, 'resize', h.k)}
          className="pointer-events-auto absolute"
          style={{
            left: h.left, top: h.top, width: h.width, height: h.height, cursor: h.cur,
            transform: 'scale(var(--gizmo-inv-x, 1), var(--gizmo-inv-y, 1))',
          }}
        />
      ))}
      {corners.map((h) => (
        <div key={h.k} onPointerDown={(e) => onStart(e, 'resize', h.k)} className="pointer-events-auto absolute rounded-[1px]" style={handleStyle(h.x, h.y, h.cur)} />
      ))}
      {showRadius && !scaleMode && corners.map((c, i) => {
        const sx = c.k.includes('e') ? -1 : 1;
        const sy = c.k.includes('s') ? -1 : 1;
        return (
          <div
            key={`rad-${c.k}`}
            ref={(el) => { radiusHandleRefs.current[i] = el; }}
            onPointerDown={(e) => onStart(e, 'radius', c.k)}
            className="pointer-events-auto absolute rounded-full"
            title={t('editor.canvas.radiusTitle')}
            // The inset rides the parent's resize matrix, so a stretched axis would
            // drag the handle further from its corner than the other one. Scale the
            // inset by the same inverse vars that keep the dot itself square, so all
            // four stay the true radius distance from their corners mid-drag.
            style={{
              left: `calc(${c.x - s / 2}px + ${sx * rInset}px * var(--gizmo-inv-x, 1))`,
              top: `calc(${c.y - s / 2}px + ${sy * rInset}px * var(--gizmo-inv-y, 1))`,
              width: s, height: s, border: `${border}px solid ${accent}`, background: '#fff', cursor: c.cur, transform: 'scale(var(--gizmo-inv-x, 1), var(--gizmo-inv-y, 1))' }}
          />
        );
      })}
      <div
        ref={dimLabelRef}
        className="pointer-events-none absolute whitespace-nowrap"
        style={{ left: midX, top: bottom + 7 / scale, transform: 'translateX(-50%)', background: accent, color: '#fff', fontSize: 11 / scale, lineHeight: 1.35, padding: `${1.5 / scale}px ${6 / scale}px`, borderRadius: `${5 / scale}px` }}
      >
        {Math.round(box.width)} × {Math.round(box.height)}
      </div>
    </>
  );
}

const Highlight = forwardRef<HTMLDivElement, { box: Box; kind: 'select' | 'hover' | 'zone'; scale: number; color?: string }>(
  function Highlight({ box, kind, scale, color: colorOverride }, ref) {
  const color =
    kind === 'select' ? (colorOverride ?? 'var(--brand)') : kind === 'zone' ? '#3FB950' : 'rgba(var(--brand-rgb),0.5)';
  const weight = kind === 'select' ? 2 : kind === 'zone' ? 1.75 : 1.5;
  // Tinted select fill matches the role accent; brand keeps its original wash.
  const fill =
    kind === 'select'
      ? colorOverride && colorOverride !== 'var(--brand)'
        ? `color-mix(in srgb, ${colorOverride} 8%, transparent)`
        : 'rgba(var(--brand-rgb),0.08)'
      : kind === 'zone'
        ? 'rgba(63,185,80,0.08)'
        : 'transparent';
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute rounded-[1px] will-change-transform"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        outline: `${weight / scale}px solid ${color}`,
        outlineOffset: 1 / scale,
        background: fill,
      }}
    />
  );
});

/** Visual spec for each frame role — the icon glyph, colour and tooltip shown
 *  in the frame chrome. `undefined` role falls back to the plain-frame entry. */
const ROLE_META = {
  frame: { Icon: FrameIcon, color: 'var(--text-tertiary)', titleKey: 'editor.canvas.roleFrame' },
  reference: { Icon: BadgeCheck, color: 'var(--ref-green)', titleKey: 'editor.canvas.roleReference' },
  flawed: { Icon: Bug, color: 'var(--flaw-red)', titleKey: 'editor.canvas.roleFlawed' },
} as const;

/**
 * Figma-style chrome above a top-level frame: the frame's name on the left
 * (click to select the frame) and a role icon on the right (click to cycle
 * обычный → эталон → косячный). Rendered in content space with every size
 * divided by `scale`, so it stays a constant screen size as the stage zooms —
 * exactly like the selection's dimension badge.
 */
function FrameChromeLabel({
  frame,
  scale,
  selected,
  onSelect,
  onCycleRole,
  onRename,
}: {
  frame: FrameChrome & { box: Box };
  scale: number;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onCycleRole?: () => void;
  /** Commit a rename typed into the label after a double-click. */
  onRename?: (name: string) => void;
}) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const { box } = frame;
  const meta = ROLE_META[frame.role ?? 'frame'];
  const { Icon } = meta;
  const gap = 6 / scale;
  const font = 11 / scale;
  const icon = 13 / scale;
  return (
    <div
      data-frame-chrome-id={frame.id}
      className="absolute flex items-center justify-between will-change-transform"
      style={{ left: box.left, top: box.top - font * 1.35 - gap, width: box.width, height: font * 1.35 }}
    >
      {editing && onRename ? (
        // Rename in place — the same gesture and commit as double-clicking a row
        // in the layers panel. Pointer events stop here so typing/caret-dragging
        // inside the field can't reach the stage and start a canvas gesture.
        <input
          autoFocus
          defaultValue={frame.name}
          onFocus={(e) => e.currentTarget.select()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            // The stage's shortcuts listen on window, so every key typed here
            // (V, F, Delete…) would otherwise also fire a tool switch.
            e.stopPropagation();
            if (e.key === 'Enter') {
              onRename(e.currentTarget.value);
              setEditing(false);
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
          onBlur={(e) => {
            onRename(e.currentTarget.value);
            setEditing(false);
          }}
          className="pointer-events-auto min-w-0 flex-1 bg-elevated leading-none text-primary"
          // Everything here is divided by `scale` because the chrome lives inside
          // the zoomed content layer — a CSS radius/outline would grow with the
          // matrix. Dividing keeps the field the same on screen at any zoom, and
          // matching the panels' rounded-sm (6px) is why the radius is a constant.
          style={{
            fontSize: font,
            fontWeight: selected ? 600 : 500,
            borderRadius: `${RENAME_RADIUS_PX / scale}px`,
            outline: `${1.5 / scale}px solid var(--brand)`,
            outlineOffset: `${-1 / scale}px`,
            padding: `${1 / scale}px ${2 / scale}px`,
          }}
        />
      ) : (
        <button
          type="button"
          // Pointerdown deliberately bubbles to the stage: it selects the frame and
          // arms the move/Alt-duplicate drag (the stage resolves the frame from this
          // chrome's data-frame-chrome-id). onClick then only has to cover the
          // keyboard/no-drag case, so it must not re-select on a plain mouse click.
          onClick={(e) => {
            e.stopPropagation();
            if (e.detail === 0) onSelect(e.shiftKey || e.metaKey);
          }}
          // Double-click opens the rename field. The press that precedes it still
          // selects + arms a move on the stage, but a double-click never travels
          // far enough to commit one, so the two gestures don't collide.
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (onRename) setEditing(true);
          }}
          // `frame-name-label` drives the cursor via CSS: default arrow normally
          // (the <button>'s pointer/hand reads as a link, but selecting a frame is a
          // canvas gesture), flipping to `copy` while Alt is held — Alt-drag
          // duplicates the frame, same as the shapes on the canvas.
          className="frame-name-label pointer-events-auto min-w-0 truncate text-left leading-none"
          style={{
            fontSize: font,
            // A role-tagged frame keeps its role colour (red flawed / green
            // reference) even while selected; plain frames go brand-blue on select.
            color: frame.role ? meta.color : selected ? 'var(--brand)' : 'var(--text-secondary)',
            fontWeight: selected ? 600 : 500,
            paddingRight: gap,
          }}
        >
          {frame.name}
        </button>
      )}
      {onCycleRole && (
        <button
          type="button"
          title={t(meta.titleKey)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCycleRole();
          }}
          className="pointer-events-auto flex shrink-0 items-center justify-center rounded transition-fast hover:bg-[rgba(var(--brand-rgb),0.12)]"
          style={{ color: meta.color, padding: 2 / scale }}
        >
          <Icon size={icon} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
