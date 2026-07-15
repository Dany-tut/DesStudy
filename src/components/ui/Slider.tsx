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

// The particle overlay extends this far above/below the track so sparks can fly
// clear of it in every direction — the celebration isn't clipped to the slider.
const PARTICLE_PAD = 64; // px of vertical overflow on each side

/**
 * A burst of glowing sparks that erupt from the thumb and fly outward in every
 * direction — up, down, and out to the sides — arcing under a little gravity and
 * fading as they go, like Telegram Premium's star bursts. A "charged"
 * celebration when the answer lands. Emitted continuously from the thumb center,
 * drawn with additive glow + a motion trail, recycled once spent. The canvas is
 * larger than the track (see PARTICLE_PAD) and unclipped so nothing is cut off.
 */
function TrackParticles({
  trackW,
  thumbX,
  height,
}: {
  trackW: number;
  thumbX: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Emission follows the live thumb position; canvas spans the whole track.
  const thumbRef = useRef(thumbX);
  thumbRef.current = thumbX;
  const trackRef = useRef(trackW);
  trackRef.current = trackW;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Resolve the accent triplet from the inherited `--brand-rgb` custom prop
    // (the Slider sets it from `accent`); fall back to a green if unset.
    const cssRgb = getComputedStyle(canvas)
      .getPropertyValue('--brand-rgb')
      .trim();
    const [r, g, b] = (/\d/.test(cssRgb) ? cssRgb : '16 185 129')
      .split(/[\s,]+/)
      .map(Number);

    // Deterministic pseudo-random (Math.random is unavailable in some sandboxes;
    // a cheap LCG keeps emission varied but reproducible).
    let seed = 20259;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // Particles live in canvas px. Erupt from the thumb in all directions.
    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };
    const N = 48;
    const H = height + PARTICLE_PAD * 2;
    const midY = () => canvas.height / 2;

    const spawn = (p: P, initial = false) => {
      const ox = thumbRef.current * dpr; // thumb center in canvas px
      const ang = rnd() * Math.PI * 2; // full 360° spray
      const spd = (2.4 + rnd() * 6.2) * dpr; // energetic, varied
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd - 1.1 * dpr; // slight upward bias
      p.r = (0.7 + rnd() * 2.1) * dpr;
      p.max = 46 + rnd() * 74;
      p.life = initial ? rnd() * p.max : 0;
      // Offset an initial particle along its own trajectory so the first frame
      // already shows a full, in-flight burst rather than a point.
      p.x = ox + p.vx * p.life;
      p.y = midY() + p.vy * p.life;
    };

    const ps: P[] = Array.from({ length: N }, () => {
      const p: P = { x: 0, y: 0, vx: 0, vy: 0, r: 0, life: 0, max: 1 };
      spawn(p, true);
      return p;
    });

    let raf = 0;
    let alive = true;

    const resize = (w: number) => {
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
    };
    resize(trackRef.current);

    const dot = (x: number, y: number, rad: number, a: number) => {
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad * 4);
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(0.35, `rgba(${r},${g},${b},${a * 0.4})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, rad * 4, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = () => {
      const w = trackRef.current;
      if (Math.abs(w * dpr - canvas.width) > 1) resize(w);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of ps) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.035 * dpr; // gentle gravity → arcing trajectories
        p.vx *= 0.99; // mild air drag
        // Quick fade-in off the thumb, then a long fade out over the lifetime.
        const t = p.life / p.max;
        const a = Math.max(0, Math.min(1, t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9)) * 0.9;
        // Motion trail streaming back along the flight path.
        dot(p.x - p.vx * 1.5, p.y - p.vy * 1.5, p.r * 0.7, a * 0.4);
        dot(p.x, p.y, p.r, a);
        if (p.life >= p.max) spawn(p);
      }
      if (alive) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
      style={{ width: trackW, height: height + PARTICLE_PAD * 2 }}
      aria-hidden
    />
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
  celebrate,
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
  /** When true, glowing particles drift inside the filled track. */
  celebrate?: boolean;
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
        {celebrate && trackW > 0 && (
          <TrackParticles trackW={trackW} thumbX={centerX} height={14} />
        )}
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
