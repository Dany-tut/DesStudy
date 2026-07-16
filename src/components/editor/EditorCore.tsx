'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, AlertCircle, RotateCcw, Plus, X, GraduationCap, Link2, Image as ImageIcon, ChevronDown } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, ParseResult, EditorTool } from '@/lib/editor/types';
import { listDrafts, saveDraft, deleteDraft, coverPageOf, type EditorDraftEntry } from '@/lib/editor/drafts';
import { blankResult, type PageItem, type PageMeta } from '@/lib/editor/pages';
import { emptyDraft, draftToPayload } from '@/lib/admin/exerciseDraft';
import type { CritiqueZone, DefectDelta } from '@/lib/curriculum/types';
import { LayerTree, LayerContextMenu, CanvasContextMenu } from './LayerTree';
import { PagesPanel } from './PagesPanel';
import { StageCanvas } from './StageCanvas';
import { EditorDock, type DockFace } from './EditorDock';
import { PropertiesPanel } from './PropertiesPanel';
import { type EditorStep } from './StepBar';
import { ExerciseSetupPanel, ZoneEditor, Step4Access, type EditorDraft } from './EditorSteps';

/** Flatten the tree once so selection lookups don't re-walk on every render. */
function indexLayers(layers: Layer[], map: Map<string, Layer> = new Map()): Map<string, Layer> {
  for (const l of layers) {
    map.set(l.id, l);
    if (l.children.length) indexLayers(l.children, map);
  }
  return map;
}

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

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

