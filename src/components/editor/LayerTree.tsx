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
  FilePlus2,
  BadgeCheck,
  Bug,
} from 'lucide-react';
import type { Layer, LayerType } from '@/lib/editor/types';
import { useT } from '@/lib/i18n/client';
import { RENAME_FIELD } from './renameField';

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

/** ms between the start of one row's type-out and the next — the whole point of
 *  the stagger is that the list reads as being worked through, one row at a time. */
const REVEAL_STAGGER = 130;
/** ms per character. Fast enough not to be a wait, slow enough to read as typing. */
const REVEAL_CHAR = 26;

/**
 * A layer's name cell. Normally it's just text — the animation only exists for
 * the AI naming pass:
 *
 *   thinking → a shimmering skeleton bar (the model is reading the page)
 *   answer   → the new name types in, staggered so rows land one after another
 *
 * Both the pre-pass name and the row's place in the order are captured when
 * thinking *starts*, because by the time we animate, `naming` has cleared and
 * those props are already gone. A pass that changed nothing (a failure, or a
 * name the model chose to keep) types nothing — no theatre for a no-op.
 */
function LayerName({ name, naming, order }: { name: string; naming: boolean; order: number }) {
  // null = show the real name; a string = mid-type-out.
  const [typed, setTyped] = useState<string | null>(null);
  const wasNaming = useRef(naming);
  const nameAtStart = useRef(name);
  const orderAtStart = useRef(order);

  if (naming && !wasNaming.current) {
    // Capture during render, not in an effect: `naming` and `order` can both be
    // gone by the time an effect for the *end* of the pass runs.
    nameAtStart.current = name;
    orderAtStart.current = order;
  }

  useEffect(() => {
    const ended = wasNaming.current && !naming;
    wasNaming.current = naming;
    if (!ended || name === nameAtStart.current) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let i = 0;
    let tick: ReturnType<typeof setInterval> | null = null;
    setTyped('');
    const start = setTimeout(() => {
      tick = setInterval(() => {
        i += 1;
        // Reveal by code point, so a name with an emoji or a surrogate pair
        // never types out half a character.
        setTyped([...name].slice(0, i).join(''));
        if (i >= [...name].length) {
          if (tick) clearInterval(tick);
          setTyped(null);
        }
      }, REVEAL_CHAR);
    }, orderAtStart.current * REVEAL_STAGGER);

    return () => {
      clearTimeout(start);
      if (tick) clearInterval(tick);
      setTyped(null);
    };
  }, [naming, name]);

  if (naming) {
    return (
      <span className="min-w-0 flex-1">
        <span className="lt-skeleton block h-3 w-2/3" />
      </span>
    );
  }
  if (typed !== null) {
    return (
      <span className="flex min-w-0 flex-1 items-center text-brand">
        <span className="truncate">{typed}</span>
        <span aria-hidden className="lt-caret" />
      </span>
    );
  }
  return <span className="min-w-0 flex-1 truncate">{name}</span>;
}

/** Drop position of a layer-panel drag — kept in sync with EditorCore's LayerDropPos. */
type DropPos = 'before' | 'after' | 'inside';

/** Find a layer by id anywhere in the forest. */
function findInForest(list: Layer[], id: string): Layer | null {
  for (const l of list) {
    if (l.id === id) return l;
    const r = findInForest(l.children, id);
    if (r) return r;
  }
  return null;
}

