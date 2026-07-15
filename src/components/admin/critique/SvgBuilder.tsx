'use client';

import { useMemo, useRef, useState, useCallback, useLayoutEffect, forwardRef } from 'react';
import {
  Upload,
  Square,
  Type,
  Layers,
  Image as ImageIcon,
  PenTool,
  Ruler,
  Palette,
  Target,
  Check,
  RotateCcw,
} from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, LayerType } from '@/lib/editor/types';
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
 */

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

const LAYER_ICON: Record<LayerType, typeof Square> = {
  frame: Layers,
  text: Type,
  block: Square,
  image: ImageIcon,
  vector: PenTool,
};

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
  const [selected, setSelected] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Layer tree + faithful markup are always derived from the current `svg`, so
  // the persisted string is the only state that has to round-trip.
  const parsed = useMemo(() => (svg ? parseSvgToLayers(svg) : null), [svg]);
  const screen = parsed?.screen ?? null;
  const rendered = parsed?.svg ?? '';

  const flat = useMemo(() => (screen ? flatten(screen.layers) : []), [screen]);
  const selLayer = flat.find((f) => f.layer.id === selected)?.layer ?? null;
  const zoneByLayer = useMemo(() => {
    const m = new Map<string, CritiqueZone>();
    for (const z of zones) if (z.layerId) m.set(z.layerId, z);
    return m;
  }, [zones]);

  async function onImport(file: File) {
    setErrors([]);
    const text = await file.text();
    const result = parseSvgToLayers(text);
    if (result.errors.length) {
      setErrors(result.errors);
      return;
    }
    onSvg(result.svg);
    setSelected(null);
  }

  // Edit the selected layer by mutating the source markup, then re-emit it.
  const mutateLayer = useCallback(
    (id: string, fn: (el: Element) => void) => {
      if (!svg) return;
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const el = doc.querySelector(`[data-layer-id="${id}"]`);
      if (!el) return;
      fn(el);
      const root = doc.documentElement;
      onSvg(new XMLSerializer().serializeToString(root));
    },
    [svg, onSvg],
  );

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
        <div className="space-y-0.5">
          {flat.map(({ layer, depth }) => {
            const Icon = LAYER_ICON[layer.type];
            const isZone = zoneByLayer.has(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelected(layer.id)}
                style={{ paddingLeft: 8 + depth * 14 }}
                className={[
                  'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-caption transition-fast',
                  selected === layer.id ? 'bg-brand/10 text-brand' : 'text-secondary hover:bg-hover',
                ].join(' ')}
              >
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{layer.name}</span>
                {isZone && <Target size={11} className="ml-auto shrink-0 text-[#3FB950]" />}
              </button>
            );
          })}
        </div>
        <FileInput ref={fileRef} onPick={onImport} />
      </div>

      {/* ── Canvas ── */}
      <Canvas
        svg={rendered}
        viewBox={{ w: screen.width, h: screen.height }}
        selected={selected}
        zoneLayerIds={zoneByLayer}
        onSelect={setSelected}
      />

      {/* ── Inspector ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        {selLayer ? (
          <Inspector
            layer={selLayer}
            zone={zoneByLayer.get(selLayer.id)}
            onRadius={(v) => mutateLayer(selLayer.id, (el) => setRadius(el, v))}
            onFill={(v) => mutateLayer(selLayer.id, (el) => el.setAttribute('fill', v))}
            onText={(v) => mutateLayer(selLayer.id, (el) => (el.textContent = v))}
            onToggleZone={() => toggleZone(selLayer)}
          />
        ) : (
          <p className="text-caption text-tertiary">Выбери слой слева или на холсте.</p>
        )}
      </div>
    </div>
  );

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
}

/** Depth-first flatten of the layer tree for a flat, indented list. */
function flatten(layers: Layer[], depth = 0): { layer: Layer; depth: number }[] {
  const out: { layer: Layer; depth: number }[] = [];
  for (const l of layers) {
    out.push({ layer: l, depth });
    if (l.children.length) out.push(...flatten(l.children, depth + 1));
  }
  return out;
}

/** rx/ry for rects; ignored for other tags (kept simple — teacher edits blocks). */
function setRadius(el: Element, v: number) {
  el.setAttribute('rx', String(v));
  el.setAttribute('ry', String(v));
}

/** Bounding box of a rendered layer node as % of the SVG, measured from the DOM
 *  so it accounts for transforms and scale. Returns null if not on screen. */
function measureRect(layerId: string): CritiqueZone['rect'] | null {
  if (typeof document === 'undefined') return null;
  const node = document.querySelector<SVGGraphicsElement>(`#svgb-canvas [data-layer-id="${layerId}"]`);
  const svgEl = document.querySelector<SVGSVGElement>('#svgb-canvas svg');
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
}

function Canvas({
  svg,
  viewBox,
  selected,
  zoneLayerIds,
  onSelect,
}: {
  svg: string;
  viewBox: { w: number; h: number };
  selected: string | null;
  zoneLayerIds: Map<string, CritiqueZone>;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [outline, setOutline] = useState<{ left: number; top: number; w: number; h: number } | null>(null);

  // Position the selection outline over the selected node after every render.
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host || !selected) {
      setOutline(null);
      return;
    }
    const node = host.querySelector<SVGGraphicsElement>(`[data-layer-id="${selected}"]`);
    if (!node) {
      setOutline(null);
      return;
    }
    const nb = node.getBoundingClientRect();
    const hb = host.getBoundingClientRect();
    setOutline({ left: nb.left - hb.left, top: nb.top - hb.top, w: nb.width, h: nb.height });
  }, [selected, svg]);

  // Click-to-select: walk up from the clicked target to the nearest tagged layer.
  function onClick(e: React.MouseEvent) {
    let el = e.target as Element | null;
    while (el && el !== ref.current) {
      const id = el.getAttribute?.('data-layer-id');
      if (id) {
        onSelect(id);
        return;
      }
      el = el.parentElement;
    }
  }

  return (
    <div className="flex items-center justify-center rounded-xl border border-border bg-canvas p-4">
      <div
        id="svgb-canvas"
        ref={ref}
        onClick={onClick}
        className="relative w-full max-w-[300px] overflow-hidden rounded-xl border border-border shadow-sm [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        style={{ aspectRatio: viewBox.w && viewBox.h ? `${viewBox.w}/${viewBox.h}` : undefined }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {/* selection + zone outlines are siblings so they don't get wiped by innerHTML */}
      {outline && (
        <div
          className="pointer-events-none absolute rounded"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${outline.left}px, ${outline.top}px)`,
            width: outline.w,
            height: outline.h,
            outline: '2px solid var(--brand)',
            outlineOffset: -1,
          }}
        />
      )}
    </div>
  );
}

function Inspector({
  layer,
  zone,
  onRadius,
  onFill,
  onText,
  onToggleZone,
}: {
  layer: Layer;
  zone?: CritiqueZone;
  onRadius: (v: number) => void;
  onFill: (v: string) => void;
  onText: (v: string) => void;
  onToggleZone: () => void;
}) {
  const isZone = !!zone;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Свойства</p>
        <p className="mt-0.5 truncate text-footnote font-semibold text-primary">{layer.name}</p>
      </div>

      {layer.type === 'block' && (
        <InspectorRow icon={Ruler} label="Радиус">
          <input
            type="number"
            defaultValue={layer.props.radius ?? 0}
            onChange={(e) => onRadius(Number(e.target.value))}
            className="w-16 rounded border border-border bg-canvas px-2 py-1 text-caption tabular-nums text-primary"
          />
        </InspectorRow>
      )}

      {(layer.type === 'block' || layer.type === 'vector' || layer.type === 'frame') && (
        <InspectorRow icon={Palette} label="Фон">
          <ColorField value={layer.props.fill ?? '#000000'} onChange={onFill} />
        </InspectorRow>
      )}

      {layer.type === 'text' && (
        <>
          <InspectorRow icon={Palette} label="Цвет">
            <ColorField value={layer.props.color ?? '#000000'} onChange={onFill} />
          </InspectorRow>
          <div>
            <label className="mb-1 block text-caption text-tertiary">Текст</label>
            <textarea
              rows={2}
              defaultValue={layer.props.text ?? ''}
              onChange={(e) => onText(e.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          </div>
        </>
      )}

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={onToggleZone}
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
        <p className="mt-2 text-caption text-tertiary">
          {isZone
            ? 'Критерии зоны (роли, дефекты, починка) — в карточке ниже.'
            : 'Промоутнёт слой в кликабельную зону с критериями для ученика.'}
        </p>
      </div>
    </div>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-5 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      <input
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 rounded border border-border bg-canvas px-1.5 py-1 text-caption tabular-nums text-secondary"
      />
    </span>
  );
}

function InspectorRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Ruler;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-caption text-secondary">
        <Icon size={13} className="text-tertiary" /> {label}
      </span>
      {children}
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
