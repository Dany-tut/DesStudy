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
  Trash2,
  Group,
  Copy,
  Pencil,
  BoxSelect,
  SquareDashed,
  Maximize,
} from 'lucide-react';
import type { Layer, LayerType } from '@/lib/editor/types';
import { playHover } from '@/lib/sound';

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
    // A plain group (no own bounds/clip) reads as a group — the dashed selection
    // box, like Figma. Only a real frame gets the frame / auto-layout glyph.
    if (!layer.props.clip) return BoxSelect;
    // Only explicit auto-layouts (row / column — the two the group menu offers)
    // get a flow glyph. `grid`/`none` are parse-time inferences, not authored
    // layouts, so a real frame reads as a frame — not a grid/group.
    switch (layer.props.layout) {
      case 'row':
        return Columns3;
      case 'column':
        return Rows3;
      default:
        return Frame;
    }
  }
  return TYPE_ICON[layer.type];
}

/** Whether `id` is anywhere in this layer's subtree (excluding the layer itself). */
function subtreeContains(layer: Layer, id: string): boolean {
  return layer.children.some((c) => c.id === id || subtreeContains(c, id));
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
  onContextMenu,
  renameId,
  onRenameHandled,
  zoneIds,
}: {
  layers: Layer[];
  /** Selected layer ids; the last is the "primary" (drives centering). */
  selectedIds: string[];
  /** Select a layer. `additive` (Shift/Cmd) toggles it within the current set. */
  onSelect: (id: string, additive?: boolean, range?: boolean) => void;
  onHover: (id: string | null) => void;
  /** Commit a new name for a layer (double-click a row to edit). */
  onRename?: (id: string, name: string) => void;
  /** Remove a layer and its subtree. */
  onDelete?: (id: string) => void;
  /** Open the right-click menu for a layer (owned by the editor shell). Omitted
   *  where the tree is read-only (e.g. the critique-zone SVG builder). */
  onContextMenu?: (e: React.MouseEvent, layerId: string) => void;
  /** Id of the row the shell asked to inline-rename (from the context menu). */
  renameId?: string | null;
  onRenameHandled?: () => void;
  /** Layer ids promoted to critique zones — shown with a target badge. */
  zoneIds?: Set<string>;
}) {
  const primaryId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
  const noop = () => {};
  return (
    <div onMouseLeave={() => onHover(null)} className="flex flex-col">
      {layers.map((l, i) => (
        <LayerRow key={l.id} layer={l} depth={0} selectedIds={selectedIds} primaryId={primaryId} runTop={!runNeighbourHi(layers, i - 1, selectedIds, false)} runBottom={!runNeighbourHi(layers, i + 1, selectedIds, false)} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} onContextMenu={onContextMenu ?? noop} renameId={renameId ?? null} onRenameHandled={onRenameHandled ?? noop} zoneIds={zoneIds} />
      ))}
    </div>
  );
}

/** Whether the sibling at `i` carries the selection highlight — a row is
 *  highlighted when it's selected itself, or its parent group is (ctxHi). Used to
 *  merge a contiguous run of highlighted siblings into one rounded block instead
 *  of a scalloped stack of pills. Out-of-range indices count as un-highlighted so
 *  a run's ends round off. */
function runNeighbourHi(siblings: Layer[], i: number, selectedIds: string[], ctxHi: boolean): boolean {
  const l = siblings[i];
  if (!l) return false;
  return ctxHi || selectedIds.includes(l.id);
}

/** Shared right-click-menu shell: fixed at the cursor, nudged back inside the
 *  viewport, and dismissed on any outside click / scroll / Escape. */
const MENU_ITEM =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-footnote text-secondary transition-fast hover:bg-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

function ContextMenuShell({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - r.width - 8),
      y: Math.min(y, window.innerHeight - r.height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    // Capture so a click anywhere (including other rows) dismisses first — but
    // skip mousedowns that land INSIDE the menu, otherwise the press that begins
    // a menu-item click would close the menu (React unmounts the item) before the
    // click fires, so onClick never runs. A capture listener on window beats any
    // in-menu stopPropagation, so the guard has to live here, not on the div.
    const onDown = (e: MouseEvent) => {
      if (ref.current && e.target instanceof Node && ref.current.contains(e.target)) return;
      onClose();
    };
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-50 min-w-[220px] rounded-xl border border-border bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] p-1.5 shadow-lg backdrop-blur-md"
    >
      {children}
    </div>
  );
}