/** Deep-clone a layer subtree with fresh ids, recording old→new for SVG relabel. */
function cloneSubtree(layer: Layer, idMap: Map<string, string>): Layer {
  const nid = rid('L');
  idMap.set(layer.id, nid);
  return {
    ...layer,
    id: nid,
    props: { ...layer.props },
    children: layer.children.map((c) => cloneSubtree(c, idMap)),
  };
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

const EMPTY_DRAFT: EditorDraft = {
  title: '',
  kind: 'critique',
  brokenSvg: undefined,
  zones: [],
  access: 'PUBLIC',
  audience: '',
};

export function EditorCore() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // The primary selection (last picked) drives the single-layer side panels.
  const selectedId = selectedIds.length ? selectedIds[selectedIds.length - 1] : null;
  // Select a layer. `additive` (Shift) toggles it within the current set;
  // otherwise it replaces the selection. null clears.
  const select = useCallback((id: string | null, additive = false) => {
    setSelectedIds((cur) => {
      if (id == null) return [];
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

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Right-click menu — position + the layer clicked (null = empty canvas).
  const [menu, setMenu] = useState<{ x: number; y: number; layerId: string | null } | null>(null);
  // Row the menu asked to inline-rename; consumed by the matching LayerRow.
  const [renameId, setRenameId] = useState<string | null>(null);
  const clearRenameId = useCallback(() => setRenameId(null), []);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<EditorStep>(1);
  // Active canvas tool + which face the bottom dock shows. Interacting with the
  // canvas flips the dock to tools; the dock's "droplet" flips it back to steps.
  const [tool, setTool] = useState<EditorTool>('move');
  // Scale mode (K): corner handles scale proportionally. Cleared by V / any other
  // tool. Only meaningful while `tool === 'move'`.
  const [scaleMode, setScaleMode] = useState(false);
  const [dockFace, setDockFace] = useState<DockFace>('tools');
  const showTools = useCallback(() => setDockFace('tools'), []);
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
          setLessonError(data.message ?? 'Не удалось создать урок');
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
        setLessonError('Не удалось создать урок — проверь соединение');
      } finally {
        setCreating(false);
      }
    },
    [router],
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

  // Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo — but let native undo win inside inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
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

  // Auto-diff the selected layer against its эталон twin: locate the top-level
  // frame it lives in, confirm that frame is «сломанный», find the sibling
  // reference frame, mirror the index path into it, and compare props. Undefined
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
    const path = pathTo(host, selected.id)!;
    const twin = atPath(ref, path);
    if (!twin) return [];
    return diffLayerProps(twin, selected);
  }, [selected, result]);

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
        el.setAttribute('rx', String(v));
        el.setAttribute('ry', String(v));
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
    (ids: string[], layout: 'row' | 'column' | 'none') => {
      const cur = latest.current;
      if (!cur || ids.length < 1) return;
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
      if (!grouped) return; // selection spans different parents — can't group

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
    },
    [pushUndo],
  );

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
      const clone = cloneSubtree(frame, idMap);
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

  // Cmd/Ctrl+G groups the current selection into an auto-layout frame; adding
  // Shift makes a plain group. Skip while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'g') return;
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
    const keyTool: Record<string, EditorTool> = { v: 'move', f: 'frame', r: 'shape', p: 'pen', t: 'text', c: 'comment' };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ae = document.activeElement;
      if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || (ae as HTMLElement).isContentEditable)) return;
      // K → Scale mode (proportional resize); still the move tool underneath.
      if (e.key.toLowerCase() === 'k') {
        setTool('move');
        setScaleMode(true);
        setDockFace('tools');
        return;
      }
      const t = keyTool[e.key.toLowerCase()];
      if (!t) return;
      setTool(t);
      setScaleMode(false);
      setDockFace('tools');
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAll();
      } else if (e.shiftKey && e.key === '1') {
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
    (layer: Layer) => {
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
                title="Удалить файл"
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
        title="Новый урок"
        aria-label="Новый урок"
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
              title={layersCollapsed ? 'Развернуть' : 'Свернуть'}
            >
              <ChevronDown
                size={13}
                className={`shrink-0 text-tertiary transition-fast ${layersCollapsed ? 'opacity-100 -rotate-90' : 'opacity-0 group-hover:opacity-100'}`}
              />
              <span className="truncate text-caption font-semibold uppercase tracking-wide text-tertiary">
                Слои
              </span>
            </button>
            <button
              type="button"
              onClick={() => replaceRef.current?.click()}
              title="Загрузить другой SVG"
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
                renameId={renameId}
                onRenameHandled={clearRenameId}
                zoneIds={zoneIds}
              />
            </div>
          )}
          <p className="mt-auto truncate border-t border-border px-4 py-2 text-caption text-tertiary">
            {fileName} · {layerCount} {layerCount === 1 ? 'слой' : 'слоёв'} · {result.screen.width}×{result.screen.height}
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
            onSave={() => alert('Черновик сохранён локально (запись в БД — следующий шаг).')}
            onPublish={() => alert('Публикация подключается к API уроков следующим шагом.')}
          />
        ) : (
          <StageCanvas
            svg={result.svg}
            width={result.screen.width}
            height={result.screen.height}
            selectedIds={selectedIds}
            hoveredId={hoveredId}
            onSelect={select}
            onSelectMany={selectMany}
            onHover={setHoveredId}
            onMoveLayers={moveLayers}
            onTransformLayers={transformLayers}
            onResizeFrame={resizeFrameBox}
            onSetRadius={setLayerRadius}
            onContextMenu={openMenu}
            tool={tool}
            scaleMode={scaleMode}
            radiusLayerId={
              selectedIds.length === 1 && selected && selected.type === 'block' ? selected.id : null
            }
            radius={selected?.props.radius ?? 0}
            onCreateRect={createRect}
            onCreateFrame={createFrame}
            onCreateText={createText}
            onCanvasActivate={showTools}
            fitSignal={fitSignal}
            zoneIds={zoneIds}
            svgHostRef={svgHostRef}
            frames={frameChrome}
            onCycleFrameRole={cycleFrameRole}
          />
        )}
        <EditorDock
          face={step === 2 ? 'steps' : dockFace}
          onFace={setDockFace}
          step={step}
          onStep={setStep}
          enabledThrough={2}
          tool={tool}
          onTool={({ tool: t, variant }) => {
            setTool(t);
            // Move tool exposes Scale as a sub-mode; every other pick is a plain
            // tool switch. Unimplemented variants still select their parent tool
            // so the canvas falls back gracefully.
            setScaleMode(t === 'move' && variant === 'scale');
            setDockFace('tools');
          }}
        />
      </section>

      {/* ── Right — unified editor: свойства слоя + зона критики, либо настройка
             задания когда ничего не выбрано. ── */}
      {showRight && (
        <aside className="flex w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-border bg-elevated px-3 py-3">
          {selected ? (
            <>
              <PropertiesPanel
                layer={selected}
                screen={result.screen}
                onRadius={(v) => mutate(selected.id, (el) => (el.setAttribute('rx', String(v)), el.setAttribute('ry', String(v))))}
                onFill={(v) => mutate(selected.id, (el) => el.setAttribute('fill', v))}
                onText={(v) => mutate(selected.id, (el) => (el.textContent = v))}
                onResize={
                  selected.type === 'frame' &&
                  selected.props.box &&
                  selected.props.box.x === 0 &&
                  selected.props.box.y === 0 &&
                  Math.round(selected.props.box.w) === result.screen.width &&
                  Math.round(selected.props.box.h) === result.screen.height
                    ? (w, h) => resizeFrame(selected.id, w, h)
                    : undefined
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
            <ExerciseSetupPanel
              draft={draft}
              onKind={(kind) => patchDraft({ kind })}
              onBroken={(brokenSvg) => patchDraft({ brokenSvg })}
            />
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
            // Only a plain group (not already a frame) can be framified — once it
            // is a real frame the option drops away, confirming the conversion.
            return !!l && l.type === 'frame' && l.children.length > 0 && !l.props.frame;
          })()}
          onFramify={() => {
            framifyGroup(menu.layerId!);
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
function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'только что';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
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
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ── Lessons — the primary surface ── */}
      <section>
        <h2 className="mb-3 text-callout font-semibold text-primary">Уроки</h2>
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
            <p className="px-4 text-footnote font-semibold text-primary">Новый урок</p>
            <p className="px-4 text-caption text-tertiary">Разные задания</p>
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
            <p className="px-4 text-footnote font-semibold text-primary">Урок · сдача в Figma</p>
            <p className="px-4 text-caption text-tertiary">Одно задание со ссылкой</p>
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
                  {l.title || 'Без названия'}
                </span>
                <span className="block text-caption text-tertiary">
                  {l.blockCount} {l.blockCount === 1 ? 'блок' : 'блоков'} · изменён {relTime(new Date(l.updatedAt).getTime())}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── SVG screen-critique files — the standalone importer ── */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-callout font-semibold text-primary">
          <ImageIcon size={16} className="text-tertiary" /> SVG-разборы экрана
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
            <p className="px-4 text-footnote font-semibold text-primary">Перетащи SVG или выбери файл</p>
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
                    title="Удалить файл"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/40 text-white opacity-0 backdrop-blur transition-fast hover:bg-danger group-hover:opacity-100"
                  >
                    <X size={13} />
                  </span>
                </button>
                <div className="min-w-0 px-0.5">
                  <p className="truncate text-footnote font-medium text-primary">{d.fileName}</p>
                  <p className="text-caption text-tertiary">Изменён {relTime(d.updatedAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
