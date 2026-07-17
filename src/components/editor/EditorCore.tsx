'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n/client';
import { UploadCloud, AlertCircle, RotateCcw, Plus, X, GraduationCap, Link2, Image as ImageIcon, ChevronDown, ChevronsDownUp } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, ParseResult, EditorTool } from '@/lib/editor/types';
import { listDrafts, saveDraft, deleteDraft, coverPageOf, type EditorDraftEntry } from '@/lib/editor/drafts';
import { blankResult, type PageItem, type PageMeta } from '@/lib/editor/pages';
import { emptyDraft, draftToPayload } from '@/lib/admin/exerciseDraft';
import type { CritiqueZone, DefectDelta } from '@/lib/curriculum/types';
import { LayerTree, LayerContextMenu, CanvasContextMenu } from './LayerTree';
import { PagesPanel } from './PagesPanel';
import { StageCanvas } from './StageCanvas';
import { EditorDock } from './EditorDock';
import { PropertiesPanel } from './PropertiesPanel';
import { FrameSizePanel, CanvasBackgroundPanel } from './FramePresetPanel';
import { type EditorStep } from './StepBar';
import { ExerciseSetupPanel, ZoneEditor, Step4Access, type EditorDraft } from './EditorSteps';
import { DiffPanel } from './DiffPanel';

