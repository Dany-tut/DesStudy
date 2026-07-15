'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Renders the imported SVG at faithful pixels and overlays selection/hover
 * highlights. The highlight box is measured from the live DOM node
 * (`[data-layer-id]`) via getBoundingClientRect — so every SVG transform is
 * resolved by the browser, no matrix math on our side. Clicking a shape selects
 * its layer (canvas → tree sync, Figma-style).
 */
interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function LayerCanvas({
  svg,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  svg: string;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [selBox, setSelBox] = useState<Box | null>(null);
  const [hovBox, setHovBox] = useState<Box | null>(null);

  const boxFor = useCallback((id: string | null): Box | null => {
    const host = hostRef.current;
    if (!host || !id) return null;
    const node = host.querySelector<SVGGraphicsElement>(`[data-layer-id="${id}"]`);
    if (!node) return null;
    const hostRect = host.getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return {
      left: r.left - hostRect.left,
      top: r.top - hostRect.top,
      width: r.width,
      height: r.height,
    };
  }, []);

  // Recompute highlight boxes on selection/hover change AND on resize (the SVG
  // scales responsively, so pixel boxes shift).
  useLayoutEffect(() => {
    setSelBox(boxFor(selectedId));
    setHovBox(hoveredId && hoveredId !== selectedId ? boxFor(hoveredId) : null);
  }, [selectedId, hoveredId, svg, boxFor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      setSelBox(boxFor(selectedId));
      setHovBox(hoveredId && hoveredId !== selectedId ? boxFor(hoveredId) : null);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [selectedId, hoveredId, boxFor]);

  function handleClick(e: React.MouseEvent) {
    const target = (e.target as Element).closest('[data-layer-id]');
    const id = target?.getAttribute('data-layer-id');
    if (id) onSelect(id);
  }

  function handleMove(e: React.MouseEvent) {
    const target = (e.target as Element).closest('[data-layer-id]');
    onHover(target?.getAttribute('data-layer-id') ?? null);
  }

  return (
    <div className="flex justify-center">
      <div
        ref={hostRef}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={() => onHover(null)}
        className="canvas-host relative w-full max-w-[360px]"
      >
        {/* Injected SVG scales to the host width; highlight overlays sit on top. */}
        <div className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        {hovBox && <Highlight box={hovBox} kind="hover" />}
        {selBox && <Highlight box={selBox} kind="select" />}
      </div>
    </div>
  );
}

function Highlight({ box, kind }: { box: Box; kind: 'select' | 'hover' }) {
  const isSel = kind === 'select';
  return (
    <div
      className="pointer-events-none absolute rounded-[2px]"
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        outline: `${isSel ? 2 : 1.5}px solid ${isSel ? 'var(--brand, #7B61FF)' : 'rgba(123,97,255,0.45)'}`,
        outlineOffset: 1,
        background: isSel ? 'rgba(123,97,255,0.08)' : 'transparent',
      }}
    />
  );
}