/** Figma-style right-click menu on a layer — grouping / auto-layout, rename, delete. */
export function LayerContextMenu({
  x,
  y,
  isGroup,
  canFramify,
  onClose,
  onGroup,
  onUngroup,
  onFramify,
  onDuplicateFlawed,
  onRename,
  onDelete,
}: {
  x: number;
  y: number;
  isGroup?: boolean;
  /** Show "Преобразовать во фрейм" — true for a plain group not yet framed. */
  canFramify?: boolean;
  onClose: () => void;
  onGroup: (layout: 'row' | 'column' | 'none') => void;
  onUngroup?: () => void;
  onFramify?: () => void;
  /** Show "Дублировать как сломанный" — true for a top-level frame. */
  onDuplicateFlawed?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <ContextMenuShell x={x} y={y} onClose={onClose}>
      <button type="button" className={MENU_ITEM} onClick={() => onGroup('column')}>
        <Rows3 size={14} className="text-tertiary" />
        Авто-макет · вертикальный
      </button>
      <button type="button" className={MENU_ITEM} onClick={() => onGroup('row')}>
        <Columns3 size={14} className="text-tertiary" />
        Авто-макет · горизонтальный
      </button>
      {isGroup ? (
        <button type="button" className={MENU_ITEM} onClick={() => onUngroup?.()}>
          <Group size={14} className="text-tertiary" />
          Разгруппировать
        </button>
      ) : (
        <button type="button" className={MENU_ITEM} onClick={() => onGroup('none')}>
          <Group size={14} className="text-tertiary" />
          Сгруппировать
          <span className="ml-auto text-caption text-tertiary">⌘G</span>
        </button>
      )}
      {canFramify && onFramify && (
        <button type="button" className={MENU_ITEM} onClick={onFramify}>
          <Frame size={14} className="text-tertiary" />
          Преобразовать во фрейм
        </button>
      )}
      {onDuplicateFlawed && (
        <>
          <div className="my-1 h-px bg-border" />
          <button type="button" className={MENU_ITEM} onClick={onDuplicateFlawed}>
            <Copy size={14} className="text-tertiary" />
            Дублировать как сломанный
          </button>
        </>
      )}
      {(onRename || onDelete) && <div className="my-1 h-px bg-border" />}
      {onRename && (
        <button type="button" className={MENU_ITEM} onClick={onRename}>
          <Pencil size={14} className="text-tertiary" />
          Переименовать
        </button>
      )}
      {onDelete && (
        <button type="button" className={`${MENU_ITEM} hover:!text-danger`} onClick={onDelete}>
          <Trash2 size={14} className="text-tertiary" />
          Удалить
        </button>
      )}
    </ContextMenuShell>
  );
}

/** Right-click menu on empty canvas — whole-scene actions. */
export function CanvasContextMenu({
  x,
  y,
  hasLayers,
  hasSelection,
  onClose,
  onSelectAll,
  onClearSelection,
  onFitView,
}: {
  x: number;
  y: number;
  hasLayers: boolean;
  hasSelection: boolean;
  onClose: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onFitView: () => void;
}) {
  return (
    <ContextMenuShell x={x} y={y} onClose={onClose}>
      <button type="button" className={MENU_ITEM} disabled={!hasLayers} onClick={() => { onSelectAll(); onClose(); }}>
        <BoxSelect size={14} className="text-tertiary" />
        Выделить всё
        <span className="ml-auto text-caption text-tertiary">⌘A</span>
      </button>
      <button type="button" className={MENU_ITEM} disabled={!hasSelection} onClick={() => { onClearSelection(); onClose(); }}>
        <SquareDashed size={14} className="text-tertiary" />
        Снять выделение
      </button>
      <div className="my-1 h-px bg-border" />
      <button type="button" className={MENU_ITEM} onClick={() => { onFitView(); onClose(); }}>
        <Maximize size={14} className="text-tertiary" />
        Показать по размеру
        <span className="ml-auto text-caption text-tertiary">⇧1</span>
      </button>
    </ContextMenuShell>
  );
}

