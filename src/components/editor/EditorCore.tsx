'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, AlertCircle, RotateCcw } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, ParseResult } from '@/lib/editor/types';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<EditorStep>(1);
  const [draft, setDraft] = useState<EditorDraft>(EMPTY_DRAFT);
  const replaceRef = useRef<HTMLInputElement>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  // ── Undo / redo ──────────────────────────────────────────────────────────
  // Snapshots capture the two mutable pieces of authoring state (the SVG markup
  // + the draft). Both are updated immutably everywhere, so a snapshot can hold
  // plain references. `latest` mirrors the committed state each render, so an
  // action calls `pushUndo()` first to bank the *pre-change* snapshot.
  type Snap = { svg: string; draft: EditorDraft };
  const latest = useRef<Snap | null>(null);
  const undoStack = useRef<Snap[]>([]);
  const redoStack = useRef<Snap[]>([]);

  const applySnap = useCallback((s: Snap) => {
    setResult((r) => (r ? { ...r, svg: s.svg } : r));
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
  latest.current = result ? { svg: result.svg, draft } : null;

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
    setResult(parseSvgToLayers(text));
    setFileName(file.name);
    setSelectedId(null);
    setHoveredId(null);
    setStep(1);
    setDraft(EMPTY_DRAFT);
    undoStack.current = [];
    redoStack.current = [];
  }, []);

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

  const moveLayer = useCallback(
    (id: string, dx: number, dy: number) =>
      mutate(id, (el) => {
        const prev = el.getAttribute('transform') ?? '';
        el.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) ${prev}`.trim());
      }),
    [mutate],
  );

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

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Dropzone dragging={dragging} setDragging={setDragging} onDrop={onDrop} onFile={ingest} />
        {result && result.errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 px-4 py-3 text-footnote text-warning">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{result.errors.join(' ')}</span>
          </div>
        )}
      </div>
    );
  }

  const selZone = selected ? zoneByLayer.get(selected.id) : undefined;
  const showLeft = step === 1 || step === 3;
  const showRight = step === 1 || step === 3;

  return (
    <div className="flex h-full min-h-0">
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
              selectedId={selectedId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
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
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={setSelectedId}
            onHover={setHoveredId}
            onMoveLayer={moveLayer}
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
