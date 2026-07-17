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
  Check,
  Blend,
  Scan,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Layer, ParsedScreen } from '@/lib/editor/types';
import { useT } from '@/lib/i18n/client';

import { ColorPicker } from './ColorPicker';

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
  liveBox,
  onRadius,
  onFill,
  onOpacity,
  onStroke,
  onStrokeWidth,
  onLayout,
  onMove,
  onAlign,
  onText,
  onFontSize,
  onFontWeight,
  onResize,
  onToggleClip,
  footer,
}: {
  layer: Layer;
  screen?: ParsedScreen | null;
  /** Live-measured geometry (root user space) — preferred over the stale tree box. */
  liveBox?: { x: number; y: number; w: number; h: number } | null;
  onRadius?: (v: number) => void;
  onFill?: (v: string) => void;
  onOpacity?: (v: number) => void;
  onStroke?: (v: string | null) => void;
  onStrokeWidth?: (v: number) => void;
  onLayout?: (l: 'row' | 'column' | 'grid' | 'none') => void;
  onMove?: (x: number, y: number) => void;
  onAlign?: (edge: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
  onText?: (v: string) => void;
  onFontSize?: (v: number) => void;
  onFontWeight?: (v: number) => void;
  onResize?: (w: number, h: number) => void;
  onToggleClip?: (on: boolean) => void;
  footer?: React.ReactNode;
}) {
  const { t } = useT();
  const { props } = layer;
  // Prefer the live-measured box (accurate after transforms) over the parse-time
  // tree box, which goes stale once a layer is moved/scaled.
  const box = liveBox ?? props.box;
  const isFrame = layer.type === 'frame';
  // A REAL frame (explicit auto-layout or a framified group) vs a plain group.
  // Only real frames get frame-only affordances like "Clip content" — a plain
  // group has no clip toggle, matching Figma.
  const isRealFrame = isFrame && !!props.frame;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="pb-2">
        <p className="text-caption font-medium uppercase tracking-wide text-tertiary">{t('editor.props.properties')}</p>
        {/* `truncate` on the flex row itself does nothing — ellipsis needs a
            block box, and a bare text node can't be styled. The name gets its
            own min-w-0 span; the badge never gives up width. */}
        <p className="mt-0.5 flex items-center gap-1.5 text-footnote font-semibold text-primary">
          <span className="min-w-0 truncate" title={layer.name}>{layer.name}</span>
          <span className="shrink-0 rounded bg-hover px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-tertiary">
            {t(typeLabelKey(layer))}
          </span>
        </p>
      </div>

      {/* ── Position ── */}
      <Section title={t('editor.props.position')}>
        <div className="mb-1.5 flex items-center gap-1">
          {(
            [
              [AlignStartVertical, 'left'],
              [AlignCenterVertical, 'hcenter'],
              [AlignEndVertical, 'right'],
            ] as const
          ).map(([I, edge], i) => (
            <GhostBtn key={i} Icon={I} onClick={onAlign ? () => onAlign(edge) : undefined} />
          ))}
          {/* w-[1px], not w-px: `px` isn't a spacing token and Tailwind's scale is
              replaced wholesale, so `w-px` generates no class and the rule vanishes. */}
          <span className="mx-0.5 h-3.5 w-[1px] shrink-0 bg-border-strong" />
          {(
            [
              [AlignStartHorizontal, 'top'],
              [AlignCenterHorizontal, 'vcenter'],
              [AlignEndHorizontal, 'bottom'],
            ] as const
          ).map(([I, edge], i) => (
            <GhostBtn key={i} Icon={I} onClick={onAlign ? () => onAlign(edge) : undefined} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {onMove && box ? (
            <>
              <ScrubField label="X" value={Math.round(box.x)} onCommit={(v) => onMove(v, Math.round(box.y))} allowNeg />
              <ScrubField label="Y" value={Math.round(box.y)} onCommit={(v) => onMove(Math.round(box.x), v)} allowNeg />
            </>
          ) : (
            <>
              <Field label="X" value={box ? round(box.x) : 'Mixed'} />
              <Field label="Y" value={box ? round(box.y) : 'Mixed'} />
            </>
          )}
        </div>
      </Section>

      {/* ── Layout ── */}
      <Section title={t('editor.props.layout')}>
        {isFrame && (
          <div className="mb-1.5 flex items-center gap-1">
            <FlowChip
              Icon={Columns3}
              label={t('editor.props.row')}
              active={props.layout === 'row'}
              onClick={onLayout ? () => onLayout(props.layout === 'row' ? 'none' : 'row') : undefined}
            />
            <FlowChip
              Icon={Rows3}
              label={t('editor.props.column')}
              active={props.layout === 'column'}
              onClick={onLayout ? () => onLayout(props.layout === 'column' ? 'none' : 'column') : undefined}
            />
            <FlowChip
              Icon={LayoutGrid}
              label={t('editor.props.grid')}
              active={props.layout === 'grid'}
              onClick={onLayout ? () => onLayout(props.layout === 'grid' ? 'none' : 'grid') : undefined}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-1">
          {onResize && box ? (
            <>
              <ScrubField label={t('editor.props.w')} value={Math.round(box.w)} onCommit={(v) => onResize(v, Math.round(box.h))} min={1} />
              <ScrubField label={t('editor.props.h')} value={Math.round(box.h)} onCommit={(v) => onResize(Math.round(box.w), v)} min={1} />
            </>
          ) : (
            <>
              <Field label={t('editor.props.w')} value={box ? round(box.w) : 'Mixed'} />
              <Field label={t('editor.props.h')} value={box ? round(box.h) : 'Mixed'} />
            </>
          )}
        </div>
        {isRealFrame && onToggleClip && (
          <ClipToggle checked={!!props.clip} onChange={onToggleClip} />
        )}
      </Section>

      {/* ── Appearance ── */}
      <Section title={t('editor.props.appearance')}>
        <div className="grid grid-cols-2 gap-1">
          {onOpacity ? (
            <ScrubField
              label={t('editor.props.opacity')}
              Icon={Blend}
              value={props.opacity != null ? Math.round(props.opacity * 100) : 100}
              onCommit={(pct) => onOpacity(pct / 100)}
              min={0}
              max={100}
              suffix="%"
            />
          ) : (
            <Field label={t('editor.props.opacity')} Icon={Blend} value={props.opacity != null ? `${Math.round(props.opacity * 100)}%` : '100%'} />
          )}
          {layer.type === 'block' && onRadius ? (
            <ScrubField label={t('editor.props.radius')} Icon={Scan} value={props.radius ?? 0} onCommit={onRadius} min={0} />
          ) : (
            <Field label={t('editor.props.radius')} Icon={Scan} value={props.radius != null ? String(props.radius) : '—'} />
          )}
        </div>
      </Section>

      {/* ── Fill ── */}
      <Section
        title={t('editor.props.fill')}
        action={<PlusBtn />}
      >
        {props.fill || props.color ? (
          <ColorRow
            value={(props.fill ?? props.color) as string}
            onChange={onFill}
            opacity={props.opacity ?? 1}
            onOpacity={onOpacity}
          />
        ) : (
          <p className="text-caption text-tertiary">{t('editor.props.noFill')}</p>
        )}
      </Section>

      {/* ── Text ── */}
      {layer.type === 'text' && (
        <Section title={t('editor.props.text')}>
          {onText ? (
            <textarea
              rows={2}
              defaultValue={props.text ?? ''}
              onChange={(e) => onText(e.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-canvas px-2 py-1.5 text-caption text-primary"
            />
          ) : (
            <p className="line-clamp-3 text-caption text-secondary">«{props.text}»</p>
          )}
          {onFontSize || onFontWeight ? (
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              <ScrubField
                label={t('editor.props.fontSize')}
                value={Math.round(props.fontSize ?? 16)}
                min={1}
                max={400}
                onCommit={(v) => onFontSize?.(v)}
              />
              <ScrubField
                label={t('editor.props.fontWeight')}
                value={Number(props.fontWeight) || 400}
                min={100}
                max={900}
                // Weights are a 100-step scale; scrubbing lands on every integer,
                // so snap before it reaches the SVG.
                onCommit={(v) => onFontWeight?.(Math.round(v / 100) * 100)}
              />
            </div>
          ) : (
            (props.fontSize != null || props.fontWeight) && (
              <p className="mt-1.5 text-caption tabular-nums text-tertiary">
                {props.fontSize != null ? `${props.fontSize}px` : ''}
                {props.fontWeight ? ` · ${props.fontWeight}` : ''}
              </p>
            )
          )}
        </Section>
      )}

      {/* ── Stroke ── */}
      {(() => {
        const hasStroke = !!props.stroke;
        return (
          <Section
            title={t('editor.props.stroke')}
            muted={!hasStroke && !onStroke}
            action={
              !hasStroke && onStroke ? (
                <PlusBtn onClick={() => onStroke(DEFAULT_STROKE)} title={t('editor.props.addStroke')} />
              ) : (
                <PlusBtn />
              )
            }
          >
            {hasStroke ? (
              <>
                <ColorRow value={props.stroke as string} onChange={onStroke ? (v) => onStroke(v) : undefined} />
                {onStrokeWidth && (
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <ScrubField
                      label={t('editor.props.strokeWidth')}
                      value={Math.round(props.strokeWidth ?? 1)}
                      onCommit={(v) => onStrokeWidth(v)}
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => onStroke?.(null)}
                      className="flex items-center justify-center rounded-md border border-border bg-surface px-2 py-1.5 text-caption text-tertiary transition-fast hover:border-border-strong hover:text-primary focus-visible:!outline-none"
                    >
                      {t('editor.props.removeStroke')}
                    </button>
                  </div>
                )}
              </>
            ) : onStroke ? null : (
              <p className="text-caption text-tertiary">{t('editor.props.noStroke')}</p>
            )}
          </Section>
        );
      })()}

      {/* ── Effects (parity with Figma; not authored here) ── */}
      <Section title={t('editor.props.effects')} action={<PlusBtn />} muted last />

      {footer && <div className="pt-3">{footer}</div>}
    </div>
  );
}

/** i18n key for the type badge. Plain groups read as "Group"; a real frame is
 *  "Auto" for an explicit auto-layout (row / column) and "Frame" otherwise. */
function typeLabelKey(layer: Layer): string {
  if (layer.type === 'frame') {
    if (!layer.props.frame) return 'editor.props.typeGroup';
    return layer.props.layout === 'row' || layer.props.layout === 'column'
      ? 'editor.props.typeAuto'
      : 'editor.props.typeFrame';
  }
  const map: Record<string, string> = {
    text: 'editor.props.typeText',
    block: 'editor.props.typeBlock',
    image: 'editor.props.typeImage',
    vector: 'editor.props.typeVector',
  };
  return map[layer.type] ?? layer.type;
}

const round = (n: number) => String(Math.round(n));

/**
 * Shared field-cell styling so every inspector control reads identically.
 * Rest: soft `bg-surface` fill with a barely-there hairline. Hover firms the
 * border to `border-strong`. Focus swaps to a single brand border + soft ring
 * (the inner inputs suppress their own `:focus-visible` outline via `!outline-none`
 * so the ring never doubles up). `FIELD_STATIC` is the read-only variant.
 */
const FIELD_BASE =
  'flex items-center gap-2 rounded-sm border bg-surface px-2 py-1 transition-fast';
export const FIELD_STATIC = `${FIELD_BASE} border-border`;
export const FIELD_INTERACTIVE =
  `group ${FIELD_BASE} border-border hover:border-border-strong ` +
  'focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25';

/**
 * Shared icon-button styling (the section «+», the align glyphs). Rest is a bare
 * glyph; hover/focus lay the translucent `bg-hover` wash under it and firm the
 * glyph to `text-primary`; press deepens to `bg-pressed`. Never a solid fill —
 * an opaque swatch here reads as a hole punched in the panel.
 */
export const ICON_BTN =
  'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-tertiary transition-fast ' +
  'hover:bg-hover hover:text-primary active:bg-pressed ' +
  'focus-visible:!outline-none focus-visible:bg-hover focus-visible:text-primary';

/** Seed color when adding a stroke from scratch — a neutral dark border. */
const DEFAULT_STROKE = '#1A1A1A';

/**
 * The panel's one numeric cell — a Figma-style scrubbable field. The label is a
 * drag handle (grab it, drag left/right to nudge the value with an `ew-resize`
 * cursor); the input takes free text and commits on Enter/blur. Values clamp to
 * [min, max] and reject non-numeric junk. `onCommit` fires live during a scrub
 * (so the canvas previews) and once when a typed value settles. An optional
 * `suffix` renders a trailing unit (e.g. «%»).
 */
export function ScrubField({
  label,
  Icon,
  value,
  onCommit,
  min,
  max,
  allowNeg,
  suffix,
}: {
  /** Always required, even alongside `Icon`: it stays the field's accessible name
   *  and its tooltip, since a glyph on its own names nothing. */
  label: string;
  /** Draws the handle as a glyph instead of text — a word like «Прозрачность»
   *  costs more width than the value it labels. */
  Icon?: typeof MousePointer2;
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  allowNeg?: boolean;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const editing = useState(false);
  const isEditing = editing[0];
  const setEditing = editing[1];
  // Re-sync from upstream only while not being typed into (so external edits show).
  useEffect(() => {
    if (!isEditing) setText(String(value));
  }, [value, isEditing]);

  const clampNum = (n: number) => {
    let r = Math.round(n);
    if (!allowNeg && r < 0) r = 0;
    if (min != null) r = Math.max(min, r);
    if (max != null) r = Math.min(max, r);
    return r;
  };

  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n) && text.trim() !== '' && text.trim() !== '-') {
      const c = clampNum(n);
      if (c !== value) onCommit(c);
      setText(String(c));
    } else {
      setText(String(value));
    }
    setEditing(false);
  };

  // Drag the label to scrub: 2px of travel per unit, clamped live.
  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    let last = startVal;
    const move = (ev: PointerEvent) => {
      const next = clampNum(startVal + Math.round((ev.clientX - startX) / 2));
      if (next !== last) {
        last = next;
        onCommit(next);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <label className={FIELD_INTERACTIVE}>
      <span
        title={label}
        onPointerDown={startScrub}
        className="flex shrink-0 cursor-ew-resize select-none items-center text-caption text-tertiary transition-fast group-hover:text-secondary"
      >
        {Icon ? <Icon size={12} strokeWidth={2} aria-hidden /> : label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text}
        onFocus={() => setEditing(true)}
        onChange={(e) => {
          const raw = e.target.value.replace(allowNeg ? /[^0-9-]/g : /[^0-9]/g, '');
          setText(raw);
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        onBlur={commit}
        className="w-full min-w-0 bg-transparent text-caption tabular-nums text-primary !outline-none focus-visible:!outline-none"
      />
      {suffix && <span className="shrink-0 text-caption text-tertiary">{suffix}</span>}
    </label>
  );
}

export function Section({
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
  // No horizontal padding of its own — the rail's px-3 is the single left edge
  // every section, field and the zone block below align to.
  return (
    <div className={['py-2', last ? '' : 'border-b border-border'].join(' ')}>
      <div className="mb-1.5 flex items-center justify-between">
        <p className={['min-w-0 truncate text-caption font-medium', muted ? 'text-tertiary' : 'text-secondary'].join(' ')} title={title}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Read-only value field — Figma's boxed metric cell. Mirrors ScrubField's glyph
 *  handling so a section reads identically whether or not it's editable here. */
export function Field({ label, Icon, value }: { label: string; Icon?: typeof MousePointer2; value: string }) {
  return (
    <div className={FIELD_STATIC} title={Icon ? label : undefined}>
      <span className="flex shrink-0 items-center text-caption text-tertiary">
        {Icon ? <Icon size={12} strokeWidth={2} aria-hidden /> : label}
      </span>
      <span className="truncate text-caption tabular-nums text-primary">{value}</span>
    </div>
  );
}

export function ColorRow({
  value,
  onChange,
  opacity,
  onOpacity,
}: {
  value: string;
  onChange?: (v: string) => void;
  opacity?: number;
  onOpacity?: (v: number) => void;
}) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
  if (onChange)
    return (
      <ColorPicker
        value={hex}
        onChange={onChange}
        opacity={opacity}
        onOpacityChange={onOpacity}
      />
    );
  return (
    <div className={`${FIELD_STATIC} gap-2`}>
      <span className="h-4 w-4 shrink-0 rounded-sm border border-border-strong" style={{ background: value }} />
      <span className="truncate text-caption uppercase tabular-nums text-primary">{value.replace(/^#/, '')}</span>
      <span className="shrink-0 text-caption tabular-nums text-tertiary">100%</span>
    </div>
  );
}

export function GhostBtn({ Icon, onClick }: { Icon: typeof MousePointer2; onClick?: () => void }) {
  if (!onClick) {
    return (
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-tertiary">
        <Icon size={13} />
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={ICON_BTN}>
      <Icon size={13} />
    </button>
  );
}

export function FlowChip({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: typeof MousePointer2;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  // An active chip stays interactive — clicking it turns the layout off — so it
  // gets its own hover/press instead of going inert once selected.
  const cls = [
    'flex h-6 flex-1 items-center justify-center rounded-sm border transition-fast focus-visible:!outline-none',
    active
      ? 'border-brand bg-brand/12 text-brand'
      : 'border-border bg-surface text-tertiary',
    onClick && !active
      ? 'hover:border-border-strong hover:bg-hover hover:text-secondary active:bg-pressed focus-visible:border-border-strong focus-visible:text-secondary'
      : '',
    onClick && active ? 'hover:bg-brand/20 active:bg-brand/25' : '',
  ].join(' ');
  if (!onClick) {
    return (
      <span title={label} className={cls}>
        <Icon size={13} />
      </span>
    );
  }
  return (
    <button type="button" title={label} onClick={onClick} className={cls}>
      <Icon size={13} />
    </button>
  );
}

/** Figma-style "Обрезать содержимое" row: a label + a switch that clips the
 *  frame's children to its bounds. */
export function ClipToggle({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="mt-1.5 flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-footnote text-secondary transition-fast hover:text-primary"
    >
      <span
        className={[
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-fast',
          checked ? 'border-brand bg-brand text-white' : 'border-border',
        ].join(' ')}
      >
        {checked && <Check size={10} strokeWidth={3} />}
      </span>
      {/* min-w-0 or the flex item refuses to shrink below its text and truncate
          never fires — the row just overflows instead. */}
      <span className="min-w-0 flex-1 truncate" title={t('editor.props.clipContent')}>
        {t('editor.props.clipContent')}
      </span>
    </button>
  );
}

export function PlusBtn({ onClick, title }: { onClick?: () => void; title?: string } = {}) {
  if (!onClick) {
    return (
      <span className="flex h-[26px] w-[26px] items-center justify-center text-tertiary">
        <Plus size={13} />
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} className={ICON_BTN}>
      <Plus size={13} />
    </button>
  );
}
