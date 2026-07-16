'use client';

import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Rows3,
  Columns3,
  LayoutGrid,
  MousePointer2,
  Plus,
  Scissors,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Layer, ParsedScreen } from '@/lib/editor/types';

/**
 * The Figma-style properties panel — a read-across-then-edit inspector for the
 * selected layer, structured into the same sections Figma surfaces on the right:
 * Position, Layout, Appearance, Fill, Stroke, Effects. Values are derived from
 * the parsed layer (geometry is best-effort, so unknowns read «—»/«Mixed»); the
 * handful the teacher actually edits — corner radius, fill, text — become live
 * inputs when the matching `on*` callback is supplied, and stay read-only in the
 * standalone viewer where none is. The critique-zone action, when passed, docks
 * under the sections as the panel's footer.
 */
export function PropertiesPanel({
  layer,
  screen,
  onRadius,
  onFill,
  onText,
  onResize,
  onToggleClip,
  footer,
}: {
  layer: Layer;
  screen?: ParsedScreen | null;
  onRadius?: (v: number) => void;
  onFill?: (v: string) => void;
  onText?: (v: string) => void;
  onResize?: (w: number, h: number) => void;
  onToggleClip?: (on: boolean) => void;
  footer?: React.ReactNode;
}) {
  const { props } = layer;
  const box = props.box;
  const isFrame = layer.type === 'frame';
  // A REAL frame (explicit auto-layout or a framified group) vs a plain group.
  // Only real frames get frame-only affordances like "Clip content" — a plain
  // group has no clip toggle, matching Figma.
  const isRealFrame = isFrame && !!props.frame;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-1 pb-3">
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">Свойства</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-footnote font-semibold text-primary">
          {layer.name}
          <span className="rounded bg-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-tertiary">
            {typeLabel(layer)}
          </span>
        </p>
      </div>

      {/* ── Position ── */}
      <Section title="Позиция">
        <div className="mb-2 flex items-center gap-1">
          {[AlignStartVertical, AlignCenterVertical, AlignEndVertical].map((I, i) => (
            <GhostBtn key={i} Icon={I} />
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {[AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal].map((I, i) => (
            <GhostBtn key={i} Icon={I} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="X" value={box ? round(box.x) : 'Mixed'} />
          <Field label="Y" value={box ? round(box.y) : 'Mixed'} />
        </div>
      </Section>

      {/* ── Layout ── */}
      <Section title="Раскладка">
        {isFrame && (
          <div className="mb-2 flex items-center gap-1">
            <FlowChip Icon={Columns3} label="Ряд" active={props.layout === 'row'} />
            <FlowChip Icon={Rows3} label="Колонка" active={props.layout === 'column'} />
            <FlowChip Icon={LayoutGrid} label="Сетка" active={props.layout === 'grid'} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {onResize && box ? (
            <>
              <CommitField label="Ш" value={round(box.w)} onCommit={(v) => onResize(v, Math.round(box.h))} />
              <CommitField label="В" value={round(box.h)} onCommit={(v) => onResize(Math.round(box.w), v)} />
            </>
          ) : (
            <>
              <Field label="Ш" value={box ? round(box.w) : 'Mixed'} />
              <Field label="В" value={box ? round(box.h) : 'Mixed'} />
            </>
          )}
        </div>
        {isRealFrame && onToggleClip && (
          <ClipToggle checked={!!props.clip} onChange={onToggleClip} />
        )}
      </Section>

      {/* ── Appearance ── */}
      <Section title="Внешний вид">
        <div className="grid grid-cols-2 gap-1.5">
          <Field label="Прозр." value={props.opacity != null ? `${Math.round(props.opacity * 100)}%` : '100%'} />
          {layer.type === 'block' ? (
            <EditableField
              label="Радиус"
              value={props.radius ?? 0}
              onChange={onRadius}
            />
          ) : (
            <Field label="Радиус" value={props.radius != null ? String(props.radius) : '—'} />
          )}
        </div>
      </Section>

      {/* ── Fill ── */}
      <Section
        title="Заливка"
        action={<PlusBtn />}
      >
        {props.fill || props.color ? (
          <ColorRow
            value={(props.fill ?? props.color) as string}
            onChange={onFill}
          />
        ) : (
          <p className="px-1 text-caption text-tertiary">Нет заливки</p>
        )}
      </Section>

      {/* ── Text ── */}
      {layer.type === 'text' && (
        <Section title="Текст">
          {onText ? (
            <textarea
              rows={2}
              defaultValue={props.text ?? ''}
              onChange={(e) => onText(e.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          ) : (
            <p className="line-clamp-3 px-1 text-caption text-secondary">«{props.text}»</p>
          )}
          {(props.fontSize != null || props.fontWeight) && (
            <p className="mt-1.5 px-1 text-caption tabular-nums text-tertiary">
              {props.fontSize != null ? `${props.fontSize}px` : ''}
              {props.fontWeight ? ` · ${props.fontWeight}` : ''}
            </p>
          )}
        </Section>
      )}

      {/* ── Stroke / Effects (parity with Figma; not authored here) ── */}
      <Section title="Обводка" action={<PlusBtn />} muted />
      <Section title="Эффекты" action={<PlusBtn />} muted last />

      {footer && <div className="pt-3">{footer}</div>}
    </div>
  );
}

function typeLabel(layer: Layer): string {
  if (layer.type === 'frame') {
    // Plain groups (no explicit frame flag) read as "Group". A real frame is
    // "Auto" only for an explicit auto-layout (row / column — the two the menu
    // offers); `grid`/`none` are parse-time inferences, so it reads as "Frame".
    if (!layer.props.frame) return 'Group';
    return layer.props.layout === 'row' || layer.props.layout === 'column' ? 'Auto' : 'Frame';
  }
  const map: Record<string, string> = { text: 'Text', block: 'Block', image: 'Image', vector: 'Vector' };
  return map[layer.type] ?? layer.type;
}

const round = (n: number) => String(Math.round(n));

function Section({
  title,
  action,
  children,
  muted,
  last,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <div className={['py-3', last ? '' : 'border-b border-border'].join(' ')}>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className={['text-caption font-medium', muted ? 'text-tertiary' : 'text-secondary'].join(' ')}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Read-only value field — Figma's boxed metric cell. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2 py-1.5">
      <span className="text-caption text-tertiary">{label}</span>
      <span className="truncate text-caption tabular-nums text-primary">{value}</span>
    </div>
  );
}

/** Editable numeric field (radius) — same cell, live input. */
function EditableField({ label, value, onChange }: { label: string; value: number; onChange?: (v: number) => void }) {
  if (!onChange) return <Field label={label} value={String(value)} />;
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2 py-1.5 focus-within:border-brand">
      <span className="text-caption text-tertiary">{label}</span>
      <input
        type="number"
        defaultValue={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-caption tabular-nums text-primary outline-none"
      />
    </label>
  );
}

/** Numeric field that commits on Enter/blur (not per keystroke) — for W/H so the
 *  artboard doesn't resize on every digit. Re-syncs when the value changes. */
function CommitField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: number) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && n > 0 && String(Math.round(n)) !== value) onCommit(Math.round(n));
    else setText(value);
  };
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2 py-1.5 focus-within:border-brand">
      <span className="text-caption text-tertiary">{label}</span>
      <input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={commit}
        className="w-full min-w-0 bg-transparent text-caption tabular-nums text-primary outline-none"
      />
    </label>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-2 py-1.5">
      {onChange ? (
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-4 w-4 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
          aria-label="Цвет заливки"
        />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded border border-border" style={{ background: value }} />
      )}
      {onChange ? (
        <input
          defaultValue={value.replace(/^#/, '').toUpperCase()}
          onChange={(e) => onChange(`#${e.target.value.replace(/^#/, '')}`)}
          className="w-full min-w-0 bg-transparent text-caption uppercase tabular-nums text-primary outline-none"
        />
      ) : (
        <span className="truncate text-caption uppercase tabular-nums text-primary">{value.replace(/^#/, '')}</span>
      )}
      <span className="shrink-0 text-caption tabular-nums text-tertiary">100%</span>
    </div>
  );
}

function GhostBtn({ Icon }: { Icon: typeof MousePointer2 }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded text-tertiary">
      <Icon size={13} />
    </span>
  );
}

function FlowChip({ Icon, label, active }: { Icon: typeof MousePointer2; label: string; active?: boolean }) {
  return (
    <span
      title={label}
      className={[
        'flex h-6 flex-1 items-center justify-center rounded border text-tertiary',
        active ? 'border-brand bg-brand/10 text-brand' : 'border-border bg-canvas',
      ].join(' ')}
    >
      <Icon size={13} />
    </span>
  );
}

/** Figma-style "Обрезать содержимое" row: a label + a switch that clips the
 *  frame's children to its bounds. */
function ClipToggle({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-footnote text-secondary transition-fast hover:text-primary"
    >
      <Scissors size={13} className="text-tertiary" />
      <span className="flex-1">Обрезать содержимое</span>
      <span
        className={[
          'relative h-4 w-7 shrink-0 rounded-full transition-fast',
          checked ? 'bg-brand' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-fast',
            checked ? 'left-3.5' : 'left-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}

function PlusBtn() {
  return (
    <span className="flex h-4 w-4 items-center justify-center text-tertiary">
      <Plus size={13} />
    </span>
  );
}