/** Collect a layer's id plus every descendant id — the set that can't receive it. */
function collectIds(layer: Layer, set: Set<string>): void {
  set.add(layer.id);
  layer.children.forEach((c) => collectIds(c, set));
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
  onReparent,
  renameId,
  onRenameHandled,
  zoneIds,
  referenceIds,
  flawedIds,
  collapseSignal,
  namingIds,
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
  /** Move `dragId` next to / inside `targetId` via drag-and-drop. Omitted where
   *  the tree is read-only, which disables dragging. */
  onReparent?: (dragId: string, targetId: string, pos: DropPos, copy?: boolean) => void;
  /** Id of the row the shell asked to inline-rename (from the context menu). */
  renameId?: string | null;
  onRenameHandled?: () => void;
  /** Layer ids promoted to critique zones — shown with a target badge. */
  zoneIds?: Set<string>;
  /** Top-level frame ids marked as эталон — the row is badged and its whole
   *  subtree is painted green. */
  referenceIds?: Set<string>;
  /** Top-level frame ids marked as «сломанный» — the row is badged and its whole
   *  subtree is painted red. */
  flawedIds?: Set<string>;
  /** Bump this counter to collapse every group in the tree. */
  collapseSignal?: number;
  /** Ids the AI naming pass is currently thinking about — those rows show a
   *  shimmering skeleton, then type their new name in when the answer lands.
   *  Clear the set to end the pass; each row animates off that transition. */
  namingIds?: Set<string>;
}) {
  const primaryId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
  const noop = () => {};

  // Drag-and-drop state, owned here so every row sees the same drag. `forbidden`
  // is the dragged node's own subtree — rows it can't be dropped onto.
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; pos: DropPos } | null>(null);
  const forbidden = useRef<Set<string>>(new Set());

  const beginDrag = (id: string) => {
    setDragId(id);
    const l = findInForest(layers, id);
    const set = new Set<string>();
    if (l) collectIds(l, set);
    forbidden.current = set;
  };
  const endDrag = () => {
    setDragId(null);
    setDrop(null);
    forbidden.current = new Set();
  };
  const hoverDrop = (id: string, pos: DropPos, copy: boolean) => {
    // A copy may land right before/after the dragged row itself — Alt-dropping a
    // layer onto itself duplicates it in place. It still may never land *inside*
    // its own subtree, copy or not.
    const selfEdge = copy && id === dragId && pos !== 'inside';
    if (!dragId || (forbidden.current.has(id) && !selfEdge)) {
      setDrop((d) => (d ? null : d));
      return;
    }
    setDrop((d) => (d && d.id === id && d.pos === pos ? d : { id, pos }));
  };
  const commitDrop = (copy: boolean) => {
    if (dragId && drop && onReparent) onReparent(dragId, drop.id, drop.pos, copy);
    endDrag();
  };

  // The empty space under the last row is a drop target of its own, landing the
  // node at the end of the root list. Without it that whole area is dead: the
  // rows own every drop band, so releasing below them hits nothing and the drag
  // silently does nothing — which reads as "the indicator shows but no copy
  // appears" whenever the dragged row is the last one.
  const lastRootId = layers.length ? layers[layers.length - 1].id : null;
  // Rows handle their own drops and stop propagation; these fire only for the
  // container's own empty area, never for a bubbling row event.
  const onTailDragOver = (e: React.DragEvent) => {
    if (!dragId || !lastRootId || e.target !== e.currentTarget) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
    hoverDrop(lastRootId, 'after', e.altKey);
  };
  const onTailDrop = (e: React.DragEvent) => {
    if (!dragId || e.target !== e.currentTarget) return;
    e.preventDefault();
    commitDrop(e.altKey);
  };

  // Stagger order for the naming type-out: each renamed row's place in the tree,
  // read top to bottom the way it's displayed, counting only renamed rows — a
  // row that keeps its name must not leave a gap in the cascade.
  const namingOrder = new Map<string, number>();
  if (namingIds?.size) {
    let n = 0;
    const walk = (list: Layer[]) => {
      for (const l of list) {
        if (namingIds.has(l.id)) namingOrder.set(l.id, n++);
        if (l.children.length) walk(l.children);
      }
    };
    walk(layers);
  }

  return (
    <div
      onMouseLeave={() => onHover(null)}
      onDragOver={onTailDragOver}
      onDrop={onTailDrop}
      className="flex min-h-full flex-col"
    >
      {layers.map((l, i) => (
        <LayerRow key={l.id} layer={l} depth={0} selectedIds={selectedIds} primaryId={primaryId} runTop={!runNeighbourHi(layers, i - 1, selectedIds, false)} runBottom={!runNeighbourHi(layers, i + 1, selectedIds, false)} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} onContextMenu={onContextMenu ?? noop} renameId={renameId ?? null} onRenameHandled={onRenameHandled ?? noop} zoneIds={zoneIds} isReference={!!referenceIds?.has(l.id)} inReference={!!referenceIds?.has(l.id)} isFlawed={!!flawedIds?.has(l.id)} inFlawed={!!flawedIds?.has(l.id)} draggable={!!onReparent} dragId={dragId} drop={drop} onBeginDrag={beginDrag} onHoverDrop={hoverDrop} onCommitDrop={commitDrop} onEndDrag={endDrag} collapseSignal={collapseSignal} namingIds={namingIds} namingOrder={namingOrder} />
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
  const { t } = useT();
  return (
    <ContextMenuShell x={x} y={y} onClose={onClose}>
      <button type="button" className={MENU_ITEM} onClick={() => onGroup('column')}>
        <Rows3 size={14} className="text-tertiary" />
        {t('editor.menu.autoLayoutVertical')}
      </button>
      <button type="button" className={MENU_ITEM} onClick={() => onGroup('row')}>
        <Columns3 size={14} className="text-tertiary" />
        {t('editor.menu.autoLayoutHorizontal')}
      </button>
      {isGroup ? (
        <button type="button" className={MENU_ITEM} onClick={() => onUngroup?.()}>
          <Group size={14} className="text-tertiary" />
          {t('editor.menu.ungroup')}
        </button>
      ) : (
        <button type="button" className={MENU_ITEM} onClick={() => onGroup('none')}>
          <Group size={14} className="text-tertiary" />
          {t('editor.menu.group')}
          <span className="ml-auto text-caption text-tertiary">⌘G</span>
        </button>
      )}
      {canFramify && onFramify && (
        <button type="button" className={MENU_ITEM} onClick={onFramify}>
          <Frame size={14} className="text-tertiary" />
          {t('editor.menu.convertToFrame')}
        </button>
      )}
      {onDuplicateFlawed && (
        <>
          <div className="my-1 h-px bg-border" />
          <button type="button" className={MENU_ITEM} onClick={onDuplicateFlawed}>
            <Copy size={14} className="text-tertiary" />
            {t('editor.menu.duplicateFlawed')}
          </button>
        </>
      )}
      {(onRename || onDelete) && <div className="my-1 h-px bg-border" />}
      {onRename && (
        <button type="button" className={MENU_ITEM} onClick={onRename}>
          <Pencil size={14} className="text-tertiary" />
          {t('editor.menu.rename')}
        </button>
      )}
      {onDelete && (
        <button type="button" className={`${MENU_ITEM} hover:!text-danger`} onClick={onDelete}>
          <Trash2 size={14} className="text-tertiary" />
          {t('editor.menu.delete')}
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
  onAddFile,
}: {
  x: number;
  y: number;
  hasLayers: boolean;
  hasSelection: boolean;
  onClose: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onFitView: () => void;
  /** Import an SVG into the open page. Omitted where import isn't available. */
  onAddFile?: () => void;
}) {
  const { t } = useT();
  return (
    <ContextMenuShell x={x} y={y} onClose={onClose}>
      {onAddFile && (
        <>
          <button type="button" className={MENU_ITEM} onClick={() => { onAddFile(); onClose(); }}>
            <FilePlus2 size={14} className="text-tertiary" />
            {t('editor.file.addFile')}
          </button>
          <div className="my-1 h-px bg-border" />
        </>
      )}
      <button type="button" className={MENU_ITEM} disabled={!hasLayers} onClick={() => { onSelectAll(); onClose(); }}>
        <BoxSelect size={14} className="text-tertiary" />
        {t('editor.menu.selectAll')}
        <span className="ml-auto text-caption text-tertiary">⌘A</span>
      </button>
      <button type="button" className={MENU_ITEM} disabled={!hasSelection} onClick={() => { onClearSelection(); onClose(); }}>
        <SquareDashed size={14} className="text-tertiary" />
        {t('editor.menu.clearSelection')}
      </button>
      <div className="my-1 h-px bg-border" />
      <button type="button" className={MENU_ITEM} onClick={() => { onFitView(); onClose(); }}>
        <Maximize size={14} className="text-tertiary" />
        {t('editor.menu.zoomToFit')}
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
  isReference = false,
  inReference = false,
  isFlawed = false,
  inFlawed = false,
  draggable,
  dragId,
  drop,
  onBeginDrag,
  onHoverDrop,
  onCommitDrop,
  onEndDrag,
  collapseSignal,
  namingIds,
  namingOrder,
}: {
  layer: Layer;
  depth: number;
  selectedIds: string[];
  primaryId: string | null;
  /** This row is a top-level эталон frame — gets the BadgeCheck badge. */
  isReference?: boolean;
  /** This row is the эталон frame or lives inside one — painted green. */
  inReference?: boolean;
  /** This row is a top-level «сломанный» frame — gets the Bug badge. */
  isFlawed?: boolean;
  /** This row is the «сломанный» frame or lives inside one — painted red. */
  inFlawed?: boolean;
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
  /** Whether rows can be dragged to reparent/reorder (off for read-only trees). */
  draggable?: boolean;
  /** The id currently being dragged (null when no drag is in flight). */
  dragId?: string | null;
  /** The active drop target + position, or null. */
  drop?: { id: string; pos: DropPos } | null;
  onBeginDrag?: (id: string) => void;
  onHoverDrop?: (id: string, pos: DropPos, copy: boolean) => void;
  onCommitDrop?: (copy: boolean) => void;
  onEndDrag?: () => void;
  /** Bump this counter to collapse this row (and, recursively, all groups). */
  collapseSignal?: number;
  /** Ids the AI naming pass is thinking about — those rows show the skeleton,
   *  then type their new name in. Passed down whole so nested rows animate too. */
  namingIds?: Set<string>;
  /** Each renamed row's place in the cascade, for the type-out stagger. */
  namingOrder?: Map<string, number>;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);

  // The context menu requested a rename on this row — enter edit mode once.
  useEffect(() => {
    if (renameId === layer.id) {
      setEditing(true);
      onRenameHandled();
    }
  }, [renameId, layer.id, onRenameHandled]);

  // The header "collapse all" control bumps `collapseSignal` — fold this group up.
  // Skip the initial mount (signal `undefined`/0) so the tree starts expanded.
  const firstCollapse = useRef(true);
  useEffect(() => {
    if (firstCollapse.current) {
      firstCollapse.current = false;
      return;
    }
    // Keep top-level frames open — only fold the groups nested inside them.
    if (depth > 0) setOpen(false);
  }, [collapseSignal, depth]);
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
        }}
        draggable={draggable && !editing}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.effectAllowed = 'copyMove';
          e.dataTransfer.setData('text/plain', layer.id);
          onBeginDrag?.(layer.id);
        }}
        onDragOver={(e) => {
          if (!dragId) return;
          // Hovering the dragged row itself is a no-op for a move, but Alt-dropping
          // onto itself is a valid duplicate — so only bail out when not copying.
          if (dragId === layer.id && !e.altKey) return;
          e.preventDefault();
          // Alt/Option → show the copy badge; a plain drag shows the move cursor.
          e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
          const el = rowRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          const y = e.clientY - r.top;
          // A group/frame accepts a middle "nest inside" band; a leaf is reorder-only.
          // For an OPEN frame the "after" band is dropped: inserting after the frame
          // lands the node below all its (visible) children, but the header-level
          // "after" line would draw right under the header — a ~N-row mismatch. So an
          // open frame only offers before / inside (its children carry their own
          // reorder bands, and dropping before the next row places a sibling after
          // the frame). A collapsed frame keeps all three bands.
          const openFrame = layer.type === 'frame' && hasChildren && open;
          const pos: DropPos =
            openFrame
              ? y < r.height * 0.35
                ? 'before'
                : 'inside'
              : layer.type === 'frame'
                ? y < r.height * 0.28
                  ? 'before'
                  : y > r.height * 0.72
                    ? 'after'
                    : 'inside'
                : y < r.height / 2
                  ? 'before'
                  : 'after';
          onHoverDrop?.(layer.id, pos, e.altKey);
        }}
        onDrop={(e) => {
          if (!dragId) return;
          e.preventDefault();
          e.stopPropagation();
          // Alt/Option held on drop → duplicate into place instead of moving.
          onCommitDrop?.(e.altKey);
        }}
        onDragEnd={() => onEndDrag?.()}
        className={[
          'layer-row group relative flex cursor-default select-none items-center gap-1.5 py-1.5 pr-2 text-footnote transition-fast',
          dragId === layer.id ? 'opacity-40' : '',
          // Nesting a node inside this group/frame — ring the whole row.
          drop && drop.id === layer.id && drop.pos === 'inside'
            ? 'rounded-md ring-2 ring-inset ring-brand'
            : '',
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
              ? inReference
                ? 'bg-[color-mix(in_srgb,var(--ref-green)_15%,transparent)] text-[var(--ref-green)]'
                : inFlawed
                  ? 'bg-[color-mix(in_srgb,var(--flaw-red)_15%,transparent)] text-[var(--flaw-red)]'
                  : 'bg-brand/10 text-brand'
              : inSelectedGroup
                ? inReference
                  ? 'bg-[color-mix(in_srgb,var(--ref-green)_8%,transparent)] text-[var(--ref-green)] hover:bg-hover'
                  : inFlawed
                    ? 'bg-[color-mix(in_srgb,var(--flaw-red)_8%,transparent)] text-[var(--flaw-red)] hover:bg-hover'
                    : 'bg-brand/[0.06] text-secondary hover:bg-hover'
                : inReference
                  ? 'text-[var(--ref-green)] hover:bg-hover'
                  : inFlawed
                    ? 'text-[var(--flaw-red)] hover:bg-hover'
                    : 'text-secondary hover:bg-hover',
        ].join(' ')}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {/* Reorder drop line — before / after this row. Its left edge follows the
            row's own indentation so the line reads at the depth it'll land at,
            instead of a full-width bar that looks skewed over nested rows. */}
        {drop && drop.id === layer.id && drop.pos === 'before' && (
          <span aria-hidden className="pointer-events-none absolute top-0 right-1 h-0.5 -translate-y-1/2 rounded-full bg-brand" style={{ left: 8 + depth * 14 }} />
        )}
        {drop && drop.id === layer.id && drop.pos === 'after' && (
          <span aria-hidden className="pointer-events-none absolute bottom-0 right-1 h-0.5 translate-y-1/2 rounded-full bg-brand" style={{ left: 8 + depth * 14 }} />
        )}
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
            aria-label={open ? t('editor.sidebar.collapse') : t('editor.sidebar.expand')}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="relative flex h-4 w-4 shrink-0 cursor-default items-center justify-center text-tertiary"
          >
            <ChevronRight size={13} className={['transition-fast', open ? 'rotate-90' : ''].join(' ')} />
          </button>
        ) : (
          <span className="relative h-4 w-4 shrink-0" />
        )}
        <Icon
          size={13}
          className={inReference ? 'text-[var(--ref-green)]' : inFlawed ? 'text-[var(--flaw-red)]' : active ? 'text-brand' : 'text-tertiary'}
        />
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
            className={`${RENAME_FIELD} -mx-0.5 min-w-0 flex-1 px-1 py-0 text-footnote leading-[inherit]`}
          />
        ) : (
          <LayerName name={layer.name} naming={!!namingIds?.has(layer.id)} order={namingOrder?.get(layer.id) ?? 0} />
        )}
        {!editing && isReference && (
          <BadgeCheck size={12} className="ml-auto shrink-0 text-[var(--ref-green)]" aria-label={t('editor.tree.reference')} />
        )}
        {!editing && isFlawed && (
          <Bug size={12} className="ml-auto shrink-0 text-[var(--flaw-red)]" aria-label={t('editor.tree.flawed')} />
        )}
        {!editing && zoneIds?.has(layer.id) && (
          <Target size={11} className={`${isReference || isFlawed ? 'ml-1.5' : 'ml-auto'} shrink-0 text-[#3FB950]`} aria-label={t('editor.tree.critiqueZone')} />
        )}
        {!editing && onDelete && (
          <button
            type="button"
            aria-label={t('editor.tree.deleteLayer')}
            title={t('editor.tree.deleteLayer')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(layer.id);
            }}
            className={[
              'shrink-0 cursor-default text-tertiary opacity-0 transition-fast hover:text-danger group-hover:opacity-100',
              isReference || isFlawed || zoneIds?.has(layer.id) ? 'ml-1.5' : 'ml-auto',
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
              <LayerRow key={c.id} layer={c} depth={depth + 1} selectedIds={selectedIds} primaryId={primaryId} inSelectedGroup={ctxHi} runTop={!hiPrev} runBottom={!hiNext} onSelect={onSelect} onHover={onHover} onRename={onRename} onDelete={onDelete} onContextMenu={onContextMenu} renameId={renameId} onRenameHandled={onRenameHandled} zoneIds={zoneIds} inReference={inReference} inFlawed={inFlawed} draggable={draggable} dragId={dragId} drop={drop} onBeginDrag={onBeginDrag} onHoverDrop={onHoverDrop} onCommitDrop={onCommitDrop} onEndDrag={onEndDrag} collapseSignal={collapseSignal} namingIds={namingIds} namingOrder={namingOrder} />
            );
          })}
        </>
      )}
    </>
  );
}
