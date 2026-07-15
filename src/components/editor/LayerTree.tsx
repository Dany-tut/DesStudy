'use client';

import { useState } from 'react';
import {
  ChevronRight,
  Square,
  Type,
  Frame,
  Image as ImageIcon,
  PenTool,
  Target,
} from 'lucide-react';
import type { Layer, LayerType } from '@/lib/editor/types';

const TYPE_ICON: Record<LayerType, typeof Square> = {
  frame: Frame,
  text: Type,
  block: Square,
  image: ImageIcon,
  vector: PenTool,
};

/**
 * The layers panel — Figma-style: nested rows, expand/collapse for groups,
 * click to select (syncs with the canvas), hover to preview-highlight. Type
 * icons mirror Figma's affordances. A future "critique zone" badge slots in
 * next to the name (milestone 3).
 */
export function LayerTree({
  layers,
  selectedId,
  onSelect,
  onHover,
  zoneIds,
}: {
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Layer ids promoted to critique zones — shown with a target badge. */
  zoneIds?: Set<string>;
}) {
  return (
    <div onMouseLeave={() => onHover(null)} className="flex flex-col">
      {layers.map((l) => (
        <LayerRow key={l.id} layer={l} depth={0} selectedId={selectedId} onSelect={onSelect} onHover={onHover} zoneIds={zoneIds} />
      ))}
    </div>
  );
}

function LayerRow({
  layer,
  depth,
  selectedId,
  onSelect,
  onHover,
  zoneIds,
}: {
  layer: Layer;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  zoneIds?: Set<string>;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = layer.children.length > 0;
  const active = selectedId === layer.id;
  const Icon = TYPE_ICON[layer.type];

  return (
    <>
      <div
        onClick={() => onSelect(layer.id)}
        onMouseEnter={() => onHover(layer.id)}
        className={[
          'group flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-footnote transition-fast',
          active ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover',
        ].join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Свернуть' : 'Развернуть'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-tertiary"
          >
            <ChevronRight size={13} className={['transition-fast', open ? 'rotate-90' : ''].join(' ')} />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <Icon size={13} className={active ? 'text-brand' : 'text-tertiary'} />
        <span className="truncate">{layer.name}</span>
        {zoneIds?.has(layer.id) && (
          <Target size={11} className="ml-auto shrink-0 text-[#3FB950]" aria-label="Зона критики" />
        )}
      </div>
      {hasChildren && open && (
        <>
          {layer.children.map((c) => (
            <LayerRow key={c.id} layer={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onHover={onHover} zoneIds={zoneIds} />
          ))}
        </>
      )}
    </>
  );
}