function LayerRow({
  layer,
  depth,
  selectedIds,
  primaryId,
  inSelectedGroup = false,
  runTop = true,
  runBottom = true,
  onSelect,
  onHover,
  onRename,
  onDelete,
  onContextMenu,
  renameId,
  onRenameHandled,
  zoneIds,
}: {
  layer: Layer;
  depth: number;
  selectedIds: string[];
  primaryId: string | null;
  /** True when an ancestor group of this row is selected — the whole subtree of a
   *  picked group is highlighted, mirroring the canvas selection. */
  inSelectedGroup?: boolean;
  /** Ends of a contiguous highlighted run: round the top / bottom corners only at
   *  the run's edges so adjacent selected rows read as one block, not pills. */
  runTop?: boolean;
  runBottom?: boolean;
  onSelect: (id: string, additive?: boolean, range?: boolean) => void;
  onHover: (id: string | null) => void;
  onRename?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, layerId: string) => void;
  /** When it matches this row's id, open the inline rename editor. */
  renameId: string | null;
  onRenameHandled: () => void;
  zoneIds?: Set<string>;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);

  // The context menu requested a rename on this row — enter edit mode once.
  useEffect(() => {
    if (renameId === layer.id) {
      setEditing(true);
      onRenameHandled();
    }
  }, [renameId, layer.id, onRenameHandled]);
  const hasChildren = layer.children.length > 0;
  const active = selectedIds.includes(layer.id);
  const Icon = iconFor(layer);
  const rowRef = useRef<HTMLDivElement>(null);

  const isPrimary = primaryId === layer.id;

  // If a selected layer lives inside this (collapsed) group, expand so it becomes
  // visible — mirrors Figma revealing the disclosure chevron down to the picked
  // node when it's selected on the canvas. Uses the whole selection, not just the
  // primary, so multi-select on the canvas reveals every branch that holds a pick.
  const revealsSelection =
    hasChildren && selectedIds.some((id) => subtreeContains(layer, id));
  useEffect(() => {
    if (revealsSelection) setOpen(true);
  }, [revealsSelection]);

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
        onClick={(e) => onSelect(layer.id, e.metaKey || e.ctrlKey, e.shiftKey)}
        onDoubleClick={() => onRename && setEditing(true)}
        onContextMenu={(e) => onContextMenu(e, layer.id)}
        onMouseEnter={() => {
          onHover(layer.id);
          playHover();
        }}
        className={[
          'group relative flex cursor-pointer select-none items-center gap-1.5 py-1.5 pr-2 text-footnote transition-fast',
          // A highlighted row rounds only the ends of its run; unselected rows keep
          // a plain rounded box for the hover chip.
          active || inSelectedGroup
            ? `${runTop ? 'rounded-t-md' : ''} ${
                // An open highlighted group flows into its (also-highlighted)
                // children, so its bottom stays square to merge with them.
                runBottom && !(open && hasChildren) ? 'rounded-b-md' : ''
              }`
            : 'rounded-md',
          editing
            ? 'text-primary'
            : active
              ? 'bg-brand/10 text-brand'
              : inSelectedGroup
                ? 'bg-brand/[0.06] text-secondary hover:bg-hover'
                : 'text-secondary hover:bg-hover',
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
            // Frame drawn with `outline` (not `border`) so it adds nothing to
            // the box — the row height stays identical to its non-editing state.
            className="-mx-0.5 min-w-0 flex-1 rounded-[4px] bg-surface px-1 py-0 text-footnote leading-[inherit] text-primary outline outline-[1.5px] -outline-offset-1 outline-brand focus:outline-brand focus-visible:outline-brand"
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{layer.name}</span>
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
          {layer.children.map((c, i) => {
            const ctxHi = active || inSelectedGroup;
            // Neighbour highlight — for the first child the row above is this
            // (highlighted-if-ctxHi) group, so its run continues from the parent.
            const hiPrev = i > 0 ? ctxHi || selectedIds.includes(layer.children[i - 1].id) : ctxHi;
            const hiNext =
              i < layer.children.length - 1
                ? ctxHi || selectedIds.includes(layer.children[i + 1].id)
                : false;
            return (
              <LayerRow key={c.id} layer={c} depth={depth + 1} selectedIds={selectedIds} primaryId={primaryId} inSelectedGroup={ctxHi} runTop={!hiPrev} runBottom={!hiNext} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} onContextMenu={onContextMenu} renameId={renameId} onRenameHandled={onRenameHandled} zoneIds={zoneIds} />
            );
          })}
        </>
      )}
    </>
  );
}
