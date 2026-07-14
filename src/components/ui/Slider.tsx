'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Approved variant B: a chunky track with a floating value bubble that sits
 * exactly above the thumb center (pixel-accurate — the native range thumb isn't
 * linear with %) and leans opposite the direction of travel while dragging —
 * "inertial tilt", like a sign swinging on a post. The lean is derived from a
 * smoothed drag velocity in a continuous rAF loop and levels out when motion
 * slows/stops. The native <input type="range"> stays underneath for
 * a11y/keyboard/touch; only its paint is replaced (.ui-slider in globals.css).
 *
 * The DOM input drags with `step="any"` so the browser never quantizes the
 * thumb — a local `live` value tracks the raw continuous position for render,
 * while every emitted `onChange` snaps to `step` so validation sees exact grid
 * values. `live` only re-syncs from `value` when not actively dragging.
 */
const THUMB = 24; // px — must match .ui-slider thumb width

/*
 * Single-path value bubble (pill + downward iOS-style tail as ONE contour), so
 * the tail never reads as a detached diamond — geometry ported from the
 * teachstream "Tooltip (iOS)" component: shoulders leave the pill edge along the
 * tangent (control points sit on the base line) → rounded "ears", no seam.
 * We only need the tail-on-bottom ("points down at the thumb") case.
 */
const TIP_R = 12; // pill corner radius
const TIP_TH = 6; // tail height (how far it juts out)
const TIP_HB = 9.939; // half-width of the tail base
const TIP_CO = 3.865; // control near the base (rounded shoulder, tangent to edge)
const TIP_CI = 4.418; // control near the tip
const f3 = (v: number) => Number(v.toFixed(3));

/** Rounded pill W×H with a tail grown out of the bottom edge, centered. */
function bubblePathTop(W: number, H: number): string {
  const cx = W / 2;
  // The tail needs 2R+2HB of straight edge; on a narrow pill, shrink R/tail to
  // fit (never grow) so the shoulders don't spill past the rounded corners.
  const sc = Math.min(1, W / (2 * TIP_R + 2 * TIP_HB));
  const r = TIP_R * sc;
  const hb = TIP_HB * sc;
  const co = TIP_CO * sc;
  const ci = TIP_CI * sc;
  const th = TIP_TH;
  return [
    `M${f3(r)} 0`,
    `H${f3(W - r)}`, `Q${f3(W)} 0 ${f3(W)} ${f3(r)}`,
    `V${f3(H - r)}`, `Q${f3(W)} ${f3(H)} ${f3(W - r)} ${f3(H)}`,
    `H${f3(cx + hb)}`,
    `C${f3(cx + co)} ${f3(H)} ${f3(cx + ci)} ${f3(H + th)} ${f3(cx)} ${f3(H + th)}`,
    `C${f3(cx - ci)} ${f3(H + th)} ${f3(cx - co)} ${f3(H)} ${f3(cx - hb)} ${f3(H)}`,
    `H${f3(r)}`, `Q0 ${f3(H)} 0 ${f3(H - r)}`,
    `V${f3(r)}`, `Q0 0 ${f3(r)} 0`, 'Z',
  ].join(' ');
}

/**
 * The value chip: text measured, then a single SVG path drawn behind it as the
 * whole silhouette. One shape — pill and tail share the same fill, no overlap.
 */
