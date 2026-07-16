'use client';

import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Frame as FrameIcon, BadgeCheck, Bug } from 'lucide-react';
import type { EditorTool } from '@/lib/editor/types';

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
/** Snap distance for Shift-drag alignment, in screen px. */
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

/** The layer id under a hit target — deepest leaf, or the outermost group. */
function layerIdAt(target: EventTarget | null, deep: boolean): string | null {
  const el = target instanceof Element ? target.closest('[data-layer-id]') : null;
  if (!el) return null;
  if (deep) return el.getAttribute('data-layer-id');
  let top = el;
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.hasAttribute('data-layer-id')) top = p;
    else break;
  }
  return top.getAttribute('data-layer-id');
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
  selectedIds,
  hoveredId,
  onSelect,
  onSelectMany,
  onHover,
  onMoveLayers,
  onTransformLayers,
  onResizeFrame,
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
}: {
  svg: string;
  /** viewBox size in user units — one unit renders as one content-space px. */
  width: number;
  height: number;
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
  /** Commit a finished resize/rotate: prepend `matrix(...)` (content/root space)
   *  to every given layer's transform. */
  onTransformLayers?: (ids: string[], matrix: string) => void;
  /** Commit a frame-border resize: set the frame's bg/clip rect to the new local
   *  box, leaving its children untouched (Figma frame semantics). */
  onResizeFrame?: (id: string, box: { x: number; y: number; w: number; h: number }) => void;
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
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selHiRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
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
    | { kind: 'move'; ids: string[]; nodes: { node: SVGGraphicsElement; base: string }[]; startX: number; startY: number; scale: number; dx: number; dy: number; baseBox: SnapBox; targets: SnapBox[] }
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
        lockAspect: boolean;
        lastMatrix: string | null;
        lastRadius: number | null;
        // Frame-border resize: when the sole selected node is a top-level frame
        // with an explicit bg/clip rect, we move its edges instead of scaling its
        // children (Figma's frame vs group distinction). Null for plain groups.
        frameRects?: { el: Element; x0: number; y0: number; w0: number; h0: number }[] | null;
        frameId?: string | null;
        lastFrameBox?: { x: number; y: number; w: number; h: number } | null;
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
  const radiusHandleRef = useRef<HTMLDivElement>(null);

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

  const measure = useCallback(
    (id: string | null): Box | null => {
      const content = contentRef.current;
      const v = view;
      if (!content || !id || !v) return null;
      const node = content.querySelector<SVGGraphicsElement>(`[data-layer-id="${id}"]`);
      if (!node) return null;
      const cr = content.getBoundingClientRect();
      const r = node.getBoundingClientRect();
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
        const px = (p.x - g.crLeft) / g.scale;
        const py = (p.y - g.crTop) / g.scale;
        if (g.sub === 'resize') {
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
          // radius: drag the handle toward the centre to round the corner more.
          let d = Math.min(px - g.cornerX, py - g.cornerY);
          d = Math.max(0, Math.min(d, g.maxRadius));
          g.lastRadius = d;
          for (const { node } of g.nodes) { node.setAttribute('rx', String(d)); node.setAttribute('ry', String(d)); }
          const rh = radiusHandleRef.current;
          if (rh) { const hs = 9 / g.scale / 2; rh.style.left = `${g.cornerX + d - hs}px`; rh.style.top = `${g.cornerY + d - hs}px`; }
        }
      } else {
        let dx = (p.x - g.startX) / g.scale;
        let dy = (p.y - g.startY) / g.scale;
        let guideX: number | null = null;
        let guideY: number | null = null;
        // Shift-drag: snap the dragged box's edges/centre to any neighbour's
        // edges/centre within a small threshold, and remember the matched line.
        if (p.shift && g.targets.length) {
          const T = SNAP_PX / g.scale;
          const b = g.baseBox;
          let bestX = T;
          let bestY = T;
          for (const t of g.targets) {
            const tXs = [t.left, t.cx, t.right];
            const tYs = [t.top, t.cy, t.bottom];
            for (const dv of [b.left + dx, b.cx + dx, b.right + dx]) {
              for (const tv of tXs) {
                const d = tv - dv;
                if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx += d; guideX = tv; }
              }
            }
            for (const dv of [b.top + dy, b.cy + dy, b.bottom + dy]) {
              for (const tv of tYs) {
                const d = tv - dv;
                if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy += d; guideY = tv; }
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
        if (content) {
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
        const hi = selHiRef.current;
        if (hi) {
          hi.style.transform = '';
          hi.style.removeProperty('--gizmo-inv-x');
          hi.style.removeProperty('--gizmo-inv-y');
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
          onResizeFrame?.(g.frameId, g.lastFrameBox);
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
        if (Math.abs(g.dx) > 0.5 || Math.abs(g.dy) > 0.5) onMoveLayers(g.ids, g.dx, g.dy);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [onMoveLayers, onCreateRect, onCreateFrame, onSelect, onSelectMany, onTransformLayers, onResizeFrame, onSetRadius]);

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
          drag.current = { kind: 'draw', crLeft: cr.left, crTop: cr.top, scale: view.scale, sx: ux, sy: uy, box: { x: ux, y: uy, w: 0, h: 0 }, hitId: layerIdAt(e.target, wantsDeep(e)), frame: tool === 'frame' };
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
      drag.current = {
        kind: 'move', ids, nodes, startX: e.clientX, startY: e.clientY,
        scale: view.scale, dx: 0, dy: 0, baseBox, targets,
      };
    };

    // Resolve the layer under the cursor. A plain press inside any already-
    // selected layer grabs the whole selection (Figma: drag within selection
    // moves it) — even if the hit resolves to a child or a different group.
    let id = layerIdAt(e.target, deep);
    if (!additive && !deep && selectedIds.length) {
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
    if (sub === 'resize' && ids.length === 1) {
      const node = nodes[0].node;
      // Any frame carrying its own bounds — a bg rect (drawn frame) and/or a clip
      // rect (clip-content on). Nesting and a translate/scale transform on the g
      // are fine: sx/sy are ratios, and the anchor comes from the rect's own local
      // edges. (Rotation would misplace the anchor, but that's a rare edge.)
      const rects = [
        node.querySelector(':scope > rect[data-frame-bg]'),
        node.querySelector(':scope > clipPath > rect'),
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

    drag.current = {
      kind: 'transform', sub, ids, nodes, scale: view.scale, crLeft: cr.left, crTop: cr.top, box,
      frameRects, frameId, lastFrameBox: null, chromes,
      movesE, movesW, movesN, movesS,
      anchorX: movesE ? box.left : movesW ? right : cx,
      anchorY: movesS ? box.top : movesN ? bottom : cy,
      cx, cy, startAngle: Math.atan2(py - cy, px - cx),
      cornerX: box.left, cornerY: box.top, maxRadius: Math.min(box.width, box.height) / 2,
      layerId: radiusLayerId,
      lockAspect: scaleMode,
      lastMatrix: null, lastRadius: null,
    };
  }

  function onPointerMoveHover(e: React.PointerEvent) {
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (drag.current) return;
    onHover(layerIdAt(e.target, wantsDeep(e)));
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
    const onKeyDown = (e: KeyboardEvent) => { if (isModifier(e.key)) rehover(true); };
    const onKeyUp = (e: KeyboardEvent) => { if (isModifier(e.key)) rehover(wantsDeep(e)); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onHover]);

  return (
    <div
      ref={hostRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveHover}
      onContextMenu={(e) => {
        // Layer under the cursor → layer menu; empty grid → canvas menu.
        onContextMenu(e, layerIdAt(e.target, wantsDeep(e)));
      }}
      onPointerLeave={() => onHover(null)}
      className="canvas-grid relative h-full w-full touch-none select-none overflow-hidden bg-canvas"
      style={{
        cursor:
          drag.current?.kind === 'pan'
            ? 'grabbing'
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
            className="relative [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
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
            />
          ))}
          {hovBox && <Highlight box={hovBox} kind="hover" scale={view.scale} />}
          {selBoxes.length > 0 && (
            <div ref={selHiRef} className="pointer-events-none absolute left-0 top-0 origin-top-left will-change-transform" style={{ width, height }}>
              {selBoxes.length > 1 &&
                selBoxes.map((b, i) => <Highlight key={`s-${i}`} box={b} kind="select" scale={view.scale} />)}
              {tool === 'move' && unionBox && (
                <TransformHandles
                  box={unionBox}
                  scale={view.scale}
                  scaleMode={scaleMode}
                  showRadius={radiusLayerId != null}
                  radius={radius}
                  radiusHandleRef={radiusHandleRef}
                  dimLabelRef={dimLabelRef}
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
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-elevated/80 px-2 py-1 text-caption text-tertiary backdrop-blur">
        ⌘/Ctrl+колесо — зум · перетаскивание — выделение рамкой · пробел/СКМ — рука · K — scale
      </div>
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
  radiusHandleRef,
  dimLabelRef,
  onStart,
}: {
  box: { left: number; top: number; width: number; height: number };
  scale: number;
  scaleMode: boolean;
  showRadius: boolean;
  radius: number;
  radiusHandleRef: React.Ref<HTMLDivElement>;
  dimLabelRef: React.Ref<HTMLDivElement>;
  onStart: (e: React.PointerEvent, sub: 'resize' | 'rotate' | 'radius', handle: string) => void;
}) {
  const s = 9 / scale;
  const rz = 22 / scale;
  const border = 1.5 / scale;
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  const midX = box.left + box.width / 2;
  const midY = box.top + box.height / 2;
  const corners = [
    { k: 'nw', x: box.left, y: box.top, cur: 'nwse-resize' },
    { k: 'ne', x: right, y: box.top, cur: 'nesw-resize' },
    { k: 'se', x: right, y: bottom, cur: 'nwse-resize' },
    { k: 'sw', x: box.left, y: bottom, cur: 'nesw-resize' },
  ];
  const edges = [
    { k: 'n', x: midX, y: box.top, cur: 'ns-resize' },
    { k: 'e', x: right, y: midY, cur: 'ew-resize' },
    { k: 's', x: midX, y: bottom, cur: 'ns-resize' },
    { k: 'w', x: box.left, y: midY, cur: 'ew-resize' },
  ];
  const handleStyle = (x: number, y: number, cur: string): React.CSSProperties => ({
    left: x - s / 2, top: y - s / 2, width: s, height: s,
    border: `${border}px solid var(--brand)`, background: '#fff', cursor: cur,
    // During a resize the parent (selHiRef) is scaled by matrix(sx,sy) to preview
    // the new box — which would stretch these fixed-size squares. Counter-scale by
    // the inverse (fed as CSS vars on the parent, default 1) about each handle's
    // centre so it keeps its true square size while riding to the new edge.
    transform: 'scale(var(--gizmo-inv-x, 1), var(--gizmo-inv-y, 1))',
  });
  const rInset = Math.max(Math.min(radius, Math.min(box.width, box.height) / 2), 14 / scale);
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
          borderStyle: 'solid', borderColor: 'var(--brand)',
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
        <div key={h.k} onPointerDown={(e) => onStart(e, 'resize', h.k)} className="pointer-events-auto absolute rounded-[1px]" style={handleStyle(h.x, h.y, h.cur)} />
      ))}
      {corners.map((h) => (
        <div key={h.k} onPointerDown={(e) => onStart(e, 'resize', h.k)} className="pointer-events-auto absolute rounded-[1px]" style={handleStyle(h.x, h.y, h.cur)} />
      ))}
      {showRadius && !scaleMode && (
        <div
          ref={radiusHandleRef}
          onPointerDown={(e) => onStart(e, 'radius', '')}
          className="pointer-events-auto absolute rounded-full"
          title="Скругление углов"
          style={{ left: box.left + rInset - s / 2, top: box.top + rInset - s / 2, width: s, height: s, border: `${border}px solid var(--brand)`, background: '#fff', cursor: 'nwse-resize', transform: 'scale(var(--gizmo-inv-x, 1), var(--gizmo-inv-y, 1))' }}
        />
      )}
      <div
        ref={dimLabelRef}
        className="pointer-events-none absolute whitespace-nowrap rounded"
        style={{ left: midX, top: bottom + 7 / scale, transform: 'translateX(-50%)', background: 'var(--brand)', color: '#fff', fontSize: 11 / scale, lineHeight: 1.35, padding: `${1 / scale}px ${5 / scale}px` }}
      >
        {Math.round(box.width)} × {Math.round(box.height)}
      </div>
    </>
  );
}

const Highlight = forwardRef<HTMLDivElement, { box: Box; kind: 'select' | 'hover' | 'zone'; scale: number }>(
  function Highlight({ box, kind, scale }, ref) {
  const color =
    kind === 'select' ? 'var(--brand)' : kind === 'zone' ? '#3FB950' : 'rgba(var(--brand-rgb),0.5)';
  const weight = kind === 'select' ? 2 : kind === 'zone' ? 1.75 : 1.5;
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
        background: kind === 'select' ? 'rgba(var(--brand-rgb),0.08)' : kind === 'zone' ? 'rgba(63,185,80,0.08)' : 'transparent',
      }}
    />
  );
});

/** Visual spec for each frame role — the icon glyph, colour and tooltip shown
 *  in the frame chrome. `undefined` role falls back to the plain-frame entry. */
const ROLE_META = {
  frame: { Icon: FrameIcon, color: 'var(--text-tertiary)', title: 'Обычный фрейм · клик — сделать эталоном' },
  reference: { Icon: BadgeCheck, color: '#3FB950', title: 'Эталон · клик — сделать косячным' },
  flawed: { Icon: Bug, color: '#f24822', title: 'Косячный · клик — сделать обычным' },
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
}: {
  frame: FrameChrome & { box: Box };
  scale: number;
  selected: boolean;
  onSelect: (additive: boolean) => void;
  onCycleRole?: () => void;
}) {
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
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(e.shiftKey || e.metaKey);
        }}
        className="pointer-events-auto min-w-0 truncate text-left leading-none hover:underline"
        style={{
          fontSize: font,
          color: selected ? 'var(--brand)' : frame.role ? meta.color : 'var(--text-secondary)',
          fontWeight: selected ? 600 : 500,
          paddingRight: gap,
        }}
      >
        {frame.name}
      </button>
      {onCycleRole && (
        <button
          type="button"
          title={meta.title}
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
