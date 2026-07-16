'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Square,
  Type,
  Frame,
  Image as ImageIcon,
  PenTool,
  Target,
  Columns3,
  Rows3,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import type { Layer, LayerType } from '@/lib/editor/types';

const TYPE_ICON: Record<LayerType, typeof Square> = {
  frame: Frame,
  text: Type,
  block: Square,
  image: ImageIcon,
  vector: PenTool,
};

/** Frames pick their glyph from the inferred auto-layout flow, so a row-, column-
 *  or grid-arranged group reads like it does in Figma; a free group keeps the
 *  plain frame glyph. */
function iconFor(layer: Layer): typeof Square {
  if (layer.type === 'frame') {
    switch (layer.props.layout) {
      case 'row':
        return Columns3;
      case 'column':
        return Rows3;
      case 'grid':
        return LayoutGrid;
      default:
        return Frame;
    }
  }
  return TYPE_ICON[layer.type];
}

/**
 * The layers panel — Figma-style: nested rows with indent guides, expand/collapse
 * for groups, click to select (syncs with the canvas), hover to preview-highlight.
 * Frame icons reflect the inferred auto-layout flow (row / column / grid / free),
 * mirroring how Figma distinguishes auto-layout frames from plain groups. A
 * critique-zone badge sits at the row end (milestone 3).
 */
export function LayerTree({
  layers,
  selectedIds,
  onSelect,
  onHover,
  onRename,
  onDelete,
  zoneIds,
}: {
  layers: Layer[];
  /** Selected layer ids; the last is the "primary" (drives centering). */
  selectedIds: string[];
  /** Select a layer. `additive` (Shift/Cmd) toggles it within the current set. */
  onSelect: (id: string, additive?: boolean) => void;
  onHover: (id: string | null) => void;
  /** Commit a new name for a layer (double-click a row to edit). */
  onRename?: (id: string, name: string) => void;
  /** Remove a layer and its subtree. */
  onDelete?: (id: string) => void;
  /** Layer ids promoted to critique zones — shown with a target badge. */
  zoneIds?: Set<string>;
}) {
  const primaryId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
  return (
    <div onMouseLeave={() => onHover(null)} className="flex flex-col">
      {layers.map((l) => (
        <LayerRow key={l.id} layer={l} depth={0} selectedIds={selectedIds} primaryId={primaryId} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} zoneIds={zoneIds} />
      ))}
    </div>
  );
}

function LayerRow({
  layer,
  depth,
  selectedIds,
  primaryId,
  onSelect,
  onHover,
  onRename,
  onDelete,
  zoneIds,
}: {
  layer: Layer;
  depth: number;
  selectedIds: string[];
  primaryId: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  onHover: (id: string | null) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  zoneIds?: Set<string>;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const hasChildren = layer.children.length > 0;
  const active = selectedIds.includes(layer.id);
  const Icon = iconFor(layer);
  const rowRef = useRef<HTMLDivElement>(null);

  const isPrimary = primaryId === layer.id;
  // When this row becomes the primary selection (e.g. picked on the canvas),
  // center it within the panel's own scroll container. Centering is clamped by
  // the browser's scrollTop range, so rows near the top/bottom simply sit as
  // close to centre as the edge allows instead of leaving a gap.
  useEffect(() => {
    if (!isPrimary) return;
    const row = rowRef.current;
    if (!row) return;
    let scroller = row.parentElement;
    while (scroller && scroller.scrollHeight <= scroller.clientHeight) {
      scroller = scroller.parentElement;
    }
    if (!scroller) return;
    const rowRect = row.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    const delta = rowRect.top - scRect.top - (scroller.clientHeight - rowRect.height) / 2;
    scroller.scrollTo({ top: scroller.scrollTop + delta, behavior: 'smooth' });
  }, [isPrimary]);

  return (
    <>
      <div
        ref={rowRef}
        onClick={(e) => onSelect(layer.id, e.shiftKey || e.metaKey)}
        onDoubleClick={() => onRename && setEditing(true)}
        onMouseEnter={() => onHover(layer.id)}
        className={[
          'group relative flex cursor-pointer items-center gap-1.5 rounded-md py-1.5 pr-2 text-footnote transition-fast',
          active ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover',
        ].join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {/* Indent guides — one hairline per ancestor level, like Figma. */}
        {Array.from({ length: depth }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-border/60"
            style={{ left: 8 + 7 + i * 14 }}
          />
        ))}
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? 'Свернуть' : 'Развернуть'}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="relative flex h-4 w-4 shrink-0 items-center justify-center text-tertiary"
          >
            <ChevronRight size={13} className={['transition-fast', open ? 'rotate-90' : ''].join(' ')} />
          </button>
        ) : (
          <span className="relative h-4 w-4 shrink-0" />
        )}
        <Icon size={13} className={active ? 'text-brand' : 'text-tertiary'} />
        {editing ? (
          <input
            autoFocus
            defaultValue={layer.name}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                onRename?.(layer.id, (e.target as HTMLInputElement).value);
                setEditing(false);
              } else if (e.key === 'Escape') {
                setEditing(false);
              }
            }}
            onBlur={(e) => {
              onRename?.(layer.id, e.target.value);
              setEditing(false);
            }}
            className="min-w-0 flex-1 rounded border border-brand/60 bg-surface px-1 py-0.5 text-footnote text-primary outline-none"
          />
        ) : (
          <span className="truncate">{layer.name}</span>
        )}
        {!editing && zoneIds?.has(layer.id) && (
          <Target size={11} className="ml-auto shrink-0 text-[#3FB950]" aria-label="Зона критики" />
        )}
        {!editing && onDelete && (
          <button
            type="button"
            aria-label="Удалить слой"
            title="Удалить слой"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className={[
              'shrink-0 text-tertiary opacity-0 transition-fast hover:text-danger group-hover:opacity-100',
              zoneIds?.has(layer.id) ? 'ml-1.5' : 'ml-auto',
            ].join(' ')}
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      {hasChildren && open && (
        <>
          {layer.children.map((c) => (
            <LayerRow key={c.id} layer={c} depth={depth + 1} selectedIds={selectedIds} primaryId={primaryId} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} zoneIds={zoneIds} />
          ))}
        </>
      )}
    </>
  );
}
