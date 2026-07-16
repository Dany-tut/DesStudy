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
 *
 * The pill is sized to `reserve` (the widest value the slider can show), NOT to
 * the live `text` — so the silhouette width stays constant while dragging and
 * the bubble never jitters/re-measures as the number changes. The live text is
 * centered inside that reserved box.
 */
function ValueBubble({ text, reserve }: { text: string; reserve: string }) {
  const sizerRef = useRef<HTMLSpanElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = sizerRef.current;
    if (el) setDims({ w: el.offsetWidth, h: el.offsetHeight });
  }, [reserve]);

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
      {/* invisible sizer at the widest value — reserves a stable pill width */}
      <span
        ref={sizerRef}
        aria-hidden
        className="invisible block whitespace-nowrap px-3 py-1 text-callout font-semibold tabular-nums"
      >
        {reserve}
      </span>
      {/* live value, centered inside the reserved box */}
      <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-callout font-semibold tabular-nums text-on-brand">
        {text}
      </span>
    </span>
  );
}

// The particle overlay extends this far above/below the track so sparks can fly
// clear of it in every direction — the celebration isn't clipped to the slider.
// Sparks are tuned (via drag) to fade out well within this margin, so they never
// reach the canvas edge and get hard-clipped.
const PARTICLE_PAD = 84; // px of vertical overflow on each side
const PARTICLE_DRAG = 0.9; // per-frame velocity retention (lower = shorter reach)

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
      const spd = (1.6 + rnd() * 3.4) * dpr; // energetic pop, then drag reins it in
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd + 0.8 * dpr; // slight downward bias — spill out from under the thumb
      p.r = (1.4 + rnd() * 2.4) * dpr;
      p.max = 38 + rnd() * 36;
      p.life = initial ? rnd() * p.max : 0;
      // Offset an initial particle along its trajectory so the first frame already
      // shows a full, in-flight burst rather than a point. Use the drag-integrated
      // displacement (∑ vx·DRAG^k) so it lands where physics would actually put it
      // — a naive vx·life would fling it far past the canvas and clip.
      const reach = (1 - Math.pow(PARTICLE_DRAG, p.life)) / (1 - PARTICLE_DRAG);
      p.x = ox + p.vx * reach;
      p.y = midY() + p.vy * reach;
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
      // Crisp spark: a solid dot with only a tight edge feather — no wide halo.
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(0.7, `rgba(${r},${g},${b},${a})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
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
        p.vy += 0.04 * dpr; // gentle gravity → arcing trajectories
        // Strong drag: sparks burst out fast, then settle and fade in place — so
        // their reach stays well inside the canvas and never hard-clips at the edge.
        p.vx *= PARTICLE_DRAG;
        p.vy *= PARTICLE_DRAG;
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

  // --- step feedback: a light tick (haptic + subtle sound) each time the drag
  // crosses a grid step, instead of magnetizing the thumb to the step position.
  const audioRef = useRef<AudioContext | null>(null);
  const lastStepRef = useRef<number | null>(null);
  const stepFeedback = () => {
    // Feel it more than hear it: a short buzzy pulse instead of a single tap.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([12, 8, 12]);
    try {
      const Ctx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioRef.current ?? (audioRef.current = new Ctx());
      if (ctx.state === 'suspended') void ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Low sine + a gentle downward glide reads as a soft "thud/buzz",
      // not a bright click. Slower attack & longer tail = vibration-like.
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      // A subtle amplitude tremor gives the tone a physical "vibration" texture.
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(55, now);
      lfoGain.gain.setValueAtTime(0.02, now);
      lfo.connect(lfoGain).connect(gain.gain);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      lfo.start(now);
      osc.stop(now + 0.16);
      lfo.stop(now + 0.16);
    } catch {
      /* audio unavailable — haptic alone is fine */
    }
  };

  // --- pixel-accurate bubble position + inertial tilt ---
  const trackRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (!draggingRef.current) setLive(value);
  }, [value]);

  // Widest value the bubble can ever show → reserve its width so the pill never
  // resizes (and jitters) as the number changes while dragging. With tabular
  // digits, width tracks character count, so the longest string is widest.
  const reserveText = [min, max].reduce((a, b) =>
    `${b}${unit}`.length > `${a}${unit}`.length ? b : a,
  ) + unit;

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
    if (next !== snap(live)) stepFeedback();
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
          <ValueBubble text={`${snap(live)}${unit}`} reserve={reserveText} />
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
            lastStepRef.current = snap(live);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
            // No magnet — the thumb stays where released; we only emit the
            // snapped grid value so validation sees exact steps.
            onChange(snap(live));
          }}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            const raw = Number(e.target.value);
            setLive(raw);
            const snapped = snap(raw);
            // Tick once per crossed step during the drag.
            if (draggingRef.current && snapped !== lastStepRef.current) {
              lastStepRef.current = snapped;
              stepFeedback();
            }
            onChange(snapped);
          }}
        />
      </div>
    </div>
  );
}