/** Flatten the tree once so selection lookups don't re-walk on every render. */
function indexLayers(layers: Layer[], map: Map<string, Layer> = new Map()): Map<string, Layer> {
  for (const l of layers) {
    map.set(l.id, l);
    if (l.children.length) indexLayers(l.children, map);
  }
  return map;
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Resolve a keydown to its physical-key code (e.g. 'KeyV'), layout-independent.
 * `e.code` already is the physical key on most browsers, but as a belt-and-braces
 * fallback we also map the Cyrillic character `e.key` produces on a Russian
 * (ЙЦУКЕН) layout — so pressing the V key (which types 'м') still resolves to
 * 'KeyV'. Returns '' for keys we don't care about.
 */
const CYRILLIC_TO_CODE: Record<string, string> = {
  м: 'KeyV', ь: 'KeyM', а: 'KeyF', к: 'KeyR', е: 'KeyT', з: 'KeyP',
  с: 'KeyC', л: 'KeyK', я: 'KeyZ', п: 'KeyG', ф: 'KeyA', в: 'KeyD',
};
function physCode(e: KeyboardEvent): string {
  if (/^(Key[A-Z]|Digit\d)$/.test(e.code)) return e.code;
  return CYRILLIC_TO_CODE[e.key.toLowerCase()] ?? e.code;
}

/** Rename one layer in the tree, preserving structure and identity elsewhere. */
function renameInTree(layers: Layer[], id: string, name: string): Layer[] {
  return layers.map((l) =>
    l.id === id ? { ...l, name } : l.children.length ? { ...l, children: renameInTree(l.children, id, name) } : l,
  );
}

/** Next role in the обычный → эталон → косячный → обычный cycle. */
function nextFrameRole(role: Layer['props']['frameRole']): Layer['props']['frameRole'] {
  return role === undefined ? 'reference' : role === 'reference' ? 'flawed' : undefined;
}

/** Advance a frame layer's critique role (top-level only — that's all the canvas
 *  chrome exposes). Structure and identity elsewhere are preserved. */
function cycleFrameRoleInTree(layers: Layer[], id: string): Layer[] {
  return layers.map((l) =>
    l.id === id ? { ...l, props: { ...l.props, frameRole: nextFrameRole(l.props.frameRole) } } : l,
  );
}

/** Drop one layer (and its subtree) from the tree. */
function removeFromTree(layers: Layer[], id: string): Layer[] {
  const out: Layer[] = [];
  for (const l of layers) {
    if (l.id === id) continue;
    out.push(l.children.length ? { ...l, children: removeFromTree(l.children, id) } : l);
  }
  return out;
}

/** Drop position of a layer-panel drag: reorder as a sibling before / after the
 *  target, or nest as the target's last child. */
export type LayerDropPos = 'before' | 'after' | 'inside';

/** True when `id` is `layer` itself or anywhere in its subtree. */
function inSubtree(layer: Layer, id: string): boolean {
  return layer.id === id || layer.children.some((c) => inSubtree(c, id));
}

/** Insert `node` relative to `targetId`: as its previous / next sibling, or (for
 *  `inside`) appended as its last child. Returns null when the target is absent. */
function insertRelative(layers: Layer[], targetId: string, node: Layer, pos: LayerDropPos): Layer[] | null {
  let found = false;
  const walk = (list: Layer[]): Layer[] => {
    const out: Layer[] = [];
    for (const l of list) {
      if (l.id === targetId) {
        found = true;
        if (pos === 'inside') {
          out.push({ ...l, children: [...l.children, node] });
        } else if (pos === 'before') {
          out.push(node, l);
        } else {
          out.push(l, node);
        }
        continue;
      }
      out.push(l.children.length ? { ...l, children: walk(l.children) } : l);
    }
    return out;
  };
  const out = walk(layers);
  return found ? out : null;
}

/** Move `dragId` next to / inside `targetId`. Guards against dropping a node onto
 *  itself or into its own subtree; returns null when the move is invalid. */
function moveLayerInTree(layers: Layer[], dragId: string, targetId: string, pos: LayerDropPos): Layer[] | null {
  if (dragId === targetId) return null;
  const dragged = findLayer(layers, dragId);
  if (!dragged) return null;
  if (inSubtree(dragged, targetId)) return null; // can't nest a node inside itself
  return insertRelative(removeFromTree(layers, dragId), targetId, dragged, pos);
}

/**
 * Wrap the given ids into a new frame layer, but only when they are all direct
 * siblings under a single parent (Figma groups a selection at its common parent).
 * Returns the rewritten tree, or null when the selection spans different parents
 * so the caller can bail without mutating anything. The new frame takes the slot
 * of the first selected sibling; the wrapped layers keep their relative order.
 */
function groupSiblings(layers: Layer[], idSet: Set<string>, makeFrame: (hits: Layer[]) => Layer): Layer[] | null {
  const hits = layers.filter((l) => idSet.has(l.id));
  if (hits.length === idSet.size) {
    const firstIdx = layers.findIndex((l) => idSet.has(l.id));
    const frame = makeFrame(hits);
    const out: Layer[] = [];
    layers.forEach((l, i) => {
      if (i === firstIdx) out.push(frame);
      if (!idSet.has(l.id)) out.push(l);
    });
    return out;
  }
  // Not all here — descend, and rebuild only the branch that resolves them.
  let changed = false;
  const out = layers.map((l) => {
    if (!l.children.length) return l;
    const r = groupSiblings(l.children, idSet, makeFrame);
    if (r) {
      changed = true;
      return { ...l, children: r };
    }
    return l;
  });
  return changed ? out : null;
}

/**
 * Undo a group: find the frame `id` and splice its children into its slot in the
 * parent, dropping the frame itself. Returns the rewritten tree, or null when the
 * layer isn't found (so the caller can bail).
 */
function ungroupSiblings(layers: Layer[], id: string): Layer[] | null {
  const idx = layers.findIndex((l) => l.id === id);
  if (idx !== -1) {
    const out = [...layers];
    out.splice(idx, 1, ...layers[idx].children);
    return out;
  }
  let changed = false;
  const out = layers.map((l) => {
    if (!l.children.length) return l;
    const r = ungroupSiblings(l.children, id);
    if (r) {
      changed = true;
      return { ...l, children: r };
    }
    return l;
  });
  return changed ? out : null;
}

/** Rewrite one layer's box in the tree (structural copy along the touched path). */
function setBoxInTree(layers: Layer[], id: string, box: NonNullable<Layer['props']['box']>): Layer[] {
  return layers.map((l) =>
    l.id === id
      ? { ...l, props: { ...l.props, box } }
      : l.children.length
        ? { ...l, children: setBoxInTree(l.children, id, box) }
        : l,
  );
}

/** Rewrite one layer's corner radius in the tree (structural copy along the path).
 *  Keeps the properties panel in sync when a resize re-clamps the radius. */
function setRadiusInTree(layers: Layer[], id: string, radius: number): Layer[] {
  return layers.map((l) =>
    l.id === id
      ? { ...l, props: { ...l.props, radius } }
      : l.children.length
        ? { ...l, children: setRadiusInTree(l.children, id, radius) }
        : l,
  );
}

/** Paint a frame's background. A `<g>` frame has no fill of its own — its
 *  background is a full-bounds rect child (the parser adopts that rect's fill as
 *  the frame fill). To keep the panel and the canvas in sync we write the colour
 *  back to that same rect: prefer the frame's own `data-frame-bg` chrome rect
 *  (drawn frames — flip it from `fill="none"` to a real colour), else the first
 *  full-bounds painted child rect (imported frames). If neither exists, fall
 *  back to setting `fill` on the `<g>` itself. */
function setFrameFill(el: Element, v: string, box?: Layer['props']['box']): void {
  const rects = Array.from(el.querySelectorAll(':scope > rect')) as Element[];
  const bg = rects.find((r) => r.getAttribute('data-frame-bg'));
  const near = (a: number | undefined, b: number | undefined) =>
    a != null && b != null && Math.abs(a - b) <= 1;
  const spansFrame = (r: Element) =>
    box != null &&
    near(parseFloat(r.getAttribute('x') || ''), box.x) &&
    near(parseFloat(r.getAttribute('y') || ''), box.y) &&
    near(parseFloat(r.getAttribute('width') || ''), box.w) &&
    near(parseFloat(r.getAttribute('height') || ''), box.h);

  if (bg) {
    bg.setAttribute('fill', v);
    return;
  }
  const surface = rects.find((r) => {
    const f = r.getAttribute('fill');
    return f && f !== 'none' && spansFrame(r);
  });
  if (surface) surface.setAttribute('fill', v);
  else el.setAttribute('fill', v);
}

/** Rewrite one layer's `clip` flag in the tree (structural copy along the path). */
function setClipInTree(layers: Layer[], id: string, clip: boolean): Layer[] {
  return layers.map((l) =>
    l.id === id
      ? { ...l, props: { ...l.props, clip } }
      : l.children.length
        ? { ...l, children: setClipInTree(l.children, id, clip) }
        : l,
  );
}

/** Mark one layer as a real frame (vs a plain group) in the tree. */
function setFrameInTree(layers: Layer[], id: string): Layer[] {
  return layers.map((l) =>
    l.id === id
      ? { ...l, props: { ...l.props, frame: true } }
      : l.children.length
        ? { ...l, children: setFrameInTree(l.children, id) }
        : l,
  );
}

function findLayer(layers: Layer[], id: string): Layer | null {
  for (const l of layers) {
    if (l.id === id) return l;
    const hit = findLayer(l.children, id);
    if (hit) return hit;
  }
  return null;
}

function collectIds(layer: Layer, acc: Set<string>): void {
  acc.add(layer.id);
  for (const c of layer.children) collectIds(c, acc);
}

/** Deep-clone a layer subtree with fresh ids, recording old→new for SVG relabel.
 *  With `linkTwin`, each clone also gets `props.twinId` pointing at the layer it
 *  was cloned from — used when spawning a «сломанный» twin so the auto-diff pairs
 *  layers by identity (survives reordering) rather than by tree position. */
function cloneSubtree(layer: Layer, idMap: Map<string, string>, linkTwin = false): Layer {
  const nid = rid('L');
  idMap.set(layer.id, nid);
  return {
    ...layer,
    id: nid,
    props: linkTwin ? { ...layer.props, twinId: layer.id } : { ...layer.props },
    children: layer.children.map((c) => cloneSubtree(c, idMap, linkTwin)),
  };
}

/** Name for a pasted copy: «Блок» → «Блок копия» → «Блок копия 2» … so repeated
 *  pastes read cleanly instead of stacking «копия копия копия». */
function copyName(name: string): string {
  const m = name.match(/^(.*?) копия(?: (\d+))?$/);
  if (m) return `${m[1]} копия ${m[2] ? parseInt(m[2], 10) + 1 : 2}`;
  return `${name} копия`;
}

/** Immutably insert `layer` right after the sibling `afterId`, at whatever depth
 *  `afterId` lives — mirrors "duplicate lands next to the original" in the tree. */
function insertAfterInTree(layers: Layer[], afterId: string, layer: Layer): Layer[] {
  const i = layers.findIndex((l) => l.id === afterId);
  if (i !== -1) {
    const out = [...layers];
    out.splice(i + 1, 0, layer);
    return out;
  }
  return layers.map((l) => ({ ...l, children: insertAfterInTree(l.children, afterId, layer) }));
}

/** Index path from `root`'s subtree down to `id` ([] = root itself, null = absent). */
function pathTo(root: Layer, id: string): number[] | null {
  if (root.id === id) return [];
  for (let i = 0; i < root.children.length; i++) {
    const sub = pathTo(root.children[i], id);
    if (sub) return [i, ...sub];
  }
  return null;
}

/** Follow an index path from `root` (mirror lookup in the эталон twin). */
function atPath(root: Layer, path: number[]): Layer | null {
  let cur: Layer | undefined = root;
  for (const i of path) {
    cur = cur?.children[i];
    if (!cur) return null;
  }
  return cur ?? null;
}

const numDelta = (
  prop: DefectDelta['prop'],
  was: number | undefined,
  now: number | undefined,
  unit = '',
): DefectDelta | null =>
  was === now ? null : { prop, was: was == null ? '' : `${Math.round(was)}${unit}`, now: now == null ? '' : `${Math.round(now)}${unit}` };

const strDelta = (
  prop: DefectDelta['prop'],
  was: string | undefined,
  now: string | undefined,
): DefectDelta | null => ((was ?? '') === (now ?? '') ? null : { prop, was: was ?? '', now: now ?? '' });

/**
 * Diff a сломанный layer against its эталон twin, property by property. `was`
 * is the correct (reference) value, `now` the broken one. Only surfaces props
 * the parser actually captures — the teacher can add anything else by hand.
 */
function diffLayerProps(ref: Layer, bad: Layer): DefectDelta[] {
  const r = ref.props;
  const b = bad.props;
  const out: (DefectDelta | null)[] = [
    numDelta('fontSize', r.fontSize, b.fontSize, 'px'),
    strDelta('fontWeight', r.fontWeight, b.fontWeight),
    strDelta('color', r.color, b.color),
    strDelta('fill', r.fill, b.fill),
    numDelta('radius', r.radius, b.radius, 'px'),
    numDelta('opacity', r.opacity != null ? r.opacity : undefined, b.opacity != null ? b.opacity : undefined),
  ];
  if (r.box && b.box) {
    out.push(
      strDelta(
        'size',
        `${Math.round(r.box.w)}×${Math.round(r.box.h)}`,
        `${Math.round(b.box.w)}×${Math.round(b.box.h)}`,
      ),
      strDelta(
        'position',
        `${Math.round(r.box.x)}, ${Math.round(r.box.y)}`,
        `${Math.round(b.box.x)}, ${Math.round(b.box.y)}`,
      ),
    );
  }
  return out.filter((d): d is DefectDelta => d != null);
}

/** One layer inside a «сломанный» frame that differs from its эталон twin —
 *  the row model behind the «Отличия» panel. */
export interface DefectEntry {
  frameId: string;
  frameName: string;
  layerId: string;
  layerName: string;
  deltas: DefectDelta[];
}

/**
 * Scan every «сломанный» top-level frame and pair each of its descendant layers
 * to the эталон twin — by the explicit `twinId` link first (robust to
 * reordering), falling back to the mirrored index path against the first
 * reference frame for hand-built pairs. Returns only the layers that actually
 * differ, with their per-property deltas. This is the whole-frame counterpart to
 * `autoDeltas` (which diffs a single selected layer).
 */
function collectDefects(tops: Layer[]): DefectEntry[] {
  const refFrames = tops.filter((t) => t.props.frameRole === 'reference');
  if (!refFrames.length) return [];
  const out: DefectEntry[] = [];
  const walk = (frame: Layer, node: Layer) => {
    if (node !== frame) {
      let twin: Layer | null = null;
      if (node.props.twinId) {
        for (const rf of refFrames) {
          twin = findLayer(rf.children, node.props.twinId);
          if (twin) break;
        }
      }
      if (!twin) {
        const path = pathTo(frame, node.id);
        if (path) twin = atPath(refFrames[0], path);
      }
      if (twin) {
        const deltas = diffLayerProps(twin, node);
        if (deltas.length)
          out.push({ frameId: frame.id, frameName: frame.name, layerId: node.id, layerName: node.name, deltas });
      }
    }
    for (const c of node.children) walk(frame, c);
  };
  for (const f of tops) if (f.props.frameRole === 'flawed') walk(f, f);
  return out;
}

const EMPTY_DRAFT: EditorDraft = {
  title: '',
  kind: 'critique',
  brokenSvg: undefined,
  zones: [],
  access: 'PUBLIC',
  audience: '',
};

export function EditorCore() {
  const { t, tp } = useT();
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // The primary selection (last picked) drives the single-layer side panels.
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
  // Flat depth-first order of every layer id — the visual row order in the panel.
  // Kept in a ref so `select` (a stable callback) can read it without re-binding.
  const flatOrderRef = useRef<string[]>([]);
  // The last plain-clicked row — the anchor a Shift-range selection extends from.
  const anchorRef = useRef<string | null>(null);
  // Select a layer. `range` (Shift) selects every row between the anchor and this
  // one; `additive` (Cmd/Ctrl) toggles it within the current set; otherwise it
  // replaces the selection. null clears.
  const select = useCallback((id: string | null, additive = false, range = false) => {
    if (id == null) {
      anchorRef.current = null;
      setSelectedIds([]);
      return;
    }
    if (range) {
      const order = flatOrderRef.current;
      const anchor = anchorRef.current;
      const a = anchor ? order.indexOf(anchor) : -1;
      const b = order.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setSelectedIds(order.slice(lo, hi + 1));
        return; // keep the existing anchor so the range can be re-dragged
      }
      // No usable anchor — fall through to a plain pick.
      anchorRef.current = id;
      setSelectedIds([id]);
      return;
    }
    anchorRef.current = id;
    setSelectedIds((cur) => {
      if (!additive) return [id];
      return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    });
  }, []);
  // Replace (or, when `additive`, extend) the selection with a set of ids — the
  // marquee commits through here so a rubber-band picks the whole group at once.
  const selectMany = useCallback((ids: string[], additive = false) => {
    setSelectedIds((cur) => (additive ? Array.from(new Set([...cur, ...ids])) : ids));
  }, []);
  // Open the right-click menu. `layerId` null ⇒ empty canvas (whole-scene menu).
  // Right-clicking a layer outside the current selection reselects it solo first,
  // so the menu acts on what the user pointed at (Figma behaviour).
  const openMenu = useCallback(
    (e: React.MouseEvent, layerId: string | null) => {
      e.preventDefault();
      if (layerId) setSelectedIds((cur) => (cur.includes(layerId) ? cur : [layerId]));
      setMenu({ x: e.clientX, y: e.clientY, layerId });
    },
    [],
  );

  // Live-measured geometry of the primary selection, in root user space — the
  // accurate X/Y/W/H the inspector shows and edits (the tree `box` goes stale).
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Right-click menu — position + the layer clicked (null = empty canvas).
  const [menu, setMenu] = useState<{ x: number; y: number; layerId: string | null } | null>(null);
  // Row the menu asked to inline-rename; consumed by the matching LayerRow.
  const [renameId, setRenameId] = useState<string | null>(null);
  const clearRenameId = useCallback(() => setRenameId(null), []);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<EditorStep>(1);
  // Active canvas tool.
  const [tool, setTool] = useState<EditorTool>('move');
  // Scale mode (K): corner handles scale proportionally. Cleared by V / any other
  // tool. Only meaningful while `tool === 'move'`.
  const [scaleMode, setScaleMode] = useState(false);
  // Canvas (page) background colour — Figma surfaces this when nothing is
  // selected. null → themed default; a hex overrides the dotted canvas backdrop.
  const [canvasBg, setCanvasBg] = useState<string | null>(null);
  // Bumped to ask the canvas to refit the scene to the viewport.
  const [fitSignal, setFitSignal] = useState(0);
  const [draft, setDraft] = useState<EditorDraft>(EMPTY_DRAFT);
  const replaceRef = useRef<HTMLInputElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  // ── Local drafts (localStorage) ────────────────────────────────────────────
  // Each imported file is one draft the teacher can switch between / delete.
  // `activeDraftId` is the file currently open in the editor; null = the empty
  // "new file" state (Dropzone). Loaded lazily on mount so SSR stays clean.
  const [drafts, setDrafts] = useState<EditorDraftEntry[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  useEffect(() => setDrafts(listDrafts()), []);

  // ── Pages (within the open draft) ──────────────────────────────────────────
  // A draft is a set of pages (each its own canvas) plus optional dividers.
  // `items` is the panel-facing metadata list; the heavy per-page {result,draft}
  // payloads live in `pageDataRef` so switching pages doesn't churn every layer.
  // The active page's payload is mirrored live in `result`/`draft` so all the
  // canvas / layer / undo logic below keeps operating on a single screen.
  // `activePageId === null` ⇒ no draft open (the editor home / project grid).
  const [items, setItems] = useState<PageMeta[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [coverPageId, setCoverPageId] = useState<string | null>(null);
  const pageDataRef = useRef<Map<string, { result: ParseResult; draft: EditorDraft }>>(new Map());
  // Collapse state for the two left-panel sections (Figma-style chevrons).
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [layersCollapsed, setLayersCollapsed] = useState(false);
  // Bumped by the header "collapse all" control — folds every group in the tree.
  const [collapseSignal, setCollapseSignal] = useState(0);

  // ── Lessons (DB-backed) ────────────────────────────────────────────────────
  // The editor home is lessons-first: existing lessons show as cards, and the
  // primary action creates a lesson (optionally seeded with a Figma-submit task)
  // then hands off to the block constructor at /admin/lessons/[id].
  const router = useRouter();
  const [lessons, setLessons] = useState<
    { id: string; title: string; slug: string; blockCount: number; updatedAt: string }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/lessons')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => alive && Array.isArray(rows) && setLessons(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  /** Create a lesson (optionally with a starter Figma-link task) and open it. */
  const createLesson = useCallback(
    async (withFigma: boolean) => {
      setCreating(true);
      setLessonError(null);
      try {
        const res = await fetch('/api/admin/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Новый урок',
            slug: `urok-${Math.random().toString(36).slice(2, 8)}`,
            pathTitle: 'От преподавателя',
            skill: 'custom',
            difficulty: 'easy',
            estimatedMinutes: 10,
            objectives: [],
            prerequisites: [],
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setLessonError(data.message ?? t('editor.home.createFailed'));
          return;
        }
        if (withFigma) {
          await fetch(`/api/admin/lessons/${data.id}/blocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kind: 'exercise', payload: draftToPayload(emptyDraft('figma-link')) }),
          });
        }
        router.push(`/admin/lessons/${data.id}`);
      } catch {
        setLessonError(t('editor.home.createFailedNetwork'));
      } finally {
        setCreating(false);
      }
    },
    [router, t],
  );

  // ── Undo / redo ──────────────────────────────────────────────────────────
  // Snapshots capture the two mutable pieces of authoring state (the SVG markup
  // + the draft). Both are updated immutably everywhere, so a snapshot can hold
  // plain references. `latest` mirrors the committed state each render, so an
  // action calls `pushUndo()` first to bank the *pre-change* snapshot.
  type Snap = { svg: string; layers: Layer[]; draft: EditorDraft };
  const latest = useRef<Snap | null>(null);
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);

  const applySnap = useCallback((s: Snap) => {
    setResult((r) => (r ? { ...r, svg: s.svg, screen: { ...r.screen, layers: s.layers } } : r));
    setDraft(s.draft);
  }, []);
  const pushUndo = useCallback(() => {
    if (latest.current) {
      undoStack.current.push(latest.current);
      redoStack.current = [];
    }
  }, []);
  const performUndo = useCallback(() => {
    const cur = latest.current;
    if (!cur || !undoStack.current.length) return;
    redoStack.current.push(cur);
    applySnap(undoStack.current.pop()!);
  }, [applySnap]);
  const performRedo = useCallback(() => {
    const cur = latest.current;
    if (!cur || !redoStack.current.length) return;
    undoStack.current.push(cur);
    applySnap(redoStack.current.pop()!);
  }, [applySnap]);

  const byId = useMemo(() => (result ? indexLayers(result.screen.layers) : new Map<string, Layer>()), [result]);

  // Top-level frames get on-canvas chrome (name label + role icon). Only frames
  // at the root — nested groups keep to the layer tree.
  const frameChrome = useMemo(
    () =>
      (result?.screen.layers ?? [])
        .filter((l) => l.type === 'frame')
        .map((l) => ({ id: l.id, name: l.name, role: l.props.frameRole })),
    [result],
  );
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // Mirror the committed authoring state so undo can snapshot the pre-change value.
  latest.current = result ? { svg: result.svg, layers: result.screen.layers, draft } : null;

  // Keep the flat row order in sync so Shift-range selection maps ids → positions.
  flatOrderRef.current = (() => {
    const order: string[] = [];
    const walk = (ls: Layer[]) => {
      for (const l of ls) {
        order.push(l.id);
        if (l.children.length) walk(l.children);
      }
    };
    if (result) walk(result.screen.layers);
    return order;
  })();

  // Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo — but let native undo win inside inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || physCode(e) !== 'KeyZ') return;
      const ae = document.activeElement;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      e.preventDefault();
      if (e.shiftKey) performRedo();
      else performUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [performUndo, performRedo]);

  const zoneByLayer = useMemo(() => {
    const m = new Map<string, CritiqueZone>();
    for (const z of draft.zones) if (z.layerId) m.set(z.layerId, z);
    return m;
  }, [draft.zones]);
  const zoneIds = useMemo(() => new Set(zoneByLayer.keys()), [zoneByLayer]);

  // Top-level frames marked as эталон — the layers panel paints their whole
  // subtree green (matching the on-canvas BadgeCheck) and badges the frame row.
  const referenceIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of result?.screen.layers ?? [])
      if (l.props.frameRole === 'reference') s.add(l.id);
    return s;
  }, [result]);

  // Top-level frames marked as «сломанный» — the layers panel paints their whole
  // subtree red (matching the on-canvas Bug badge) and badges the frame row; the
  // canvas draws their selection chrome red too.
  const flawedIds = useMemo(() => {
    const s = new Set<string>();
    for (const l of result?.screen.layers ?? [])
      if (l.props.frameRole === 'flawed') s.add(l.id);
    return s;
  }, [result]);

  // Auto-diff the selected layer against its эталон twin: locate the top-level
  // frame it lives in, confirm that frame is «сломанный», find the sibling
  // reference frame, then pair the layer to its counterpart. Preference order:
  // (1) the explicit `twinId` link stamped when the сломанный twin was spawned —
  // robust to reordering/insert/delete; (2) fall back to mirroring the index
  // path for layers with no link (hand-built pairs, older drafts). Undefined
  // when there's no pairing (plain frame / no reference), so the editor hides the
  // «Из эталона» affordance; [] means «paired, identical». Declared with the
  // other hooks (before any early return) so hook order stays stable.
  const autoDeltas = useMemo<DefectDelta[] | undefined>(() => {
    if (!selected || !result) return undefined;
    const tops = result.screen.layers;
    const host = tops.find((t) => pathTo(t, selected.id));
    if (!host || host.props.frameRole !== 'flawed') return undefined;
    const ref = tops.find((t) => t.id !== host.id && t.props.frameRole === 'reference');
    if (!ref) return undefined;
    const twin =
      (selected.props.twinId ? findLayer(ref.children, selected.props.twinId) : null) ??
      atPath(ref, pathTo(host, selected.id)!);
    if (!twin) return [];
    return diffLayerProps(twin, selected);
  }, [selected, result]);

  // Every layer across all «сломанный» frames that differs from its эталон twin —
  // the data behind the bottom «Отличия» panel.
  const defects = useMemo<DefectEntry[]>(
    () => (result ? collectDefects(result.screen.layers) : []),
    [result],
  );
  // A reference↔flawed pair exists at all — so the panel is worth showing even
  // before any layer is broken (it prompts «сломай слой»).
  const hasFramePair = useMemo(
    () =>
      !!result &&
      result.screen.layers.some((l) => l.props.frameRole === 'reference') &&
      result.screen.layers.some((l) => l.props.frameRole === 'flawed'),
    [result],
  );

  const ingest = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseSvgToLayers(text);
    // A broken import doesn't open the editor — just surface the error on home.
    if (parsed.errors.length > 0 || parsed.screen.layers.length === 0) {
      setResult(parsed);
      setActiveDraftId(null);
      setActivePageId(null);
      setItems([]);
      return;
    }
    // Open a fresh draft seeded with one page holding the imported screen.
    const draftId = rid('draft');
    const pageId = rid('page');
    pageDataRef.current = new Map([[pageId, { result: parsed, draft: EMPTY_DRAFT }]]);
    setItems([{ id: pageId, kind: 'page', name: 'Страница 1' }]);
    setActivePageId(pageId);
    setCoverPageId(pageId);
    setActiveDraftId(draftId);
    setFileName(file.name);
    setResult(parsed);
    setDraft(EMPTY_DRAFT);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  // Persist the whole draft (every page) whenever the active page or structure
  // changes. The live active-page state is mirrored into the ref first, then the
  // ref supplies each page's payload for the serialised entry.
  useEffect(() => {
    if (!activeDraftId || activePageId == null || !result || result.errors.length > 0) return;
    pageDataRef.current.set(activePageId, { result, draft });
    const built: PageItem[] = items.map((m) =>
      m.kind === 'divider'
        ? { id: m.id, kind: 'divider', name: m.name }
        : {
            id: m.id,
            kind: 'page',
            name: m.name,
            ...(pageDataRef.current.get(m.id) ?? { result: blankResult(), draft: EMPTY_DRAFT }),
          },
    );
    setDrafts(saveDraft({ id: activeDraftId, fileName: fileName ?? 'screen.svg', items: built, activePageId, coverPageId, updatedAt: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, draft, items, activePageId, coverPageId, activeDraftId]);

  /** Open a saved draft: hydrate the page map, then load its active page live. */
  const loadDraft = useCallback((entry: EditorDraftEntry) => {
    const map = new Map<string, { result: ParseResult; draft: EditorDraft }>();
    for (const it of entry.items) if (it.kind === 'page') map.set(it.id, { result: it.result, draft: it.draft });
    pageDataRef.current = map;
    setItems(entry.items.map((i) => ({ id: i.id, kind: i.kind, name: i.name })));
    const active =
      entry.activePageId && map.has(entry.activePageId)
        ? entry.activePageId
        : entry.items.find((i) => i.kind === 'page')?.id ?? null;
    const data = active ? map.get(active) ?? null : null;
    setActivePageId(active);
    setCoverPageId(entry.coverPageId);
    setActiveDraftId(entry.id);
    setFileName(entry.fileName);
    setResult(data?.result ?? null);
    setDraft(data?.draft ?? EMPTY_DRAFT);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  /** Clear the editor to the empty "new file" state (import creates a draft). */
  const newFile = useCallback(() => {
    pageDataRef.current = new Map();
    setItems([]);
    setActivePageId(null);
    setCoverPageId(null);
    setResult(null);
    setFileName(null);
    setDraft(EMPTY_DRAFT);
    setActiveDraftId(null);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  // ── Page operations (Pages panel) ──────────────────────────────────────────
  /** Switch the live canvas to another page, stashing the current one first. */
  const switchPage = useCallback(
    (id: string) => {
      if (id === activePageId) return;
      if (activePageId && result) pageDataRef.current.set(activePageId, { result, draft });
      const data = pageDataRef.current.get(id);
      if (!data) return;
      setResult(data.result);
      setDraft(data.draft);
      setActivePageId(id);
      setSelectedIds([]);
      setHoveredId(null);
      setStep(1);
      undoStack.current = [];
      redoStack.current = [];
    },
    [activePageId, result, draft],
  );

  /** Add a blank page and switch to it (a fresh artboard to draw a header on). */
  const addPage = useCallback(() => {
    const id = rid('page');
    const res = blankResult();
    if (activePageId && result) pageDataRef.current.set(activePageId, { result, draft });
    pageDataRef.current.set(id, { result: res, draft: EMPTY_DRAFT });
    setItems((prev) => [...prev, { id, kind: 'page', name: `Страница ${prev.filter((i) => i.kind === 'page').length + 1}` }]);
    setActivePageId(id);
    setResult(res);
    setDraft(EMPTY_DRAFT);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    undoStack.current = [];
    redoStack.current = [];
  }, [activePageId, result, draft]);

  /** Append a divider row (a labelled separator between page groups). */
  const addDivider = useCallback(() => {
    setItems((prev) => [...prev, { id: rid('div'), kind: 'divider', name: 'Раздел' }]);
  }, []);

  /** Rename a page or divider in the panel. */
  const renameItem = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, name: trimmed } : i)));
  }, []);

  /** Mark a page as the draft's Title/cover (its render becomes the thumbnail). */
  const setCover = useCallback((id: string) => setCoverPageId(id), []);

  /** Remove a page or divider; falls back to a sibling page (or home) if active. */
  const removeItem = useCallback(
    (id: string) => {
      const next = items.filter((i) => i.id !== id);
      pageDataRef.current.delete(id);
      setItems(next);
      if (coverPageId === id) setCoverPageId(next.find((i) => i.kind === 'page')?.id ?? null);
      if (activePageId === id) {
        const fallback = next.find((i) => i.kind === 'page');
        const data = fallback ? pageDataRef.current.get(fallback.id) : null;
        if (fallback && data) {
          setResult(data.result);
          setDraft(data.draft);
          setActivePageId(fallback.id);
          setSelectedIds([]);
          setHoveredId(null);
          setStep(1);
          undoStack.current = [];
          redoStack.current = [];
        } else {
          // Deleted the last page — drop back to the project grid.
          setActivePageId(null);
          setResult(null);
          setActiveDraftId(null);
        }
      }
    },
    [items, activePageId, coverPageId],
  );

  /** Delete a draft; if it was open, fall back to the empty state. */
  const removeDraft = useCallback(
    (id: string) => {
      const next = deleteDraft(id);
      setDrafts(next);
      if (id === activeDraftId) newFile();
    },
    [activeDraftId, newFile],
  );

  // Mutate the source markup for one layer, then re-emit. `data-layer-id` is
  // preserved, so selection and geometry survive the round-trip.
  const mutate = useCallback((id: string, fn: (el: Element) => void) => {
    pushUndo();
    setResult((r) => {
      if (!r) return r;
      const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
      const el = doc.querySelector(`[data-layer-id="${id}"]`);
      if (!el) return r;
      fn(el);
      return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement) };
    });
  }, [pushUndo]);

  // Resize the artboard frame (the white canvas): stretch its full-cover rect,
  // the root <svg> (width/height/viewBox) and the screen dimensions together, so
  // the teacher can pick any frame size Figma-style. Only offered for the frame
  // that spans the whole canvas — nested groups keep their derived geometry.
  const resizeFrame = useCallback(
    (id: string, w: number, h: number) => {
      if (!(w > 0 && h > 0)) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        if (el.tagName.toLowerCase() === 'rect') {
          el.setAttribute('width', String(w));
          el.setAttribute('height', String(h));
        }
        const svg = doc.documentElement;
        svg.setAttribute('width', String(w));
        svg.setAttribute('height', String(h));
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(svg),
          screen: { ...r.screen, width: w, height: h, layers: setBoxInTree(r.screen.layers, id, { x: 0, y: 0, w, h }) },
        };
      });
    },
    [pushUndo],
  );

  // Commit a frame-border resize from the canvas: set the frame's bg + clip rect
  // to the new local box and refresh its tree box. Children are left as-is (the
  // canvas already resized the rects live) — only their clipping changes.
  const resizeFrameBox = useCallback(
    (id: string, box: { x: number; y: number; w: number; h: number }) => {
      if (!(box.w > 0 && box.h > 0)) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        for (const rect of el.querySelectorAll(':scope > rect[data-frame-bg], :scope > clipPath > rect')) {
          rect.setAttribute('x', String(box.x));
          rect.setAttribute('y', String(box.y));
          rect.setAttribute('width', String(box.w));
          rect.setAttribute('height', String(box.h));
        }
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: setBoxInTree(r.screen.layers, id, box) },
        };
      });
    },
    [pushUndo],
  );

  // Commit a plain-rect resize from the canvas: write the new box onto the rect's
  // x/y/width/height and refresh its tree box. The corner radius stays ABSOLUTE
  // rather than being stretched by a matrix scale (Figma's rect-resize behaviour);
  // `radius` re-clamps it so rx == ry (min(w,h)/2 cap), keeping corners circular —
  // a shrunk rect reads as a stadium/circle, never an ellipse. The canvas already
  // resized the rect live; this mirrors it into the committed markup + tree.
  const resizeRect = useCallback(
    (id: string, box: { x: number; y: number; w: number; h: number }, radius?: number) => {
      if (!(box.w > 0 && box.h > 0)) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el || el.tagName.toLowerCase() !== 'rect') return r;
        el.setAttribute('x', String(box.x));
        el.setAttribute('y', String(box.y));
        el.setAttribute('width', String(box.w));
        el.setAttribute('height', String(box.h));
        if (radius != null) {
          el.setAttribute('rx', String(radius));
          el.setAttribute('ry', String(radius));
        }
        const boxed = setBoxInTree(r.screen.layers, id, box);
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: {
            ...r.screen,
            layers: radius != null ? setRadiusInTree(boxed, id, radius) : boxed,
          },
        };
      });
    },
    [pushUndo],
  );

  // Toggle "clip content" on a frame/group (Figma's clip-content). ON: wrap the
  // node in a clip-path sized to its CURRENT rendered bounds (measured live via
  // getBBox, so it respects the node's own transform), so anything overflowing
  // those bounds is hidden and the frame can be shrunk without scaling children.
  // OFF: drop the clip-path and its def. The clip rect stays fixed while children
  // move/resize — exactly the "уменьшаю рамку, лишнее скрыто" behaviour.
  const toggleClip = useCallback(
    (id: string, on: boolean) => {
      // Measure the live bbox BEFORE mutating (only needed when enabling).
      let bbox: { x: number; y: number; w: number; h: number } | null = null;
      if (on) {
        const host = svgHostRef.current;
        const live = host?.querySelector(`[data-layer-id="${id}"]`) as SVGGraphicsElement | null;
        if (live && typeof live.getBBox === 'function') {
          try {
            const b = live.getBBox();
            bbox = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
          } catch {
            /* getBBox throws for un-rendered nodes — leave bbox null, bail below. */
          }
        }
        if (!bbox || bbox.w <= 0 || bbox.h <= 0) return; // nothing to clip to
      }
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        const clipId = `fc-${id}`;
        // Clear any existing clip we own — attr + def (whether it sits inline or in <defs>).
        el.removeAttribute('clip-path');
        doc.querySelectorAll(`clipPath[id="${clipId}"]`).forEach((n) => n.remove());
        if (on && bbox) {
          const ns = 'http://www.w3.org/2000/svg';
          const clip = doc.createElementNS(ns, 'clipPath');
          clip.setAttribute('id', clipId);
          clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
          const rect = doc.createElementNS(ns, 'rect');
          rect.setAttribute('x', String(bbox.x));
          rect.setAttribute('y', String(bbox.y));
          rect.setAttribute('width', String(bbox.w));
          rect.setAttribute('height', String(bbox.h));
          clip.appendChild(rect);
          el.insertBefore(clip, el.firstChild);
          el.setAttribute('clip-path', `url(#${clipId})`);
        }
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: setClipInTree(r.screen.layers, id, on) },
        };
      });
    },
    [pushUndo],
  );

  // Convert a plain group into a real frame: give it its own bounds by marking it
  // `data-frame` and clipping it to its current extent. Afterwards its resize
  // handles move the frame border (see resizeFrameBox) instead of scaling the
  // children — the Figma "group → frame" distinction. Reuses the clip machinery.
  const framifyGroup = useCallback(
    (id: string) => {
      let bbox: { x: number; y: number; w: number; h: number } | null = null;
      const host = svgHostRef.current;
      const live = host?.querySelector(`[data-layer-id="${id}"]`) as SVGGraphicsElement | null;
      if (live && typeof live.getBBox === 'function') {
        try {
          const b = live.getBBox();
          bbox = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
        } catch {
          /* un-rendered node — bail */
        }
      }
      if (!bbox || bbox.w <= 0 || bbox.h <= 0) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        const clipId = `fc-${id}`;
        el.setAttribute('data-frame', '1');
        el.removeAttribute('clip-path');
        doc.querySelectorAll(`clipPath[id="${clipId}"]`).forEach((n) => n.remove());
        const ns = 'http://www.w3.org/2000/svg';
        const clip = doc.createElementNS(ns, 'clipPath');
        clip.setAttribute('id', clipId);
        clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
        const rect = doc.createElementNS(ns, 'rect');
        rect.setAttribute('x', String(bbox.x));
        rect.setAttribute('y', String(bbox.y));
        rect.setAttribute('width', String(bbox.w));
        rect.setAttribute('height', String(bbox.h));
        clip.appendChild(rect);
        el.insertBefore(clip, el.firstChild);
        el.setAttribute('clip-path', `url(#${clipId})`);
        // Give the group its own bounds rect — the marker every other subsystem
        // (frameParentAt drop-targeting, frame chrome, resize) uses to tell a real
        // frame from a plain group. Without it the framified group snaps to nothing
        // and reads as a group again. `fill="none"` so it never paints over the
        // existing content; it exists purely for its geometry.
        el.querySelectorAll(':scope > rect[data-frame-bg]').forEach((n) => n.remove());
        const bg = doc.createElementNS(ns, 'rect');
        bg.setAttribute('x', String(bbox.x));
        bg.setAttribute('y', String(bbox.y));
        bg.setAttribute('width', String(bbox.w));
        bg.setAttribute('height', String(bbox.h));
        bg.setAttribute('fill', 'none');
        bg.setAttribute('data-frame-bg', '1');
        // Behind the content (first graphical child), after the clipPath def.
        el.insertBefore(bg, clip.nextSibling);
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: setFrameInTree(setClipInTree(setBoxInTree(r.screen.layers, id, bbox), id, true), id) },
        };
      });
    },
    [pushUndo],
  );

  // Shift one or more layers by (dx,dy) in a single markup pass, so a multi-
  // selection move is one undo step and one re-serialize — not one per layer.
  const moveLayers = useCallback(
    (ids: string[], dx: number, dy: number) => {
      if (!ids.length) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        let touched = false;
        for (const id of ids) {
          const el = doc.querySelector(`[data-layer-id="${id}"]`);
          if (!el) continue;
          const prev = el.getAttribute('transform') ?? '';
          el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) ${prev}`.trim());
          touched = true;
        }
        if (!touched) return r;
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement) };
      });
    },
    [pushUndo],
  );

  // Prepend a `matrix(...)` (content/root space) to each selected layer — the
  // commit for a resize or rotate handle drag. Mirrors moveLayers: one markup
  // pass, one undo step. Geometry metadata (`box`) is left stale on purpose —
  // highlights re-measure from the DOM, so the canvas stays correct.
  const transformLayers = useCallback(
    (ids: string[], matrix: string) => {
      if (!ids.length || !matrix) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        let touched = false;
        for (const id of ids) {
          const el = doc.querySelector(`[data-layer-id="${id}"]`);
          if (!el) continue;
          const prev = el.getAttribute('transform') ?? '';
          el.setAttribute('transform', `${matrix} ${prev}`.trim());
          touched = true;
        }
        if (!touched) return r;
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement) };
      });
    },
    [pushUndo],
  );

  // Commit a corner-radius handle drag: write rx/ry on the rect and mirror the
  // value into the layer tree so the properties panel stays in sync.
  const setLayerRadius = useCallback(
    (id: string, value: number) => {
      const v = Math.max(0, Math.round(value));
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        // A plain rect rounds itself; a frame <g> has no radius of its own, so round
        // its bg rect (visible corner) and clip rect (so children clip to the round).
        const targets = el.tagName.toLowerCase() === 'rect'
          ? [el]
          : Array.from(el.querySelectorAll(':scope > rect[data-frame-bg], :scope > clipPath > rect'));
        if (!targets.length) return r;
        for (const t of targets) {
          t.setAttribute('rx', String(v));
          t.setAttribute('ry', String(v));
        }
        const patch = (ls: Layer[]): Layer[] =>
          ls.map((l) => (l.id === id ? { ...l, props: { ...l.props, radius: v } } : { ...l, children: patch(l.children) }));
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: patch(r.screen.layers) },
        };
      });
    },
    [pushUndo],
  );

  // ── Generic layer-prop edit ────────────────────────────────────────────────
  // Mutate one layer's SVG element and mirror a props patch into the tree in a
  // single undo step, so the inspector value updates live. Used by opacity /
  // stroke / auto-layout edits that don't need bespoke geometry handling.
  const editLayer = useCallback(
    (id: string, mutateEl: (el: Element) => void, patchProps: (p: Layer['props']) => Partial<Layer['props']>) => {
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!el) return r;
        mutateEl(el);
        const patch = (ls: Layer[]): Layer[] =>
          ls.map((l) => (l.id === id ? { ...l, props: { ...l.props, ...patchProps(l.props) } } : { ...l, children: patch(l.children) }));
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: patch(r.screen.layers) },
        };
      });
    },
    [pushUndo],
  );

  const setLayerOpacity = useCallback(
    (id: string, value: number) => {
      const o = Math.max(0, Math.min(1, value));
      editLayer(
        id,
        (el) => (o >= 1 ? el.removeAttribute('opacity') : el.setAttribute('opacity', String(+o.toFixed(3)))),
        () => ({ opacity: o >= 1 ? undefined : +o.toFixed(3) }),
      );
    },
    [editLayer],
  );

  const setLayerStroke = useCallback(
    (id: string, color: string | null) => {
      if (color === null) {
        editLayer(
          id,
          (el) => {
            el.removeAttribute('stroke');
            el.removeAttribute('stroke-width');
          },
          () => ({ stroke: undefined, strokeWidth: undefined }),
        );
        return;
      }
      editLayer(
        id,
        (el) => {
          el.setAttribute('stroke', color);
          if (!el.getAttribute('stroke-width')) el.setAttribute('stroke-width', '1');
        },
        (p) => ({ stroke: color, strokeWidth: p.strokeWidth ?? 1 }),
      );
    },
    [editLayer],
  );

  const setLayerStrokeWidth = useCallback(
    (id: string, width: number) => {
      const w = Math.max(0, width);
      editLayer(id, (el) => el.setAttribute('stroke-width', String(w)), () => ({ strokeWidth: w }));
    },
    [editLayer],
  );

  // Switch a frame's auto-layout flow (metadata only — `data-layout` drives the
  // parser's re-inference; the canvas geometry is unchanged).
  const setLayerLayout = useCallback(
    (id: string, layout: 'row' | 'column' | 'grid' | 'none') => {
      editLayer(
        id,
        (el) => (layout === 'none' ? el.removeAttribute('data-layout') : el.setAttribute('data-layout', layout)),
        () => ({ layout }),
      );
    },
    [editLayer],
  );

  // ── Live geometry (position / size) ────────────────────────────────────────
  // Measure the selected layer's box in ROOT (screen) user space, live from the
  // rendered DOM — the source of truth for geometry (tree `box` goes stale after
  // transforms). Frames measure their bounds rect; other layers their own bbox.
  const measureLayerBox = useCallback((id: string): { x: number; y: number; w: number; h: number } | null => {
    const host = svgHostRef.current;
    const node = host?.querySelector(`[data-layer-id="${id}"]`) as SVGGraphicsElement | null;
    if (!node) return null;
    const target = (node.querySelector(':scope > rect[data-frame-bg]') as SVGGraphicsElement | null) ?? node;
    try {
      const bb = target.getBBox();
      const ctm = target.getCTM();
      if (!ctm) return null;
      const corners = [
        [bb.x, bb.y],
        [bb.x + bb.width, bb.y],
        [bb.x, bb.y + bb.height],
        [bb.x + bb.width, bb.y + bb.height],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(ctm));
      const xs = corners.map((p) => p.x);
      const ys = corners.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x: +x.toFixed(2), y: +y.toFixed(2), w: +(Math.max(...xs) - x).toFixed(2), h: +(Math.max(...ys) - y).toFixed(2) };
    } catch {
      return null;
    }
  }, []);

  const parentCTM = useCallback((id: string): DOMMatrix | null => {
    const host = svgHostRef.current;
    const node = host?.querySelector(`[data-layer-id="${id}"]`);
    const parent = node?.parentNode as (SVGGraphicsElement & { getCTM?: () => DOMMatrix | null }) | null;
    try {
      return parent && typeof parent.getCTM === 'function' ? parent.getCTM() : null;
    } catch {
      return null;
    }
  }, []);

  // Move the selected layer so its top-left lands at root-space (x, y). The delta
  // is converted into the layer's PARENT space (via the parent CTM) before being
  // prepended, so it works under nested/transformed groups too.
  const moveLayerTo = useCallback(
    (id: string, x: number, y: number) => {
      const box = measureLayerBox(id);
      if (!box) return;
      const dxRoot = x - box.x;
      const dyRoot = y - box.y;
      const P = parentCTM(id);
      let pdx = dxRoot;
      let pdy = dyRoot;
      if (P) {
        const inv = P.inverse();
        pdx = inv.a * dxRoot + inv.c * dyRoot;
        pdy = inv.b * dxRoot + inv.d * dyRoot;
      }
      if (Math.abs(pdx) < 0.01 && Math.abs(pdy) < 0.01) return;
      transformLayers([id], `matrix(1 0 0 1 ${pdx.toFixed(3)} ${pdy.toFixed(3)})`);
    },
    [measureLayerBox, parentCTM, transformLayers],
  );

  // Resize the selected layer to (w, h) root-space units by scaling from its
  // top-left corner. The scale is expressed in parent space so nested transforms
  // are respected. (Scales children too — matches Figma group resize.)
  const resizeLayerTo = useCallback(
    (id: string, w: number, h: number) => {
      if (!(w > 0 && h > 0)) return;
      const box = measureLayerBox(id);
      if (!box || box.w <= 0 || box.h <= 0) return;
      const sx = w / box.w;
      const sy = h / box.h;
      if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) return;
      const Mroot = new DOMMatrix().translateSelf(box.x, box.y).scaleSelf(sx, sy).translateSelf(-box.x, -box.y);
      const P = parentCTM(id);
      const M = P ? P.inverse().multiply(Mroot).multiply(P) : Mroot;
      transformLayers([id], `matrix(${M.a} ${M.b} ${M.c} ${M.d} ${M.e} ${M.f})`);
    },
    [measureLayerBox, parentCTM, transformLayers],
  );

  // Align the selected layer within the artboard (screen bounds). Figma aligns to
  // the parent/selection; for a single layer the canvas is the sensible frame.
  const alignLayer = useCallback(
    (edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
      if (!selectedId || !result) return;
      const box = measureLayerBox(selectedId);
      if (!box) return;
      const W = result.screen.width;
      const H = result.screen.height;
      if (edge === 'left') moveLayerTo(selectedId, 0, box.y);
      else if (edge === 'hcenter') moveLayerTo(selectedId, (W - box.w) / 2, box.y);
      else if (edge === 'right') moveLayerTo(selectedId, W - box.w, box.y);
      else if (edge === 'top') moveLayerTo(selectedId, box.x, 0);
      else if (edge === 'vcenter') moveLayerTo(selectedId, box.x, (H - box.h) / 2);
      else if (edge === 'bottom') moveLayerTo(selectedId, box.x, H - box.h);
    },
    [selectedId, result, measureLayerBox, moveLayerTo],
  );

  // Re-measure the selection's live box whenever the pick or the markup changes
  // (a transform commit re-serialises `svg`, so this re-runs and re-syncs X/Y/W/H).
  useEffect(() => {
    if (!selectedId) {
      setSelBox(null);
      return;
    }
    const raf = requestAnimationFrame(() => setSelBox(measureLayerBox(selectedId)));
    return () => cancelAnimationFrame(raf);
  }, [selectedId, result?.svg, measureLayerBox]);

  // Rename a layer: persist to the source markup (`data-name`) so it survives a
  // re-serialize, and mirror it in the layer tree the panel renders from.
  const renameLayer = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        if (el) el.setAttribute('data-name', trimmed);
        return {
          ...r,
          svg: el ? new XMLSerializer().serializeToString(doc.documentElement) : r.svg,
          screen: { ...r.screen, layers: renameInTree(r.screen.layers, id, trimmed) },
        };
      });
    },
    [pushUndo],
  );

  // Cycle a top-level frame's critique role (обычный → эталон → косячный). Role
  // is pure metadata (no SVG mutation), so this only touches the layer tree.
  const cycleFrameRole = useCallback(
    (id: string) => {
      pushUndo();
      setResult((r) =>
        r ? { ...r, screen: { ...r.screen, layers: cycleFrameRoleInTree(r.screen.layers, id) } } : r,
      );
    },
    [pushUndo],
  );

  // Delete a layer (and its subtree) from both the markup and the tree, drop any
  // critique zones that pointed at removed layers, and clear a stale selection.
  const deleteLayer = useCallback(
    (id: string) => {
      const found = latest.current ? findLayer(latest.current.layers, id) : null;
      if (!found) return;
      const removed = new Set<string>();
      collectIds(found, removed);
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const el = doc.querySelector(`[data-layer-id="${id}"]`);
        el?.remove();
        return {
          ...r,
          svg: el ? new XMLSerializer().serializeToString(doc.documentElement) : r.svg,
          screen: { ...r.screen, layers: removeFromTree(r.screen.layers, id) },
        };
      });
      setDraft((d) => ({ ...d, zones: d.zones.filter((z) => !z.layerId || !removed.has(z.layerId)) }));
      setSelectedIds((cur) => cur.filter((x) => !removed.has(x)));
    },
    [pushUndo],
  );

  // Wrap the selected layers into a new frame ("auto-layout" flow) or plain
  // group. Mirrors the change in both the source markup (a new <g> that adopts
  // the selected nodes) and the layer tree, then selects the new frame. Only
  // works when the selection is a set of siblings — otherwise it no-ops.
  const groupLayers = useCallback(
    (ids: string[], layout: 'row' | 'column' | 'none'): string | null => {
      const cur = latest.current;
      if (!cur || ids.length < 1) return null;
      const idSet = new Set(ids);
      const gid = rid('L');
      const name = layout === 'none' ? 'Группа' : 'Авто-макет';
      const grouped = groupSiblings(cur.layers, idSet, (hits) => ({
        id: gid,
        name,
        type: 'frame',
        // An explicit auto-layout is a real frame (own bounds/clip); a plain
        // group is not — matching Figma, where only frames clip content.
        props: layout === 'none' ? {} : { layout, frame: true },
        children: hits,
      }));
      if (!grouped) return null; // selection spans different parents — can't group

      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const els = ids
          .map((id) => doc.querySelector(`[data-layer-id="${id}"]`))
          .filter((e): e is Element => !!e);
        if (!els.length) return r;
        // Order the nodes as they sit in the document so the wrapped markup keeps
        // its paint order (earlier = behind), matching the tree order.
        els.sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        );
        const first = els[0];
        const parent = first.parentNode;
        if (!parent) return r;
        const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('data-layer-id', gid);
        g.setAttribute('data-name', name);
        if (layout !== 'none') {
          g.setAttribute('data-layout', layout);
          g.setAttribute('data-frame', '1'); // real frame → persists across reparse
        }
        parent.insertBefore(g, first);
        for (const el of els) g.appendChild(el);
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers: grouped } };
      });
      setSelectedIds([gid]);
      anchorRef.current = gid;
      return gid;
    },
    [pushUndo],
  );

  // Wrap a selection into a real frame in one step (right-click → "Преобразовать
  // во фрейм"). Groups the layers, then framifies the new group once it's in the
  // DOM (framify measures the live bbox). Falls back to a straight framify when
  // the target is already a plain group.
  const pendingFramifyRef = useRef<string | null>(null);
  const frameSelection = useCallback(
    (ids: string[]) => {
      const gid = groupLayers(ids, 'none');
      if (gid) pendingFramifyRef.current = gid;
    },
    [groupLayers],
  );
  useEffect(() => {
    const gid = pendingFramifyRef.current;
    if (!gid) return;
    pendingFramifyRef.current = null;
    // Wait for the freshly grouped <g> to render so getBBox can measure it.
    const raf = requestAnimationFrame(() => framifyGroup(gid));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Dissolve a group/frame: unwrap its <g> in the markup (move children out to
  // where the group sat, then drop the empty <g>) and splice the frame's children
  // into its slot in the tree. Selects the freed children.
  const ungroupLayers = useCallback(
    (id: string) => {
      const cur = latest.current;
      if (!cur) return;
      const frame = findLayer(cur.layers, id);
      if (!frame) return;
      const ungrouped = ungroupSiblings(cur.layers, id);
      if (!ungrouped) return;

      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const g = doc.querySelector(`[data-layer-id="${id}"]`);
        const parent = g?.parentNode;
        if (!g || !parent) return r;
        // Move each child out in order, just before the group, then remove it.
        while (g.firstChild) parent.insertBefore(g.firstChild, g);
        parent.removeChild(g);
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers: ungrouped } };
      });
      setSelectedIds(frame.children.map((c) => c.id));
    },
    [pushUndo],
  );

  // Layers-panel drag-and-drop: move `dragId` next to / inside `targetId`. Mirror
  // the tree edit into the markup so paint order (DOM position) tracks the tree —
  // `inside` appends the node as the group's last child (front-most), before/after
  // reorders it among the target's siblings. Guarded against nesting a node in its
  // own subtree by moveLayerInTree.
  const reparentLayer = useCallback(
    (dragId: string, targetId: string, pos: LayerDropPos, copy = false) => {
      const cur = latest.current;
      if (!cur) return;

      // Alt-drop in the tree: clone the dragged subtree with fresh ids and drop
      // the copy at the target — the original stays where it was, mirroring the
      // canvas Alt-drag. A plain drop just moves the existing node.
      if (copy) {
        const src = findLayer(cur.layers, dragId);
        if (!src) return;
        const idMap = new Map<string, string>();
        const clone = cloneSubtree(src, idMap);
        const layers = insertRelative(cur.layers, targetId, clone, pos);
        if (!layers) return;
        pushUndo();
        setResult((r) => {
          if (!r) return r;
          const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
          const srcEl = doc.querySelector(`[data-layer-id="${dragId}"]`);
          const targetEl = doc.querySelector(`[data-layer-id="${targetId}"]`);
          if (!srcEl || !targetEl) return r;
          const el = srcEl.cloneNode(true) as Element;
          const relabel = (node: Element) => {
            const old = node.getAttribute('data-layer-id');
            if (old && idMap.has(old)) node.setAttribute('data-layer-id', idMap.get(old)!);
            for (const child of Array.from(node.children)) relabel(child);
          };
          relabel(el);
          if (pos === 'inside') {
            targetEl.appendChild(el);
          } else {
            const parent = targetEl.parentNode;
            if (!parent) return r;
            parent.insertBefore(el, pos === 'before' ? targetEl : targetEl.nextSibling);
          }
          return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers } };
        });
        setSelectedIds([clone.id]);
        anchorRef.current = clone.id;
        return;
      }

      const moved = moveLayerInTree(cur.layers, dragId, targetId, pos);
      if (!moved) return;

      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const dragEl = doc.querySelector(`[data-layer-id="${dragId}"]`);
        const targetEl = doc.querySelector(`[data-layer-id="${targetId}"]`);
        if (!dragEl || !targetEl) return r;
        if (pos === 'inside') {
          targetEl.appendChild(dragEl);
        } else {
          const parent = targetEl.parentNode;
          if (!parent) return r;
          parent.insertBefore(dragEl, pos === 'before' ? targetEl : targetEl.nextSibling);
        }
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers: moved } };
      });
      setSelectedIds([dragId]);
      anchorRef.current = dragId;
    },
    [pushUndo],
  );

  // Duplicate a top-level frame as its «сломанный» twin: clone the subtree with
  // fresh ids (so both frames coexist and the auto-diff can pair layers by index
  // path), relabel the cloned SVG node, shift it to the right, mark the original
  // as эталон and the copy as сломанный. This is the «копирую рядом» step the
  // whole per-property diff flow hangs on.
  const duplicateAsFlawed = useCallback(
    (id: string) => {
      const cur = latest.current;
      if (!cur) return;
      const idx = cur.layers.findIndex((l) => l.id === id);
      if (idx === -1) return; // top-level frames only
      const frame = cur.layers[idx];
      if (frame.type !== 'frame') return;

      const idMap = new Map<string, string>();
      const clone = cloneSubtree(frame, idMap, true);
      // The frame itself pairs to the эталон by role, not by twinId — clear the
      // link the clone helper stamped on the root so only inner layers carry it.
      delete clone.props.twinId;
      clone.name = `${frame.name} · сломанный`;
      clone.props = { ...clone.props, frameRole: 'flawed' };

      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const dx = Math.round((frame.props.box?.w ?? r.screen.width ?? 375) + 48);
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const orig = doc.querySelector(`[data-layer-id="${id}"]`);
        if (!orig) return r;
        const el = orig.cloneNode(true) as Element;
        // Rewrite every data-layer-id inside the clone to its fresh id.
        const relabel = (node: Element) => {
          const old = node.getAttribute('data-layer-id');
          if (old && idMap.has(old)) node.setAttribute('data-layer-id', idMap.get(old)!);
          for (const child of Array.from(node.children)) relabel(child);
        };
        relabel(el);
        const prev = el.getAttribute('transform') ?? '';
        el.setAttribute('transform', `translate(${dx},0) ${prev}`.trim());
        orig.parentNode?.insertBefore(el, orig.nextSibling);
        const layers = [...r.screen.layers];
        // Mark the original as the эталон so the pair is complete out of the box.
        layers[idx] = { ...frame, props: { ...frame.props, frameRole: 'reference' } };
        layers.splice(idx + 1, 0, clone);
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers },
        };
      });
      setSelectedIds([clone.id]);
    },
    [pushUndo],
  );

  // Clone one or more layers (any depth), relabel their SVG ids, offset the copies
  // by (dx,dy) user units, drop each next to its original in both the markup and
  // the tree, and select the copies. Powers Alt-drag duplicate, Cmd/Ctrl+D and
  // paste. Returns the new ids.
  const duplicateLayers = useCallback(
    (ids: string[], dx = 0, dy = 0): string[] => {
      const cur = latest.current;
      if (!cur || !ids.length) return [];
      // Plan the clones off the current tree so we know the fresh ids up front
      // (setResult runs deferred — we need the ids now to update the selection).
      const plans: { srcId: string; clone: Layer; idMap: Map<string, string> }[] = [];
      for (const id of ids) {
        const layer = findLayer(cur.layers, id);
        if (!layer) continue;
        const idMap = new Map<string, string>();
        plans.push({ srcId: id, clone: cloneSubtree(layer, idMap), idMap });
      }
      if (!plans.length) return [];
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        let layers = r.screen.layers;
        for (const { srcId, clone, idMap } of plans) {
          const orig = doc.querySelector(`[data-layer-id="${srcId}"]`);
          if (!orig) continue;
          const el = orig.cloneNode(true) as Element;
          const relabel = (node: Element) => {
            const old = node.getAttribute('data-layer-id');
            if (old && idMap.has(old)) node.setAttribute('data-layer-id', idMap.get(old)!);
            for (const child of Array.from(node.children)) relabel(child);
          };
          relabel(el);
          if (dx || dy) {
            const prev = el.getAttribute('transform') ?? '';
            el.setAttribute('transform', `translate(${dx.toFixed(2)},${dy.toFixed(2)}) ${prev}`.trim());
          }
          orig.parentNode?.insertBefore(el, orig.nextSibling);
          layers = insertAfterInTree(layers, srcId, clone);
        }
        return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers } };
      });
      const newIds = plans.map((p) => p.clone.id);
      setSelectedIds(newIds);
      return newIds;
    },
    [pushUndo],
  );

  // Alt-drag drop from the canvas: leave the originals put and stamp a copy at the
  // dragged offset (StageCanvas has already snapped the live nodes back to base).
  const duplicateLayersAt = useCallback(
    (ids: string[], dx: number, dy: number) => {
      duplicateLayers(ids, dx, dy);
    },
    [duplicateLayers],
  );

  // Cmd/Ctrl+D — duplicate the selection in place, nudged down-right like Figma.
  const duplicateSelection = useCallback(() => {
    if (selectedIds.length) duplicateLayers(selectedIds, 10, 10);
  }, [selectedIds, duplicateLayers]);

  // Internal copy/paste clipboard — snapshots each copied layer's markup and tree
  // node at copy time, so paste survives even if the original is later moved or
  // removed. Not the OS clipboard (we only shuttle layers within the editor).
  const clipboard = useRef<{ markup: string; layer: Layer }[]>([]);

  const copySelection = useCallback(() => {
    const cur = latest.current;
    if (!cur || !selectedIds.length) return;
    const doc = new DOMParser().parseFromString(cur.svg, 'image/svg+xml');
    const items: { markup: string; layer: Layer }[] = [];
    for (const id of selectedIds) {
      const layer = findLayer(cur.layers, id);
      const el = doc.querySelector(`[data-layer-id="${id}"]`);
      if (layer && el) items.push({ markup: new XMLSerializer().serializeToString(el), layer });
    }
    if (items.length) clipboard.current = items;
  }, [selectedIds]);

  const pasteClipboard = useCallback(() => {
    const items = clipboard.current;
    if (!items.length) return;
    // The pasted copies land right below the selected layer (like Figma); fall
    // back to appending at the end when nothing is selected.
    const anchorId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
    // Re-clone from the snapshot with fresh ids every paste, so repeated pastes
    // don't collide and each copy is independent. The top-level node is renamed
    // «… копия» so the copy is distinguishable in the tree.
    const plans = items.map(({ markup, layer }) => {
      const idMap = new Map<string, string>();
      const clone = cloneSubtree(layer, idMap);
      clone.name = copyName(layer.name);
      return { markup, clone, idMap };
    });
    pushUndo();
    setResult((r) => {
      if (!r) return r;
      const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
      let layers = r.screen.layers;
      // Moving anchors so multiple pasted layers stack in order below the target.
      let curAnchorId = anchorId;
      let anchorEl = anchorId ? doc.querySelector(`[data-layer-id="${anchorId}"]`) : null;
      for (const { markup, clone, idMap } of plans) {
        const frag = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
        const el = doc.importNode(frag, true) as Element;
        const relabel = (node: Element) => {
          const old = node.getAttribute('data-layer-id');
          if (old && idMap.has(old)) node.setAttribute('data-layer-id', idMap.get(old)!);
          for (const child of Array.from(node.children)) relabel(child);
        };
        relabel(el);
        const prev = el.getAttribute('transform') ?? '';
        el.setAttribute('transform', `translate(20,20) ${prev}`.trim());
        if (anchorEl?.parentNode) {
          anchorEl.parentNode.insertBefore(el, anchorEl.nextSibling);
          layers = insertAfterInTree(layers, curAnchorId!, clone);
        } else {
          doc.documentElement.appendChild(el);
          layers = [...layers, clone];
        }
        anchorEl = el;
        curAnchorId = clone.id;
      }
      return { ...r, svg: new XMLSerializer().serializeToString(doc.documentElement), screen: { ...r.screen, layers } };
    });
    setSelectedIds(plans.map((p) => p.clone.id));
  }, [pushUndo, selectedIds]);

  // Cmd/Ctrl + C / V / D — copy, paste, duplicate. Skip while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      // Keyed on `e.code` (physical key), so it works on any layout — on a
      // Cyrillic layout `e.key` for the C key is 'с', which would never match.
      const code = physCode(e);
      if (code !== 'KeyC' && code !== 'KeyV' && code !== 'KeyD') return;
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      if (code === 'KeyC') {
        if (!selectedIds.length) return;
        e.preventDefault();
        copySelection();
      } else if (code === 'KeyV') {
        if (!clipboard.current.length) return;
        e.preventDefault();
        pasteClipboard();
      } else {
        if (!selectedIds.length) return;
        e.preventDefault();
        duplicateSelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, copySelection, pasteClipboard, duplicateSelection]);

  // Cmd/Ctrl+G groups the current selection into an auto-layout frame; adding
  // Shift makes a plain group. Skip while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || physCode(e) !== 'KeyG') return;
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      if (!selectedIds.length) return;
      e.preventDefault();
      groupLayers(selectedIds, e.shiftKey ? 'none' : 'column');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, groupLayers]);

  // ── Drawing tools ──────────────────────────────────────────────────────────
  // A drawn node is parented into the frame CONTAINER under the pointer (Figma:
  // draw inside a frame → it becomes a child) or, failing that, appended at the
  // root so it paints on top of the artboard. Then it's added to the layer tree
  // at the matching level, selected, and the move tool takes back over.
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Read a `translate(x, y)` out of a transform string (the only transform the
  // editor writes when moving layers). Everything else reads as no offset.
  const parseTranslate = (t: string | null): { x: number; y: number } => {
    const m = t?.match(/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)/);
    return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
  };

  // Topmost frame CONTAINER (`<g data-frame>`) whose bounds contain the point,
  // with the cumulative translate of its ancestors so we can convert the drop
  // point into that frame's local space. Returns null → parent at root.
  const frameParentAt = (
    doc: Document,
    x: number,
    y: number,
  ): { host: Element; id: string; ox: number; oy: number } | null => {
    const frames = Array.from(doc.querySelectorAll('g[data-frame]'));
    // Document order paints back-to-front, so scan in reverse for the topmost.
    for (let i = frames.length - 1; i >= 0; i--) {
      const g = frames[i];
      const bg = g.querySelector(':scope > rect[data-frame-bg]');
      if (!bg) continue;
      // Cumulative translate from this frame up to the root.
      let ox = 0;
      let oy = 0;
      for (let p: Element | null = g; p; p = p.parentElement) {
        const t = parseTranslate(p.getAttribute?.('transform') ?? null);
        ox += t.x;
        oy += t.y;
      }
      const bx = (+bg.getAttribute('x')! || 0) + ox;
      const by = (+bg.getAttribute('y')! || 0) + oy;
      const bw = +bg.getAttribute('width')! || 0;
      const bh = +bg.getAttribute('height')! || 0;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) {
        return { host: g, id: g.getAttribute('data-layer-id')!, ox, oy };
      }
    }
    return null;
  };

  // Immutably append `layer` to the children of `parentId` (or to the top level
  // when parentId is null), so the layer tree mirrors the SVG parenting above.
  const insertIntoTree = (layers: Layer[], parentId: string | null, layer: Layer): Layer[] => {
    if (!parentId) return [...layers, layer];
    return layers.map((l) =>
      l.id === parentId
        ? { ...l, children: [...l.children, layer] }
        : { ...l, children: insertIntoTree(l.children, parentId, layer) },
    );
  };

  const createRect = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      const gid = rid('L');
      const fill = '#B0B0B8';
      const b = { x: +box.x.toFixed(1), y: +box.y.toFixed(1), w: +box.w.toFixed(1), h: +box.h.toFixed(1) };
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const parent = frameParentAt(doc, b.x, b.y);
        const host = parent?.host ?? doc.documentElement;
        const ox = parent?.ox ?? 0;
        const oy = parent?.oy ?? 0;
        const rect = doc.createElementNS(SVG_NS, 'rect');
        rect.setAttribute('x', String(+(b.x - ox).toFixed(1)));
        rect.setAttribute('y', String(+(b.y - oy).toFixed(1)));
        rect.setAttribute('width', String(b.w));
        rect.setAttribute('height', String(b.h));
        rect.setAttribute('fill', fill);
        rect.setAttribute('data-layer-id', gid);
        rect.setAttribute('data-name', 'Прямоугольник');
        host.appendChild(rect);
        const layer: Layer = { id: gid, name: 'Прямоугольник', type: 'block', props: { fill, box: b }, children: [] };
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: insertIntoTree(r.screen.layers, parent?.id ?? null, layer) },
        };
      });
      setSelectedIds([gid]);
      setTool('move');
    },
    [pushUndo],
  );

  // Draw a new frame (F tool) — a real artboard CONTAINER: a `<g data-frame>`
  // that clips its children to its bounds and paints a white background. Nests
  // into a frame under the pointer, else sits at the root. Other objects drawn
  // inside it later become its children (see frameParentAt).
  const createFrame = useCallback(
    (box: { x: number; y: number; w: number; h: number }) => {
      const gid = rid('L');
      const fill = '#ffffff';
      const b = { x: +box.x.toFixed(1), y: +box.y.toFixed(1), w: +box.w.toFixed(1), h: +box.h.toFixed(1) };
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const parent = frameParentAt(doc, b.x, b.y);
        const host = parent?.host ?? doc.documentElement;
        const ox = parent?.ox ?? 0;
        const oy = parent?.oy ?? 0;
        const lx = +(b.x - ox).toFixed(1);
        const ly = +(b.y - oy).toFixed(1);

        const g = doc.createElementNS(SVG_NS, 'g');
        g.setAttribute('data-layer-id', gid);
        g.setAttribute('data-name', 'Фрейм');
        g.setAttribute('data-frame', '1');
        const clipId = `fc-${gid}`;
        g.setAttribute('clip-path', `url(#${clipId})`);

        const clip = doc.createElementNS(SVG_NS, 'clipPath');
        clip.setAttribute('id', clipId);
        clip.setAttribute('clipPathUnits', 'userSpaceOnUse');
        const clipRect = doc.createElementNS(SVG_NS, 'rect');
        clipRect.setAttribute('x', String(lx));
        clipRect.setAttribute('y', String(ly));
        clipRect.setAttribute('width', String(b.w));
        clipRect.setAttribute('height', String(b.h));
        clip.appendChild(clipRect);

        const bg = doc.createElementNS(SVG_NS, 'rect');
        bg.setAttribute('x', String(lx));
        bg.setAttribute('y', String(ly));
        bg.setAttribute('width', String(b.w));
        bg.setAttribute('height', String(b.h));
        bg.setAttribute('fill', fill);
        bg.setAttribute('data-frame-bg', '1');

        g.appendChild(clip);
        g.appendChild(bg);
        host.appendChild(g);

        const layer: Layer = { id: gid, name: 'Фрейм', type: 'frame', props: { fill, box: b, layout: 'none', clip: true }, children: [] };
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: insertIntoTree(r.screen.layers, parent?.id ?? null, layer) },
        };
      });
      setSelectedIds([gid]);
      setTool('move');
    },
    [pushUndo],
  );

  // Drop a preset-sized artboard (picked from the frame panel). Places it at the
  // root, just right of any existing top-level frames so it never nests into or
  // overlaps them, then reuses the normal draw path.
  const createFrameSized = useCallback(
    (w: number, h: number) => {
      const tops = latest.current?.layers ?? [];
      let x = 0;
      for (const l of tops) {
        if (l.type === 'frame' && l.props.box) x = Math.max(x, l.props.box.x + l.props.box.w + 80);
      }
      createFrame({ x, y: 0, w, h });
    },
    [createFrame],
  );

  const createText = useCallback(
    (pt: { x: number; y: number }) => {
      const gid = rid('L');
      const color = '#111827';
      const fontSize = 24;
      const content = 'Текст';
      // SVG text anchors at the baseline; nudge down so the click point reads as
      // the visual top-left of the glyphs.
      const ax = +pt.x.toFixed(1);
      const ay = +(pt.y + fontSize).toFixed(1);
      pushUndo();
      setResult((r) => {
        if (!r) return r;
        const doc = new DOMParser().parseFromString(r.svg, 'image/svg+xml');
        const parent = frameParentAt(doc, ax, ay);
        const host = parent?.host ?? doc.documentElement;
        const ox = parent?.ox ?? 0;
        const oy = parent?.oy ?? 0;
        const text = doc.createElementNS(SVG_NS, 'text');
        text.setAttribute('x', String(+(ax - ox).toFixed(1)));
        text.setAttribute('y', String(+(ay - oy).toFixed(1)));
        text.setAttribute('fill', color);
        text.setAttribute('font-size', String(fontSize));
        text.setAttribute('font-family', 'inherit');
        text.setAttribute('data-layer-id', gid);
        text.setAttribute('data-name', content);
        text.textContent = content;
        host.appendChild(text);
        const layer: Layer = { id: gid, name: content, type: 'text', props: { text: content, fontSize, color }, children: [] };
        return {
          ...r,
          svg: new XMLSerializer().serializeToString(doc.documentElement),
          screen: { ...r.screen, layers: insertIntoTree(r.screen.layers, parent?.id ?? null, layer) },
        };
      });
      setSelectedIds([gid]);
      setTool('move');
    },
    [pushUndo],
  );

  // Single-key tool switches (Figma: V/F/R/P/T/C) — only on canvas steps, and
  // never while typing. Picking a tool also flips the dock to its tools face.
  useEffect(() => {
    // Keyed on `e.code` (the physical key), not `e.key`, so shortcuts work on
    // any keyboard layout — on a Cyrillic layout `e.key` for the V key is 'м',
    // which would never match. Figma does the same.
    const keyTool: Record<string, EditorTool> = {
      KeyV: 'move', KeyM: 'move', KeyF: 'frame', KeyR: 'shape', KeyP: 'pen', KeyT: 'text', KeyC: 'comment',
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      const code = physCode(e);
      // K → Scale mode (proportional resize); still the move tool underneath.
      if (code === 'KeyK') {
        setTool('move');
        setScaleMode(true);
        return;
      }
      const t = keyTool[code];
      if (!t) return;
      setTool(t);
      setScaleMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Whole-scene canvas actions (empty-area context menu / shortcuts).
  const selectAll = useCallback(() => {
    const cur = latest.current;
    if (cur) setSelectedIds(cur.layers.map((l) => l.id));
  }, []);
  const fitView = useCallback(() => setFitSignal((n) => n + 1), []);

  // Cmd/Ctrl+A selects every top-level layer; Shift+1 fits the scene. Skip in fields.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      const code = physCode(e);
      if ((e.metaKey || e.ctrlKey) && code === 'KeyA') {
        e.preventDefault();
        selectAll();
      } else if (e.shiftKey && code === 'Digit1') {
        e.preventDefault();
        fitView();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectAll, fitView]);

  // Delete / Backspace removes the selected layer — but never while typing in a
  // field (e.g. the inline rename input or a properties input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      if (!selectedId) return;
      e.preventDefault();
      deleteLayer(selectedId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, deleteLayer]);

  // Bounding box of a layer as % of the screen — measured live from the DOM so it
  // accounts for the pan/zoom transform and any SVG transforms.
  const measureRect = useCallback((layerId: string): CritiqueZone['rect'] | null => {
    const host = svgHostRef.current;
    if (!host) return null;
    const node = host.querySelector<SVGGraphicsElement>(`[data-layer-id="${layerId}"]`);
    const svgEl = host.querySelector('svg');
    if (!node || !svgEl) return null;
    const nb = node.getBoundingClientRect();
    const sb = svgEl.getBoundingClientRect();
    if (!sb.width || !sb.height) return null;
    const clamp = (n: number) => +Math.max(0, Math.min(100, n)).toFixed(1);
    return {
      x0: clamp(((nb.left - sb.left) / sb.width) * 100),
      y0: clamp(((nb.top - sb.top) / sb.height) * 100),
      x1: clamp(((nb.right - sb.left) / sb.width) * 100),
      y1: clamp(((nb.bottom - sb.top) / sb.height) * 100),
    };
  }, []);

  const patchDraft = useCallback(
    (patch: Partial<EditorDraft>) => {
      pushUndo();
      setDraft((d) => ({ ...d, ...patch }));
    },
    [pushUndo],
  );

  const addZone = useCallback(
    // `deltas` pre-fills the per-property diffs — used when a zone is created
    // straight from the «Отличия» panel, so the auto-detected changes land as
    // grading criteria without the teacher re-entering them.
    (layer: Layer, deltas?: DefectDelta[]) => {
      pushUndo();
      const rect = measureRect(layer.id);
      setDraft((d) => ({
        ...d,
        zones: [
          ...d.zones,
          {
            id: rid('zone'),
            layerId: layer.id,
            label: layer.name,
            role: 'secondary',
            roleNote: '',
            intent: '',
            defect: 'none',
            defectNote: '',
            deltas: deltas && deltas.length ? deltas : undefined,
            rect: rect ?? { x0: 10, y0: 10, x1: 40, y1: 30 },
          },
        ],
      }));
    },
    [measureRect, pushUndo],
  );

  const removeZone = useCallback(
    (zoneId: string) => {
      pushUndo();
      setDraft((d) => ({ ...d, zones: d.zones.filter((z) => z.id !== zoneId) }));
    },
    [pushUndo],
  );

  // «Отличия» panel: toggle a defect entry as a grading criterion. On → create a
  // critique zone pre-filled with the entry's auto-detected deltas; off → drop
  // the zone. Keyed by layer, matching how zones bind to layers elsewhere.
  const toggleCriterion = useCallback(
    (entry: DefectEntry) => {
      const existing = zoneByLayer.get(entry.layerId);
      if (existing) {
        removeZone(existing.id);
        return;
      }
      const layer = findLayer(result?.screen.layers ?? [], entry.layerId);
      if (layer) addZone(layer, entry.deltas);
    },
    [zoneByLayer, removeZone, addZone, result],
  );

  const patchZone = useCallback(
    (zoneId: string, patch: Partial<CritiqueZone>) => {
      pushUndo();
      setDraft((d) => ({ ...d, zones: d.zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)) }));
    },
    [pushUndo],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void ingest(file);
    },
    [ingest],
  );

  const layerCount = byId.size;
  // The editor is "open" once a draft with an active page exists; an empty page
  // is valid (you draw a header on it), so this no longer gates on layer count.
  const open = activePageId != null && !!result && result.errors.length === 0;

  // Drafts strip — file tabs, Figma-style: one tab per saved file, the active
  // one highlighted, and the rightmost control a "+" that starts a fresh import.
  const draftsBar = (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-elevated px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {drafts.map((d) => {
          const active = d.id === activeDraftId;
          return (
            <div
              key={d.id}
              className={`group flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-caption transition-fast ${
                active
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-border bg-surface text-secondary hover:border-brand/40'
              }`}
            >
              <button type="button" onClick={() => loadDraft(d)} className="max-w-[140px] truncate font-medium">
                {d.fileName}
              </button>
              <button
                type="button"
                onClick={() => removeDraft(d.id)}
                title={t('editor.home.deleteFile')}
                className="rounded p-0.5 text-tertiary opacity-60 transition-fast hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => void createLesson(false)}
        disabled={creating}
        title={t('editor.home.newLesson')}
        aria-label={t('editor.home.newLesson')}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition-fast hover:bg-brand/90 disabled:opacity-50"
      >
        <Plus size={16} />
      </button>
    </div>
  );

  if (!open || !result) {
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {(lessonError || (result && result.errors.length > 0)) && (
            <div className="mx-auto mb-4 flex max-w-md items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{lessonError ?? result?.errors.join(' ')}</span>
            </div>
          )}
          <ProjectGrid
            lessons={lessons}
            creating={creating}
            onNewLesson={createLesson}
            onOpenLesson={(id) => router.push(`/admin/lessons/${id}`)}
            drafts={drafts}
            dragging={dragging}
            setDragging={setDragging}
            onDrop={onDrop}
            onFile={ingest}
            onOpen={loadDraft}
            onDelete={removeDraft}
          />
        </div>
      </div>
    );
  }

  const selZone = selected ? zoneByLayer.get(selected.id) : undefined;
  const showLeft = step === 1;
  const showRight = step === 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {draftsBar}
      <div className="flex min-h-0 flex-1">
      {/* ── Left rail: Pages (top) + Layers (flush left, internal scroll) ── */}
      {showLeft && (
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-elevated">
          <PagesPanel
            items={items}
            activeId={activePageId}
            coverId={coverPageId}
            collapsed={pagesCollapsed}
            onToggleCollapsed={() => setPagesCollapsed((v) => !v)}
            onSelect={switchPage}
            onAddPage={addPage}
            onAddDivider={addDivider}
            onRename={renameItem}
            onDelete={removeItem}
            onSetCover={setCover}
          />

          {/* Layers section — collapsible header with a hover chevron. */}
          <div className="group flex items-center gap-1.5 border-b border-t border-border px-3 py-3">
            <button
              type="button"
              onClick={() => setLayersCollapsed((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
              title={layersCollapsed ? t('editor.sidebar.expand') : t('editor.sidebar.collapse')}
            >
              <ChevronDown
                size={13}
                className={`shrink-0 text-tertiary transition-fast ${layersCollapsed ? 'opacity-100 -rotate-90' : 'opacity-0 group-hover:opacity-100'}`}
              />
              <span className="truncate text-caption font-semibold uppercase tracking-wide text-tertiary">
                {t('editor.sidebar.layers')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCollapseSignal((v) => v + 1)}
              title={t('editor.sidebar.collapseAll')}
              className="shrink-0 text-tertiary transition-fast hover:text-brand"
            >
              <ChevronsDownUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => replaceRef.current?.click()}
              title={t('editor.sidebar.loadOtherSvg')}
              className="shrink-0 text-tertiary transition-fast hover:text-brand"
            >
              <RotateCcw size={14} />
            </button>
            <input
              ref={replaceRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ingest(f);
                e.target.value = '';
              }}
            />
          </div>
          {!layersCollapsed && (
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <LayerTree
                layers={result.screen.layers}
                selectedIds={selectedIds}
                onSelect={select}
                onHover={setHoveredId}
                onRename={renameLayer}
                onDelete={deleteLayer}
                onContextMenu={openMenu}
                onReparent={reparentLayer}
                renameId={renameId}
                onRenameHandled={clearRenameId}
                zoneIds={zoneIds}
                referenceIds={referenceIds}
                flawedIds={flawedIds}
                collapseSignal={collapseSignal}
              />
            </div>
          )}
          <p className="mt-auto truncate border-t border-border px-4 py-2 text-caption text-tertiary">
            {fileName} · {tp('editor.sidebar.layerCount', layerCount)} · {result.screen.width}×{result.screen.height}
          </p>
        </aside>
      )}

      {/* ── Center — step content + step bar ── */}
      <section className="relative min-w-0 flex-1">
        {step === 2 ? (
          <Step4Access
            draft={draft}
            zoneCount={draft.zones.length}
            onPatch={patchDraft}
            onSave={() => alert(t('editor.steps.savedDraftAlert'))}
            onPublish={() => alert(t('editor.steps.publishAlert'))}
          />
        ) : (
          <StageCanvas
            svg={result.svg}
            width={result.screen.width}
            height={result.screen.height}
            background={canvasBg}
            selectedIds={selectedIds}
            hoveredId={hoveredId}
            onSelect={select}
            onSelectMany={selectMany}
            onHover={setHoveredId}
            onMoveLayers={moveLayers}
            onDuplicateLayers={duplicateLayersAt}
            onTransformLayers={transformLayers}
            onResizeFrame={resizeFrameBox}
            onResizeRect={resizeRect}
            onSetRadius={setLayerRadius}
            onContextMenu={openMenu}
            tool={tool}
            scaleMode={scaleMode}
            radiusLayerId={
              selectedIds.length === 1 && selected && (selected.type === 'block' || selected.type === 'frame')
                ? selected.id
                : null
            }
            radius={selected?.props.radius ?? 0}
            onCreateRect={createRect}
            onCreateFrame={createFrame}
            onCreateText={createText}
            fitSignal={fitSignal}
            zoneIds={zoneIds}
            svgHostRef={svgHostRef}
            frames={frameChrome}
            onCycleFrameRole={cycleFrameRole}
          />
        )}
        <EditorDock
          tool={tool}
          onTool={({ tool: t, variant }) => {
            setTool(t);
            // Move tool exposes Scale as a sub-mode; every other pick is a plain
            // tool switch. Unimplemented variants still select their parent tool
            // so the canvas falls back gracefully.
            setScaleMode(t === 'move' && variant === 'scale');
          }}
          // The right-hand pill swaps the whole surface: Редактор → canvas +
          // tools (step 1), Доступы → the lesson settings / publish step (step 2).
          viewMode={step === 2 ? 'share' : 'editor'}
          onViewMode={(m) => setStep(m === 'share' ? 2 : 1)}
        />
        {step === 1 && hasFramePair && (
          <DiffPanel
            defects={defects}
            criterionLayerIds={zoneIds}
            selectedId={selectedId}
            onSelect={(id) => select(id)}
            onToggleCriterion={toggleCriterion}
          />
        )}
      </section>

      {/* ── Right — unified editor: свойства слоя + зона критики, либо настройка
             задания когда ничего не выбрано. ── */}
      {showRight && (
        <aside className="flex w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-elevated px-3 py-3">
          {tool === 'frame' ? (
            <FrameSizePanel onPick={createFrameSized} />
          ) : selected ? (
            <>
              <PropertiesPanel
                layer={selected}
                screen={result.screen}
                liveBox={selBox}
                onRadius={(v) => mutate(selected.id, (el) => (el.setAttribute('rx', String(v)), el.setAttribute('ry', String(v))))}
                onFill={(v) =>
                  selected.type === 'frame'
                    ? mutate(selected.id, (el) => setFrameFill(el, v, selected.props.box))
                    : mutate(selected.id, (el) => el.setAttribute('fill', v))
                }
                onOpacity={(v) => setLayerOpacity(selected.id, v)}
                onStroke={(v) => setLayerStroke(selected.id, v)}
                onStrokeWidth={(v) => setLayerStrokeWidth(selected.id, v)}
                onLayout={selected.type === 'frame' ? (l) => setLayerLayout(selected.id, l) : undefined}
                onMove={(x, y) => moveLayerTo(selected.id, x, y)}
                onAlign={alignLayer}
                onText={(v) => mutate(selected.id, (el) => (el.textContent = v))}
                onResize={
                  selected.type === 'frame' &&
                  selected.props.box &&
                  selected.props.box.x === 0 &&
                  selected.props.box.y === 0 &&
                  Math.round(selected.props.box.w) === result.screen.width &&
                  Math.round(selected.props.box.h) === result.screen.height
                    ? (w, h) => resizeFrame(selected.id, w, h)
                    : (w, h) => resizeLayerTo(selected.id, w, h)
                }
                onToggleClip={
                  selected.type === 'frame'
                    ? (on) => toggleClip(selected.id, on)
                    : undefined
                }
              />
              <div className="border-t border-border pt-3">
                <ZoneEditor
                  layer={selected}
                  zone={selZone}
                  autoDeltas={autoDeltas}
                  onAdd={() => addZone(selected)}
                  onRemove={() => selZone && removeZone(selZone.id)}
                  onPatch={(patch) => selZone && patchZone(selZone.id, patch)}
                />
              </div>
            </>
          ) : (
            <>
              <ExerciseSetupPanel
                draft={draft}
                onKind={(kind) => patchDraft({ kind })}
                onBroken={(brokenSvg) => patchDraft({ brokenSvg })}
              />
              <CanvasBackgroundPanel
                value={canvasBg ?? '#f7f8fa'}
                onChange={setCanvasBg}
              />
            </>
          )}
        </aside>
      )}
      </div>
      {menu && (menu.layerId ? (
        <LayerContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          isGroup={(() => {
            const l = findLayer(result.screen.layers, menu.layerId);
            return !!l && l.type === 'frame' && l.children.length > 0;
          })()}
          canFramify={(() => {
            const l = findLayer(result.screen.layers, menu.layerId);
            if (!l) return false;
            // A plain group converts in place; any other target (a leaf, or a
            // multi-selection) gets wrapped into a new frame — Figma's "Frame
            // selection". A layer that's already a real frame has nothing to do.
            const isPlainGroup = l.type === 'frame' && l.children.length > 0 && !l.props.frame;
            const isRealFrame = l.type === 'frame' && !!l.props.frame;
            return isPlainGroup || !isRealFrame;
          })()}
          onFramify={() => {
            const l = findLayer(result.screen.layers, menu.layerId!);
            const isPlainGroup =
              !!l && l.type === 'frame' && l.children.length > 0 && !l.props.frame;
            if (isPlainGroup) {
              framifyGroup(menu.layerId!); // existing group → frame, in place
            } else {
              // Frame the current selection (or just the clicked row).
              const target = menu.layerId!;
              frameSelection(selectedIds.includes(target) ? selectedIds : [target]);
            }
            setMenu(null);
          }}
          onGroup={(layout) => {
            const target = menu.layerId!;
            groupLayers(selectedIds.includes(target) ? selectedIds : [target], layout);
            setMenu(null);
          }}
          onUngroup={() => {
            ungroupLayers(menu.layerId!);
            setMenu(null);
          }}
          onDuplicateFlawed={
            result.screen.layers.some((l) => l.id === menu.layerId && l.type === 'frame')
              ? () => {
                  duplicateAsFlawed(menu.layerId!);
                  setMenu(null);
                }
              : undefined
          }
          onRename={() => {
            setRenameId(menu.layerId);
            setMenu(null);
          }}
          onDelete={() => {
            deleteLayer(menu.layerId!);
            setMenu(null);
          }}
        />
      ) : (
        <CanvasContextMenu
          x={menu.x}
          y={menu.y}
          hasLayers={result.screen.layers.length > 0}
          hasSelection={selectedIds.length > 0}
          onClose={() => setMenu(null)}
          onSelectAll={selectAll}
          onClearSelection={() => setSelectedIds([])}
          onFitView={fitView}
        />
      ))}
    </div>
  );
}

/** "Edited N ago" — coarse relative time for the file cards. */
function relTime(ts: number, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return t('editor.home.justNow');
  const m = Math.floor(s / 60);
  if (m < 60) return t('editor.home.minsAgo', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('editor.home.hoursAgo', { count: h });
  const d = Math.floor(h / 24);
  return t('editor.home.daysAgo', { count: d });
}

/**
 * The editor home — lessons-first, Figma-recents-style. Primary cards create a
 * lesson (an empty one for mixed tasks, or one seeded with a Figma-submit task)
 * and open the block constructor; existing lessons list beside them. A secondary
 * section keeps the standalone SVG screen-critique drafts.
 */
function ProjectGrid({
  lessons,
  creating,
  onNewLesson,
  onOpenLesson,
  drafts,
  dragging,
  setDragging,
  onDrop,
  onFile,
  onOpen,
  onDelete,
}: {
  lessons: { id: string; title: string; slug: string; blockCount: number; updatedAt: string }[];
  creating: boolean;
  onNewLesson: (withFigma: boolean) => void;
  onOpenLesson: (id: string) => void;
  drafts: EditorDraftEntry[];
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onFile: (f: File) => void;
  onOpen: (d: EditorDraftEntry) => void;
  onDelete: (id: string) => void;
}) {
  const { t, tp } = useT();
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ── Lessons — the primary surface ── */}
      <section>
        <h2 className="mb-3 text-callout font-semibold text-primary">{t('editor.home.lessons')}</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {/* New-lesson cards — mixed tasks, or a single Figma submission. */}
          <button
            type="button"
            disabled={creating}
            onClick={() => onNewLesson(false)}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-center transition-base hover:border-brand/50 hover:bg-brand/5 disabled:opacity-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
              <GraduationCap size={20} />
            </span>
            <p className="px-4 text-footnote font-semibold text-primary">{t('editor.home.newLesson')}</p>
            <p className="px-4 text-caption text-tertiary">{t('editor.home.newLessonMixed')}</p>
          </button>

          <button
            type="button"
            disabled={creating}
            onClick={() => onNewLesson(true)}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface text-center transition-base hover:border-brand/50 hover:bg-brand/5 disabled:opacity-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Link2 size={20} />
            </span>
            <p className="px-4 text-footnote font-semibold text-primary">{t('editor.home.newLessonFigma')}</p>
            <p className="px-4 text-caption text-tertiary">{t('editor.home.newLessonFigmaHint')}</p>
          </button>

          {lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => onOpenLesson(l.id)}
              className="group flex flex-col gap-2 text-left"
            >
              <span className="flex aspect-[4/3] items-center justify-center rounded-xl border border-border bg-surface transition-fast group-hover:border-brand/60">
                <GraduationCap size={30} className="text-tertiary transition-fast group-hover:text-brand" />
              </span>
              <span className="min-w-0 px-0.5">
                <span className="block truncate text-footnote font-medium text-primary">
                  {l.title || t('editor.home.untitled')}
                </span>
                <span className="block text-caption text-tertiary">
                  {tp('editor.home.blockCount', l.blockCount)} · {t('editor.home.editedAt', { time: relTime(new Date(l.updatedAt).getTime(), t) })}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── SVG screen-critique files — the standalone importer ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-callout font-semibold text-primary">
          <ImageIcon size={16} className="text-tertiary" /> {t('editor.home.svgCritiques')}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {/* Import tile — dashed, matches the dropzone affordance. */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-center transition-base',
              dragging ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/40',
            ].join(' ')}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand">
              <UploadCloud size={20} />
            </span>
            <p className="px-4 text-footnote font-semibold text-primary">{t('editor.home.dropSvg')}</p>
            <input
              type="file"
              accept=".svg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
            />
          </label>

          {drafts.map((d) => {
            // Thumbnail = the Title/cover page's render (falls back to the first).
            const cover = coverPageOf(d);
            const thumb = cover ? `data:image/svg+xml;utf8,${encodeURIComponent(cover.result.svg)}` : null;
            return (
              <div key={d.id} className="group flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onOpen(d)}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-surface transition-fast hover:border-brand/60"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-full w-full object-contain p-3" draggable={false} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <ImageIcon size={28} className="text-tertiary" />
                    </span>
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(d.id);
                    }}
                    title={t('editor.home.deleteFile')}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur transition-fast hover:bg-danger group-hover:opacity-100"
                  >
                    <X size={13} />
                  </span>
                </button>
                <div className="min-w-0 px-0.5">
                  <p className="truncate text-footnote font-medium text-primary">{d.fileName}</p>
                  <p className="text-caption text-tertiary">{t('editor.home.editedAtCap', { time: relTime(d.updatedAt, t) })}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
