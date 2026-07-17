'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n/client';

/**
 * A custom, self-contained colour picker — the Figma-style swatch + popover used
 * in the properties panel's Fill section. Built from divs (no native
 * `<input type="color">`) so that (a) it looks consistent across platforms and
 * (b) dragging never traps focus in a form control, which is what broke Ctrl+Z.
 *
 * The picker works in HSV: a saturation/value square, a hue rail, an opacity
 * rail, plus HEX + RGB text fields. Every drag/keystroke fires `onChange` live so
 * the canvas previews in real time; `onChangeEnd` fires once the gesture settles,
 * letting the host collapse the whole drag into a single undo step.
 */
export function ColorPicker({
  value,
  onChange,
  onChangeEnd,
  opacity,
  onOpacityChange,
}: {
  value: string;
  onChange: (hex: string) => void;
  onChangeEnd?: () => void;
  /** Optional alpha (0–1). When paired with `onOpacityChange`, the picker shows
   *  the live percentage and an opacity slider; otherwise a static 100%. */
  opacity?: number;
  onOpacityChange?: (v: number) => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const hex = normalizeHex(value);
  const pct = Math.round((opacity ?? 1) * 100);

  return (
    // Mirrors FIELD_BASE in PropertiesPanel — the fill row sits in the same column
    // as the scrub fields, so it has to keep their height and corner exactly.
    <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2 py-1 transition-fast hover:border-border-strong focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
      <button
        ref={swatchRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-4 w-4 shrink-0 rounded-sm border border-border-strong"
        style={{ background: hex }}
        aria-label={t('editor.color.pick')}
      />
      <HexInput
        hex={hex}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
      />
      <span className="shrink-0 text-caption tabular-nums text-tertiary">{pct}%</span>
      {open && (
        <Popover
          anchor={swatchRef}
          hex={hex}
          onChange={onChange}
          onChangeEnd={onChangeEnd}
          opacity={opacity}
          onOpacityChange={onOpacityChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** Hex text field — commits a valid 6-digit hex live, ends the gesture on blur. */
function HexInput({
  hex,
  onChange,
  onChangeEnd,
}: {
  hex: string;
  onChange: (hex: string) => void;
  onChangeEnd?: () => void;
}) {
  const [text, setText] = useState(hex.replace(/^#/, '').toUpperCase());
  const focused = useRef(false);
  // Re-sync from upstream only while not being edited (so external undo shows).
  useEffect(() => {
    if (!focused.current) setText(hex.replace(/^#/, '').toUpperCase());
  }, [hex]);
  return (
    <input
      value={text}
      spellCheck={false}
      onFocus={() => (focused.current = true)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
        setText(raw.toUpperCase());
        if (/^[0-9a-fA-F]{6}$/.test(raw)) onChange(`#${raw}`);
      }}
      onBlur={() => {
        focused.current = false;
        setText(hex.replace(/^#/, '').toUpperCase());
        onChangeEnd?.();
      }}
      className="w-full min-w-0 bg-transparent text-caption uppercase tabular-nums text-primary !outline-none focus-visible:!outline-none"
      aria-label="HEX"
    />
  );
}

function Popover({
  anchor,
  hex,
  onChange,
  onChangeEnd,
  opacity,
  onOpacityChange,
  onClose,
}: {
  anchor: React.RefObject<HTMLButtonElement | null>;
  hex: string;
  onChange: (hex: string) => void;
  onChangeEnd?: () => void;
  opacity?: number;
  onOpacityChange?: (v: number) => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mode, setMode] = useState<'hex' | 'rgb'>('hex');

  // The popover is authored in HSV. We seed from the incoming hex once, then own
  // the H/S/V state — deriving hex back out avoids the round-trip that would
  // snap the hue to 0 whenever S or V hit an edge (grey has no stable hue).
  const [hsv, setHsv] = useState(() => rgbToHsv(hexToRgb(hex)));
  const lastEmitted = useRef(hex.toLowerCase());
  // If the value changes from outside (undo, another field), reseed.
  useEffect(() => {
    if (hex.toLowerCase() !== lastEmitted.current) {
      setHsv(rgbToHsv(hexToRgb(hex)));
      lastEmitted.current = hex.toLowerCase();
    }
  }, [hex]);

  const emit = useCallback(
    (next: { h: number; s: number; v: number }) => {
      setHsv(next);
      const out = rgbToHex(hsvToRgb(next));
      lastEmitted.current = out;
      onChange(out);
    },
    [onChange],
  );

  // Position under the swatch, flush to the panel's right edge, kept on-screen.
  useLayoutEffect(() => {
    const a = anchor.current?.getBoundingClientRect();
    if (!a) return;
    const W = 232;
    let left = a.right - W;
    left = Math.max(8, Math.min(left, window.innerWidth - W - 8));
    let top = a.bottom + 8;
    top = Math.min(top, window.innerHeight - 360);
    setPos({ top: Math.max(8, top), left });
  }, [anchor]);

  // Dismiss on outside click / Escape.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        !anchor.current?.contains(e.target as Node)
      ) {
        onClose();
        onChangeEnd?.();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        onChangeEnd?.();
      }
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchor, onClose, onChangeEnd]);

  const rgb = hsvToRgb(hsv);
  const node = (
    <div
      ref={ref}
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
      className="fixed z-[60] w-[232px] rounded-lg border border-border-strong bg-elevated p-3 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_2px_8px_rgba(0,0,0,0.4)]"
    >
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          aria-label={t('editor.color.close')}
          onClick={() => {
            onClose();
            onChangeEnd?.();
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-tertiary transition-fast hover:bg-hover hover:text-primary active:bg-pressed"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Saturation / value square */}
      <SvSquare hsv={hsv} onChange={emit} onChangeEnd={onChangeEnd} />

      {/* Hue rail + eyedropper */}
      <div className="mt-3 flex items-center gap-2">
        <EyeDropperButton
          onPick={(picked) => {
            emit(rgbToHsv(hexToRgb(picked)));
            onChangeEnd?.();
          }}
        />
        <div className="min-w-0 flex-1">
          <HueRail
            hue={hsv.h}
            onChange={(h) => emit({ ...hsv, h })}
            onChangeEnd={onChangeEnd}
          />
        </div>
      </div>

      {/* Mode toggle + colour fields */}
      <div className="mt-3 flex items-center gap-1.5">
        <ModeToggle mode={mode} onChange={setMode} />
        {mode === 'hex' ? (
          <div className="flex h-7 min-w-0 flex-1 items-center rounded-md border border-border-strong bg-surface px-2 focus-within:border-brand">
            <HexInput hex={hex} onChange={onChange} onChangeEnd={onChangeEnd} />
          </div>
        ) : (
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-1.5">
            {(['r', 'g', 'b'] as const).map((k) => (
              <RgbField
                key={k}
                label={k.toUpperCase()}
                value={rgb[k]}
                onChange={(n) => {
                  const next = { ...rgb, [k]: clamp(n, 0, 255) };
                  emit(rgbToHsv(next));
                }}
                onChangeEnd={onChangeEnd}
              />
            ))}
          </div>
        )}
      </div>

      {/* Opacity slider */}
      {onOpacityChange && (
        <OpacityRail
          hex={hex}
          opacity={opacity ?? 1}
          onChange={onOpacityChange}
          onChangeEnd={onChangeEnd}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}

/** Saturation (x) × value (y) picker square. */
function SvSquare({
  hsv,
  onChange,
  onChangeEnd,
}: {
  hsv: { h: number; s: number; v: number };
  onChange: (hsv: { h: number; s: number; v: number }) => void;
  onChangeEnd?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDrag(ref, (x, y) => onChange({ ...hsv, s: x, v: 1 - y }), onChangeEnd);
  const hueHex = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));
  return (
    <div
      ref={ref}
      onPointerDown={drag}
      className="relative h-40 w-full cursor-crosshair overflow-hidden rounded-md"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueHex})`,
      }}
    >
      <span
        className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{
          left: `${hsv.s * 100}%`,
          top: `${(1 - hsv.v) * 100}%`,
          background: rgbToHex(hsvToRgb(hsv)),
        }}
      />
    </div>
  );
}

/** Horizontal hue rail (0–360). */
function HueRail({
  hue,
  onChange,
  onChangeEnd,
}: {
  hue: number;
  onChange: (h: number) => void;
  onChangeEnd?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDrag(ref, (x) => onChange(Math.round(x * 360)), onChangeEnd);
  return (
    <div
      ref={ref}
      onPointerDown={drag}
      className="relative h-3 w-full cursor-pointer rounded-full"
      style={{
        background:
          'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
      }}
    >
      <span
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{ left: `${(hue / 360) * 100}%`, background: rgbToHex(hsvToRgb({ h: hue, s: 1, v: 1 })) }}
      />
    </div>
  );
}

/** Segmented Hex / RGB switch — picks which text fields the popover shows. */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: 'hex' | 'rgb';
  onChange: (m: 'hex' | 'rgb') => void;
}) {
  return (
    <div className="flex h-7 shrink-0 items-center rounded-md border border-border-strong p-0.5">
      {(['hex', 'rgb'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={[
            'flex h-full items-center rounded-[4px] px-2 text-[10px] font-medium uppercase leading-none transition-colors',
            mode === m ? 'bg-brand text-white' : 'text-tertiary hover:text-primary',
          ].join(' ')}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/** Horizontal opacity rail (0–1), with a checkerboard + colour gradient track. */
function OpacityRail({
  hex,
  opacity,
  onChange,
  onChangeEnd,
}: {
  hex: string;
  opacity: number;
  onChange: (v: number) => void;
  onChangeEnd?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDrag(ref, (x) => onChange(clamp(x, 0, 1)), onChangeEnd);
  return (
    <div
      ref={ref}
      onPointerDown={drag}
      className="relative mt-3 h-3 w-full cursor-pointer overflow-hidden rounded-full"
      style={{
        // Checkerboard behind a transparent→solid gradient of the current colour.
        backgroundImage: `linear-gradient(to right, transparent, ${hex}), repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%)`,
        backgroundSize: '100% 100%, 12px 12px',
      }}
    >
      <span
        className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
        style={{ left: `${opacity * 100}%`, background: hex }}
      />
    </div>
  );
}

/**
 * Eyedropper — samples a pixel colour from anywhere on screen via the native
 * `EyeDropper` API (Chromium). Hidden where the API is unavailable (Firefox/
 * Safari), since there's no cross-browser polyfill worth shipping.
 */
function EyeDropperButton({ onPick }: { onPick: (hex: string) => void }) {
  const { t } = useT();
  const [supported] = useState(
    () => typeof window !== 'undefined' && 'EyeDropper' in window,
  );
  if (!supported) return null;
  return (
    <button
      type="button"
      aria-label={t('editor.color.eyedropper')}
      title={t('editor.color.eyedropperHint')}
      onClick={async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ed = new (window as any).EyeDropper();
          const { sRGBHex } = await ed.open();
          if (typeof sRGBHex === 'string') onPick(normalizeHex(sRGBHex));
        } catch {
          /* user cancelled */
        }
      }}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-strong text-secondary transition-colors hover:border-brand hover:text-primary"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 22 1-1h3l9-9" />
        <path d="M3 21v-3l9-9" />
        <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
      </svg>
    </button>
  );
}

function RgbField({
  label,
  value,
  onChange,
  onChangeEnd,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  onChangeEnd?: () => void;
}) {
  const [text, setText] = useState(String(Math.round(value)));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(Math.round(value)));
  }, [value]);
  return (
    <label className="flex h-7 min-w-0 items-center rounded-md border border-border-strong bg-surface px-1.5 focus-within:border-brand">
      <input
        value={text}
        inputMode="numeric"
        aria-label={label}
        onFocus={() => (focused.current = true)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
          setText(raw);
          if (raw !== '') onChange(Number(raw));
        }}
        onBlur={() => {
          focused.current = false;
          setText(String(Math.round(value)));
          onChangeEnd?.();
        }}
        className="w-full min-w-0 bg-transparent text-center text-caption tabular-nums text-primary !outline-none focus-visible:!outline-none"
      />
    </label>
  );
}

/** Pointer-drag helper: normalised (x,y) in [0,1] within `ref`, ends on release. */
function useDrag(
  ref: React.RefObject<HTMLDivElement | null>,
  onMove: (x: number, y: number) => void,
  onEnd?: () => void,
) {
  return useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const apply = (cx: number, cy: number) => {
        onMove(
          clamp((cx - rect.left) / rect.width, 0, 1),
          clamp((cy - rect.top) / rect.height, 0, 1),
        );
      };
      apply(e.clientX, e.clientY);
      const onPointerMove = (ev: PointerEvent) => apply(ev.clientX, ev.clientY);
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        onEnd?.();
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [ref, onMove, onEnd],
  );
}

// ── colour maths ────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function normalizeHex(v: string): string {
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : '#000000';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const to = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb({ h, s, v }: { h: number; s: number; v: number }): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}
