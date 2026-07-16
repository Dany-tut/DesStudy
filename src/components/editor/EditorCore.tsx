'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, AlertCircle, RotateCcw, Plus, X } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, ParseResult } from '@/lib/editor/types';
import { listDrafts, saveDraft, deleteDraft, type EditorDraftEntry } from '@/lib/editor/drafts';
import type { CritiqueZone } from '@/lib/curriculum/types';
import { LayerTree } from './LayerTree';
import { StageCanvas } from './StageCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { StepBar, type EditorStep } from './StepBar';
import { Step2Variants, ZoneEditor, Step4Access, type EditorDraft } from './EditorSteps';

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

/** Drop one layer (and its subtree) from the tree. */
function removeFromTree(layers: Layer[], id: string): Layer[] {
  const out: Layer[] = [];
  for (const l of layers) {
    if (l.id === id) continue;
    out.push(l.children.length ? { ...l, children: removeFromTree(l.children, id) } : l);
  }
  return out;
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<EditorStep>(1);
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

  const ingest = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseSvgToLayers(text);
    setResult(parsed);
    setFileName(file.name);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    setDraft(EMPTY_DRAFT);
    undoStack.current = [];
    redoStack.current = [];
    // Register a fresh draft for this import so it's kept and switchable. Only
    // when it actually parsed to something — a broken import stays unsaved.
    if (parsed.errors.length === 0 && parsed.screen.layers.length > 0) {
      const id = rid('draft');
      setActiveDraftId(id);
      setDrafts(saveDraft({ id, fileName: file.name, result: parsed, draft: EMPTY_DRAFT, updatedAt: Date.now() }));
    } else {
      setActiveDraftId(null);
    }
  }, []);

  // Persist edits back into the active draft whenever the markup or draft change.
  useEffect(() => {
    if (!activeDraftId || !result || result.errors.length > 0) return;
    setDrafts(saveDraft({ id: activeDraftId, fileName: fileName ?? 'screen.svg', result, draft, updatedAt: Date.now() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, draft, activeDraftId]);

  /** Open a saved draft into the editor. */
  const loadDraft = useCallback((entry: EditorDraftEntry) => {
    setResult(entry.result);
    setFileName(entry.fileName);
    setDraft(entry.draft);
    setActiveDraftId(entry.id);
    setSelectedIds([]);
    setHoveredId(null);
    setStep(1);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

  /** Clear the editor to the empty "new file" state (import creates a draft). */
  const newFile = useCallback(() => {
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
  const ready = result && result.errors.length === 0 && layerCount > 0;

  // Drafts strip + "new file" — shown above every editor state so the teacher
  // can start a fresh import, switch files, or delete one at any time.
  const draftsBar = (
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-elevated px-3 py-2">
      <button
        type="button"
        onClick={newFile}
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-caption font-semibold text-white transition-fast hover:bg-brand/90"
      >
        <Plus size={14} /> Новый файл
      </button>
      {drafts.length > 0 && (
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
                  title="Удалить черновик"
                  className="rounded p-0.5 text-tertiary opacity-60 transition-fast hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!ready) {
    return (
      <div className="flex h-full flex-col">
        {draftsBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <Dropzone dragging={dragging} setDragging={setDragging} onDrop={onDrop} onFile={ingest} />
          {result && result.errors.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{result.errors.join(' ')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const selZone = selected ? zoneByLayer.get(selected.id) : undefined;
  const showLeft = step === 1 || step === 3;
  const showRight = step === 1 || step === 3;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {draftsBar}
      <div className="flex min-h-0 flex-1">
      {/* ── Layers (flush left, internal scroll) ── */}
      {showLeft && (
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-border bg-elevated">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">
              {step === 3 ? 'Слои · клик = зона' : 'Слои'}
            </p>
            <button
              type="button"
              onClick={() => replaceRef.current?.click()}
              title="Загрузить другой SVG"
              className="text-tertiary transition-fast hover:text-brand"
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
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <LayerTree
              layers={result.screen.layers}
              selectedIds={selectedIds}
              onSelect={select}
              onHover={setHoveredId}
              onRename={renameLayer}
              onDelete={deleteLayer}
              zoneIds={step === 3 ? zoneIds : undefined}
            />
          </div>
          <p className="truncate border-t border-border px-4 py-2 text-caption text-tertiary">
            {fileName} · {layerCount} {layerCount === 1 ? 'слой' : 'слоёв'} · {result.screen.width}×{result.screen.height}
          </p>
        </aside>
      )}

      {/* ── Center — step content + step bar ── */}
      <section className="relative min-w-0 flex-1">
        {step === 2 ? (
          <Step2Variants
            draft={draft}
            referenceSvg={result.svg}
            width={result.screen.width}
            height={result.screen.height}
            onKind={(kind) => patchDraft({ kind })}
            onBroken={(brokenSvg) => patchDraft({ brokenSvg })}
          />
        ) : step === 4 ? (
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
            onHover={setHoveredId}
            onMoveLayers={moveLayers}
            zoneIds={step === 3 ? zoneIds : undefined}
            svgHostRef={svgHostRef}
          />
        )}
        <StepBar step={step} onStep={setStep} enabledThrough={4} />
      </section>

      {/* ── Right — properties (step 1) or zone editor (step 3) ── */}
      {showRight && (
        <aside className="w-[248px] shrink-0 overflow-y-auto border-l border-border bg-elevated px-3 py-3">
          {step === 3 ? (
            selected ? (
              <ZoneEditor
                layer={selected}
                zone={selZone}
                onAdd={() => addZone(selected)}
                onRemove={() => selZone && removeZone(selZone.id)}
                onPatch={(patch) => selZone && patchZone(selZone.id, patch)}
              />
            ) : (
              <p className="px-1 pt-1 text-caption text-tertiary">
                Выбери слой на холсте или слева, чтобы отметить его зоной критики.
              </p>
            )
          ) : selected ? (
            <PropertiesPanel
              layer={selected}
              screen={result.screen}
              onRadius={(v) => mutate(selected.id, (el) => (el.setAttribute('rx', String(v)), el.setAttribute('ry', String(v))))}
              onFill={(v) => mutate(selected.id, (el) => el.setAttribute('fill', v))}
              onText={(v) => mutate(selected.id, (el) => (el.textContent = v))}
            />
          ) : (
            <p className="px-1 pt-1 text-caption text-tertiary">Выбери слой на холсте или в дереве.</p>
          )}
        </aside>
      )}
      </div>
    </div>
  );
}

function Dropzone({
  dragging,
  setDragging,
  onDrop,
  onFile,
}: {
  dragging: boolean;
  setDragging: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onFile: (f: File) => void;
}) {
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'flex w-full max-w-lg cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-base',
        dragging ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:border-brand/40',
      ].join(' ')}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
        <UploadCloud size={22} />
      </span>
      <div>
        <p className="text-callout font-semibold text-primary">Перетащи SVG или выбери файл</p>
        <p className="mt-1 text-footnote text-secondary">
          Экспортни фрейм из Figma как SVG — разберём на слои автоматически.
        </p>
      </div>
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
  );
}
