'use client';

import { useCallback, useMemo, useState } from 'react';
import { UploadCloud, Layers, AlertCircle, Tag, Palette, CornerUpLeft, Baseline } from 'lucide-react';
import { parseSvgToLayers } from '@/lib/editor/parseSvg';
import type { Layer, ParseResult } from '@/lib/editor/types';
import { LayerTree } from './LayerTree';
import { LayerCanvas } from './LayerCanvas';

/** Flatten the tree once so selection lookups don't re-walk on every render. */
function indexLayers(layers: Layer[], map: Map<string, Layer> = new Map()): Map<string, Layer> {
  for (const l of layers) {
    map.set(l.id, l);
    if (l.children.length) indexLayers(l.children, map);
  }
  return map;
}

export function EditorCore() {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const byId = useMemo(() => (result ? indexLayers(result.screen.layers) : new Map<string, Layer>()), [result]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const ingest = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseSvgToLayers(text);
    setResult(parsed);
    setFileName(file.name);
    setSelectedId(null);
    setHoveredId(null);
  }, []);

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

  if (!result || result.errors.length > 0 || layerCount === 0) {
    return (
      <div className="flex flex-col gap-4">
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-caption text-tertiary">
          <Layers size={14} /> {fileName} · {layerCount}{' '}
          {layerCount === 1 ? 'слой' : 'слоёв'} · {result.screen.width}×{result.screen.height}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setFileName(null);
          }}
          className="text-caption font-medium text-secondary transition-fast hover:text-primary"
        >
          Загрузить другой
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
        {/* Layers */}
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="mb-2 px-1 text-caption font-semibold uppercase tracking-wide text-tertiary">Слои</p>
          <LayerTree layers={result.screen.layers} selectedId={selectedId} onSelect={setSelectedId} onHover={setHoveredId} />
        </div>

        {/* Canvas */}
        <div className="flex items-start justify-center rounded-xl border border-border bg-surface p-6">
          <LayerCanvas svg={result.svg} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} onHover={setHoveredId} />
        </div>

        {/* Inspector (read-only preview of extracted props — editing comes next milestone) */}
        <div className="rounded-xl border border-border bg-elevated p-3">
          <p className="mb-3 px-1 text-caption font-semibold uppercase tracking-wide text-tertiary">Свойства</p>
          {selected ? <Inspector layer={selected} /> : (
            <p className="px-1 text-caption text-tertiary">Выбери слой на холсте или в дереве.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Inspector({ layer }: { layer: Layer }) {
  const { props } = layer;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-brand">
          <Tag size={13} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-footnote font-medium text-primary">{layer.name}</p>
          <p className="text-caption text-tertiary">{layer.type}</p>
        </div>
      </div>

      {props.radius != null && <PropRow icon={CornerUpLeft} label="Радиус" value={`${props.radius}`} />}
      {props.fill && <PropRow icon={Palette} label="Фон" value={props.fill} swatch={props.fill} />}
      {props.color && <PropRow icon={Palette} label="Цвет текста" value={props.color} swatch={props.color} />}
      {props.fontSize != null && <PropRow icon={Baseline} label="Кегль" value={`${props.fontSize}`} />}
      {props.text && (
        <div className="px-1">
          <p className="text-caption text-tertiary">Текст</p>
          <p className="mt-0.5 line-clamp-3 text-footnote text-secondary">«{props.text}»</p>
        </div>
      )}
      {props.radius == null && !props.fill && !props.color && props.fontSize == null && !props.text && (
        <p className="px-1 text-caption text-tertiary">Из этого слоя нечего вытащить — вектор/группа.</p>
      )}
    </div>
  );
}

function PropRow({ icon: Icon, label, value, swatch }: { icon: typeof Tag; label: string; value: string; swatch?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="flex items-center gap-1.5 text-caption text-tertiary">
        <Icon size={13} /> {label}
      </span>
      <span className="flex items-center gap-1.5 text-footnote tabular-nums text-primary">
        {swatch && <span className="h-3.5 w-3.5 rounded-[3px] border border-border" style={{ background: swatch }} />}
        {value}
      </span>
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
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-base',
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
