'use client';

import { useMemo, useRef, useState, useCallback, forwardRef } from 'react';
import { Upload, Target, Check, RotateCcw } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import { LayerTree } from '@/components/editor/LayerTree';
import { LayerCanvas } from '@/components/editor/LayerCanvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import type { Layer } from '@/lib/editor/types';
import type { CritiqueZone } from '@/lib/curriculum/types';

/**
 * The «Полный редактор экрана» (variant C) — a mini visual builder for the
 * screen-critique `svg` scene. The teacher imports an SVG frame (exported from
 * Figma), inspects its layer tree, tweaks a handful of props (radius / fill /
 * text), and promotes any layer into a critique zone. The SVG markup itself is
 * the single source of truth: the layer tree is *derived* from it every render
 * (via `parseSvgToLayers`, which deterministically re-tags `data-layer-id`), and
 * every edit mutates the markup and re-emits it. Zones link back to layers by
 * `layerId`; their `rect` is measured from the live DOM so it stays faithful
 * regardless of transforms or scale.
 *
 * Composes the shared milestone-2 renderer (`LayerTree` + `LayerCanvas`) so the
 * editor and the standalone `/admin/editor` demo stay in sync; the editing
 * inspector and zone promotion are what this component adds on top.
 */

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function SvgBuilder({
  svg,
  zones,
  onSvg,
  onZones,
}: {
  svg?: string;
  zones: CritiqueZone[];
  onSvg: (svg: string | undefined) => void;
  onZones: (zones: CritiqueZone[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  // Layer tree + faithful markup are always derived from the current `svg`, so
  // the persisted string is the only state that has to round-trip.
  const parsed = useMemo(() => (svg ? parseSvgToLayers(svg) : null), [svg]);
  const screen = parsed?.screen ?? null;
  const rendered = parsed?.svg ?? '';

  const byId = useMemo(() => {
    const m = new Map<string, Layer>();
    const walk = (ls: Layer[]) => ls.forEach((l) => (m.set(l.id, l), walk(l.children)));
    if (screen) walk(screen.layers);
    return m;
  }, [screen]);
  const selLayer = selectedId ? byId.get(selectedId) ?? null : null;

  const zoneByLayer = useMemo(() => {
    const m = new Map<string, CritiqueZone>();
    for (const z of zones) if (z.layerId) m.set(z.layerId, z);
    return m;
  }, [zones]);
  const zoneIds = useMemo(() => new Set(zoneByLayer.keys()), [zoneByLayer]);

  async function onImport(file: File) {
    setErrors([]);
    const text = await file.text();
    const result = parseSvgToLayers(text);
    if (result.errors.length) {
      setErrors(result.errors);
      return;
    }
    onSvg(result.svg);
    setSelectedId(null);
  }

  // Edit the selected layer by mutating the source markup, then re-emit it.
  const mutateLayer = useCallback(
    (id: string, fn: (el: Element) => void) => {
      if (!svg) return;
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const el = doc.querySelector(`[data-layer-id="${id}"]`);
      if (!el) return;
      fn(el);
      onSvg(new XMLSerializer().serializeToString(doc.documentElement));
    },
    [svg, onSvg],
  );

  // Bounding box of a rendered layer node as % of the SVG, measured from the DOM
  // so it accounts for transforms and responsive scaling.
  const measureRect = useCallback((layerId: string): CritiqueZone['rect'] | null => {
    const host = canvasWrapRef.current;
    if (!host) return null;
    const node = host.querySelector<SVGGraphicsElement>(`[data-layer-id="${layerId}"]`);
    const svgEl = host.querySelector('svg');
    if (!node || !svgEl) return null;
    const nb = node.getBoundingClientRect();
    const sb = svgEl.getBoundingClientRect();
    if (sb.width === 0 || sb.height === 0) return null;
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    return {
      x0: +clamp(((nb.left - sb.left) / sb.width) * 100).toFixed(1),
      y0: +clamp(((nb.top - sb.top) / sb.height) * 100).toFixed(1),
      x1: +clamp(((nb.right - sb.left) / sb.width) * 100).toFixed(1),
      y1: +clamp(((nb.bottom - sb.top) / sb.height) * 100).toFixed(1),
    };
  }, []);

  function toggleZone(layer: Layer) {
    const existing = zoneByLayer.get(layer.id);
    if (existing) {
      onZones(zones.filter((z) => z.id !== existing.id));
      return;
    }
    const rect = measureRect(layer.id);
    onZones([
      ...zones,
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
    ]);
  }

  if (!svg || !screen) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-8">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Upload size={22} />
          </span>
          <p className="text-callout font-semibold text-primary">Импортируй экран из Figma</p>
          <p className="mt-1 text-footnote text-secondary">
            Экспортируй фрейм как SVG (Export → SVG) и загрузи сюда. Разберём его на слои — сможешь
            править радиусы, цвета, текст и отмечать зоны критики.
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-footnote font-medium text-on-brand transition-fast hover:opacity-90"
          >
            <Upload size={15} /> Загрузить SVG
          </button>
          {errors.length > 0 && (
            <div className="mt-3 w-full rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-caption text-danger">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
        </div>
        <FileInput ref={fileRef} onPick={onImport} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_240px]">
      {/* ── Layers ── */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Слои</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Заменить SVG"
            className="text-tertiary hover:text-brand"
          >
            <RotateCcw size={13} />
          </button>
        </div>
        <LayerTree
          layers={screen.layers}
          selectedIds={selectedId ? [selectedId] : []}
          onSelect={(id) => setSelectedId(id)}
          onHover={setHoveredId}
          zoneIds={zoneIds}
        />
        <FileInput ref={fileRef} onPick={onImport} />
      </div>

      {/* ── Canvas ── */}
      <div ref={canvasWrapRef} className="flex items-center justify-center rounded-xl border border-border bg-canvas p-4">
        <LayerCanvas
          svg={rendered}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
        />
      </div>

      {/* ── Properties ── */}
      <div className="rounded-xl border border-border bg-surface p-3">
        {selLayer ? (
          <PropertiesPanel
            layer={selLayer}
            screen={screen}
            onRadius={(v) => mutateLayer(selLayer.id, (el) => setRadius(el, v))}
            onFill={(v) => mutateLayer(selLayer.id, (el) => el.setAttribute('fill', v))}
            onText={(v) => mutateLayer(selLayer.id, (el) => (el.textContent = v))}
            footer={<ZoneAction isZone={!!zoneByLayer.get(selLayer.id)} onToggle={() => toggleZone(selLayer)} />}
          />
        ) : (
          <p className="p-1 text-caption text-tertiary">Выбери слой слева или на холсте.</p>
        )}
      </div>
    </div>
  );
}

/** rx/ry for rects (kept simple — teacher edits block corners). */
function setRadius(el: Element, v: number) {
  el.setAttribute('rx', String(v));
  el.setAttribute('ry', String(v));
}

/** The critique-zone toggle that docks under the properties sections. */
function ZoneAction({ isZone, onToggle }: { isZone: boolean; onToggle: () => void }) {
  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={onToggle}
        className={[
          'w-full rounded-lg py-2 text-footnote font-medium transition-fast',
          isZone
            ? 'bg-[#3FB950]/10 text-[#3FB950] hover:bg-[#3FB950]/15'
            : 'bg-brand/10 text-brand hover:bg-brand/15',
        ].join(' ')}
      >
        {isZone ? (
          <span className="inline-flex items-center gap-1.5">
            <Check size={14} /> Зона критики — убрать
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Target size={14} /> Сделать зоной критики
          </span>
        )}
      </button>
      <p className="mt-2 px-1 text-caption text-tertiary">
        {isZone
          ? 'Критерии зоны (роли, дефекты, починка) — в карточке ниже.'
          : 'Промоутнёт слой в кликабельную зону с критериями для ученика.'}
      </p>
    </div>
  );
}

const FileInput = forwardRef<HTMLInputElement, { onPick: (f: File) => void }>(
  function FileInput({ onPick }, ref) {
    return (
      <input
        ref={ref}
        type="file"
        accept="image/svg+xml,.svg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    );
  },
);
