'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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

export function StageCanvas({
  svg,
  width,
  height,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onMoveLayer,
  zoneIds,
  svgHostRef,
}: {
  svg: string;
  /** viewBox size in user units — one unit renders as one content-space px. */
  width: number;
  height: number;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  /** Commit a finished drag: shift the layer by (dx,dy) user units. */
  onMoveLayer: (id: string, dx: number, dy: number) => void;
  /** Layer ids promoted to critique zones — outlined in green. */
  zoneIds?: Set<string>;
  /** Ref to the div wrapping the injected `<svg>`, so callers can measure nodes. */
  svgHostRef?: React.Ref<HTMLDivElement>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selHiRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null>(null);
  const [selBox, setSelBox] = useState<Box | null>(null);
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
    | { kind: 'move'; id: string; node: SVGGraphicsElement; base: string; startX: number; startY: number; scale: number; dx: number; dy: number }
  >(null);

  // Latest pointer event awaiting a frame — coalesces the burst of pointermove
  // events the OS fires between two paints into a single visual update.
  const pending = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef<number | null>(null);

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

  useLayoutEffect(() => {
    setSelBox(measure(selectedId));
    setHovBox(hoveredId && hoveredId !== selectedId ? measure(hoveredId) : null);
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
  }, [selectedId, hoveredId, svg, view, measure, zoneIds]);

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
        g.dx = (p.x - g.startX) / g.scale;
        g.dy = (p.y - g.startY) / g.scale;
        // Move the layer and its selection outline together — both by the same
        // content-space delta, so no re-measure (getBoundingClientRect) is needed.
        g.node.setAttribute('transform', `translate(${g.dx} ${g.dy}) ${g.base}`.trim());
        const hi = selHiRef.current;
        if (hi) hi.style.transform = `translate(${g.dx}px, ${g.dy}px)`;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.current) return;
      pending.current = { x: e.clientX, y: e.clientY };
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
        if (Math.abs(g.dx) > 0.5 || Math.abs(g.dy) > 0.5) onMoveLayer(g.id, g.dx, g.dy);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [onMoveLayer]);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || !view) return;
    const id = layerIdAt(e.target, wantsDeep(e));
    if (id && !e.shiftKey) {
      const node = contentRef.current?.querySelector<SVGGraphicsElement>(`[data-layer-id="${id}"]`);
      onSelect(id);
      if (node) {
        drag.current = {
          kind: 'move',
          id,
          node,
          base: node.getAttribute('transform') ?? '',
          startX: e.clientX,
          startY: e.clientY,
          scale: view.scale,
          dx: 0,
          dy: 0,
        };
      }
    } else {
      onSelect(null);
      drag.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y, scale: view.scale };
    }
  }

  function onPointerMoveHover(e: React.PointerEvent) {
    if (drag.current) return;
    onHover(layerIdAt(e.target, wantsDeep(e)));
  }

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
          {selBox && <Highlight ref={selHiRef} box={selBox} kind="select" scale={view.scale} />}
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
}