function ValueBubble({ text }: { text: string }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = labelRef.current;
    if (el) setDims({ w: el.offsetWidth, h: el.offsetHeight });
  }, [text]);

  const { w: W, h: H } = dims;
  const d = W > 0 && H > 0 ? bubblePathTop(W, H) : '';

  return (
    <span className="relative inline-block">
      {d && (
        <svg
          width={W}
          height={H + TIP_TH}
          viewBox={`0 0 ${W} ${H + TIP_TH}`}
          className="absolute left-0 top-0 overflow-visible drop-shadow-lg"
          aria-hidden
        >
          <path d={d} fill="rgb(var(--brand-rgb))" />
        </svg>
      )}
      <span
        ref={labelRef}
        className="relative block whitespace-nowrap px-3 py-1 text-callout font-semibold tabular-nums text-on-brand"
      >
        {text}
      </span>
    </span>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled,
  unit = '',
  accent,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
  /** When set, recolors the track/thumb/bubble. Pass an "R G B" triplet. */
  accent?: string;
  onChange: (value: number) => void;
}) {
  const [live, setLive] = useState(value);
  const draggingRef = useRef(false);

  // --- pixel-accurate bubble position + inertial tilt ---
  const trackRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (!draggingRef.current) setLive(value);
  }, [value]);

  const pct = ((live - min) / (max - min)) * 100;
  const snap = (raw: number) =>
    Math.min(max, Math.max(min, Math.round((raw - min) / step) * step + min));

  // Measure track width (and keep it fresh on resize).
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTrackW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Base position (bubble over the thumb center) is derived in render so it's
  // always correct — even before rAF runs or while the tab is backgrounded and
  // rAF is throttled. Thumb center travels within an inset of THUMB/2 per side.
  const centerX = THUMB / 2 + (pct / 100) * Math.max(0, trackW - THUMB);

  // Continuous loop: derive the inertial *tilt* from smoothed velocity. This is
  // an enhancement layered on top of the render-time position — reads liveRef
  // each frame so it never fights the parent's rounding.
  useEffect(() => {
    let raf = 0;
    let prevPct = ((liveRef.current - min) / (max - min)) * 100;
    let vel = 0; // smoothed %/frame
    let tilt = 0;

    const tick = () => {
      const el = bubbleRef.current;
      if (el) {
        const curPct = ((liveRef.current - min) / (max - min)) * 100;
        // Smoothed velocity → inertial tilt (opposite the travel direction).
        const instVel = curPct - prevPct;
        vel += (instVel - vel) * 0.25;
        prevPct = curPct;
        const target = Math.max(-26, Math.min(26, -vel * 4.6));
        tilt += (target - tilt) * 0.18;
        el.style.transform = `translateX(-50%) rotate(${tilt.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [min, max]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    let delta = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -step;
    else if (e.key === 'PageUp') delta = step * 4;
    else if (e.key === 'PageDown') delta = -step * 4;
    else if (e.key === 'Home') {
      e.preventDefault();
      setLive(min);
      onChange(min);
      return;
    } else if (e.key === 'End') {
      e.preventDefault();
      setLive(max);
      onChange(max);
      return;
    } else return;
    e.preventDefault();
    const next = snap(live + delta);
    setLive(next);
    onChange(next);
  }

  const accentVars = accent
    ? ({ '--brand': `rgb(${accent})`, '--brand-rgb': accent } as React.CSSProperties)
    : undefined;

  return (
    <div style={accentVars}>
      {/* Range labels */}
      <div className="mb-8 flex items-baseline justify-between">
        <span className="text-footnote text-tertiary">
          {min}
          {unit}
        </span>
        <span className="text-footnote text-tertiary">
          {max}
          {unit}
        </span>
      </div>

      {/* Track + floating bubble */}
      <div ref={trackRef} className="relative">
        <div
          ref={bubbleRef}
          className="pointer-events-none absolute z-10 origin-bottom will-change-transform"
          style={{ left: centerX, bottom: 'calc(100% + 10px)' }}
          aria-hidden
        >
          <ValueBubble text={`${Math.round(live)}${unit}`} />
        </div>
        <input
          type="range"
          className="ui-slider ui-slider--chunky"
          style={{ '--pct': `${pct}%` } as React.CSSProperties}
          min={min}
          max={max}
          step="any"
          value={live}
          disabled={disabled}
          onPointerDown={() => {
            draggingRef.current = true;
          }}
          onPointerUp={() => {
            draggingRef.current = false;
            onChange(snap(live));
          }}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const raw = Number(e.target.value);
            setLive(raw);
            onChange(snap(raw));
          }}
        />
      </div>
    </div>
  );
}
