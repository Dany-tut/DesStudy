'use client';

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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

/** Modifier that means "go deep / zoom" — Cmd (Mac) · Ctrl · Alt, any of them.
 *  Also true for trackpad pinch, which the browser reports as ctrl+wheel. */
const wantsDeep = (e: { altKey: boolean; metaKey: boolean; ctrlKey: boolean }) =>
  e.altKey || e.metaKey || e.ctrlKey;

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
  onHover,
  onMoveLayers,
  zoneIds,
  svgHostRef,
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
  onHover: (id: string | null) => void;
  /** Commit a finished drag: shift every given layer by (dx,dy) user units. */
  onMoveLayers: (ids: string[], dx: number, dy: number) => void;
  /** Layer ids promoted to critique zones — outlined in green. */
  zoneIds?: Set<string>;
  /** Ref to the div wrapping the injected `<svg>`, so callers can measure nodes. */
  svgHostRef?: React.Ref<HTMLDivElement>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selHiRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [selBoxes, setSelBoxes] = useState<Box[]>([]);
  const [hovBox, setHovBox] = useState<Box | null>(null);
  const [zoneBoxes, setZoneBoxes] = useState<Box[]>([]);

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
  >(null);

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

  // Fit-and-centre the scene the first time we know both sizes.
  useLayoutEffect(() => {
    if (view || !width || !height) return;
    const host = hostRef.current;
    if (!host) return;
    const { width: hw, height: hh } = host.getBoundingClientRect();
    if (!hw || !hh) return;
    const scale = clamp(Math.min((hw - 96) / width, (hh - 96) / height, 1), MIN_SCALE, MAX_SCALE);
    setView({ x: (hw - width * scale) / 2, y: (hh - height * scale) / 2, scale });
  }, [view, width, height]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, hoveredId, svg, view, measure, zoneIds]);

  // Wheel: pan by default, zoom-to-cursor with Alt. Bound natively so we can
  // preventDefault (the page must not scroll behind the fixed stage).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => {
        if (!v) return v;
        if (wantsDeep(e)) {
          const rect = host.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const next = clamp(v.scale * Math.exp(-e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
          const k = next / v.scale;
          return { scale: next, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
        }
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
      } else {
        const hi = selHiRef.current;
        if (hi) hi.style.transform = '';
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
  }, [onMoveLayers]);

  function onPointerDown(e: React.PointerEvent) {
    if (!view) return;
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
      // Empty grid: clear selection and pan. Shift keeps the current selection.
      if (!additive) onSelect(null);
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, scale: view.scale };
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
      onPointerLeave={() => onHover(null)}
      className="canvas-grid relative h-full w-full touch-none select-none overflow-hidden bg-canvas"
      style={{ cursor: drag.current?.kind === 'pan' ? 'grabbing' : 'default' }}
    >
      {view && (
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <div
            ref={svgHostRef}
            className="relative bg-white [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
            style={{ width, height }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {zoneBoxes.map((b, i) => (
            <Highlight key={`z-${i}`} box={b} kind="zone" scale={view.scale} />
          ))}
          {hovBox && <Highlight box={hovBox} kind="hover" scale={view.scale} />}
          {selBoxes.length > 0 && (
            <div ref={selHiRef} className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ width, height }}>
              {selBoxes.map((b, i) => (
                <Highlight key={`s-${i}`} box={b} kind="select" scale={view.scale} />
              ))}
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
        </div>
      )}

      {view && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-elevated/80 px-2 py-1 text-caption tabular-nums text-tertiary backdrop-blur">
          {Math.round(view.scale * 100)}%
        </div>
      )}
      <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-elevated/80 px-2 py-1 text-caption text-tertiary backdrop-blur">
        ⌘/Alt+колесо — зум · тащи слой — двигать · ⌘/Alt — вглубь
      </div>
    </div>
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
