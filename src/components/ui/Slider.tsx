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

export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
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

  return (
    <div>
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
          className="pointer-events-none absolute z-10 origin-bottom rounded-lg bg-brand/80 px-3 py-1 text-callout font-semibold tabular-nums text-on-brand shadow-lg backdrop-blur-sm will-change-transform"
          style={{ left: centerX, bottom: 'calc(100% + 10px)' }}
          aria-hidden
        >
          {Math.round(live)}
          {unit}
          <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 rounded-[2px] bg-brand/80" />
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
