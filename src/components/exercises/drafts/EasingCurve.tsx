'use client';

import { useRef, useState } from 'react';
import { Check, Play, Pause } from 'lucide-react';

/**
 * DRAFT exercise — "easing-curve": drag the two Bézier control points to match a
 * target motion easing. A dot animates left→right using the learner's curve as
 * its CSS timing-function, so the *feel* of the easing is visible, not just its
 * shape. Correct when both control points land near the target. The browser's
 * own cubic-bezier() renders the motion — no hand-rolled interpolation.
 * Self-contained; own state.
 */

const S = 200; // svg square size
const TOL = 0.12; // per-axis tolerance on control-point match

type Pt = { x: number; y: number }; // 0..1 in easing space (y can overshoot a bit)

type Target = { name: string; p1: Pt; p2: Pt; note: string };

const TARGETS: Target[] = [
  { name: 'ease-out', p1: { x: 0, y: 0 }, p2: { x: 0.58, y: 1 }, note: 'быстрый старт, мягкая посадка — для входящих элементов' },
  { name: 'ease-in', p1: { x: 0.42, y: 0 }, p2: { x: 1, y: 1 }, note: 'плавный разгон, резкий уход — для исчезающих' },
  { name: 'ease-in-out', p1: { x: 0.42, y: 0 }, p2: { x: 0.58, y: 1 }, note: 'симметрично — для перемещений внутри экрана' },
];

/** easing-space (x right, y up) → svg pixels (y down). */
function toSvg(p: Pt): { x: number; y: number } {
  return { x: p.x * S, y: S - p.y * S };
}

export function EasingCurve() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [targetIdx, setTargetIdx] = useState(0);
  const [p1, setP1] = useState<Pt>({ x: 0.25, y: 0.25 });
  const [p2, setP2] = useState<Pt>({ x: 0.75, y: 0.75 });
  const [playing, setPlaying] = useState(true);

  const target = TARGETS[targetIdx];
  const near = (a: Pt, b: Pt) => Math.abs(a.x - b.x) <= TOL && Math.abs(a.y - b.y) <= TOL;
  const solved = near(p1, target.p1) && near(p2, target.p2);

  const timing = `cubic-bezier(${p1.x.toFixed(2)}, ${p1.y.toFixed(2)}, ${p2.x.toFixed(2)}, ${p2.y.toFixed(2)})`;

  function drag(which: 'p1' | 'p2') {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const set = which === 'p1' ? setP1 : setP2;
      const move = (ev: PointerEvent) => {
        const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        // Allow slight overshoot on y (−0.3..1.3) so springy curves are reachable.
        const y = Math.max(-0.3, Math.min(1.3, 1 - (ev.clientY - rect.top) / rect.height));
        set({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }

  const s1 = toSvg(p1);
  const s2 = toSvg(p2);
  const t1 = toSvg(target.p1);
  const t2 = toSvg(target.p2);

  function next() {
    setTargetIdx((i) => (i + 1) % TARGETS.length);
  }

  return (
    <div className="w-full max-w-[560px] rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wide text-tertiary">Задание</p>
          <p className="mt-1 text-callout font-semibold text-primary">
            Собери кривую <code className="rounded bg-muted px-1.5 py-0.5 text-footnote">{target.name}</code>
          </p>
        </div>
        <span
          className={[
            'inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-3 py-1 text-footnote font-semibold transition-base min-w-[6.5rem]',
            solved ? 'bg-success/15 text-success' : 'bg-muted text-tertiary',
          ].join(' ')}
        >
          <Check size={13} strokeWidth={3} />
          {solved ? 'Готово' : 'Подгоняй'}
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${S} ${S}`}
          className="h-[200px] w-[200px] shrink-0 touch-none rounded-xl border border-border bg-canvas"
        >
          {/* grid */}
          <line x1="0" y1={S} x2={S} y2={S} stroke="var(--border)" />
          <line x1="0" y1="0" x2="0" y2={S} stroke="var(--border)" />
          {/* target ghost curve */}
          <path
            d={`M0 ${S} C ${t1.x} ${t1.y}, ${t2.x} ${t2.y}, ${S} 0`}
            fill="none"
            stroke="var(--success)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          {/* learner curve */}
          <path
            d={`M0 ${S} C ${s1.x} ${s1.y}, ${s2.x} ${s2.y}, ${S} 0`}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="2.5"
          />
          {/* handles */}
          <line x1="0" y1={S} x2={s1.x} y2={s1.y} stroke="var(--brand)" strokeWidth="1" opacity="0.4" />
          <line x1={S} y1="0" x2={s2.x} y2={s2.y} stroke="var(--brand)" strokeWidth="1" opacity="0.4" />
          <circle cx={s1.x} cy={s1.y} r="8" fill="var(--brand)" className="cursor-grab" onPointerDown={drag('p1')} />
          <circle cx={s2.x} cy={s2.y} r="8" fill="var(--brand)" className="cursor-grab" onPointerDown={drag('p2')} />
        </svg>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
          {/* Live motion preview */}
          <div className="rounded-xl border border-border bg-canvas p-3">
            <div className="relative h-8">
              <span
                // Restart the loop whenever the curve changes, so the preview
                // always reflects the current easing without a manual replay.
                key={timing}
                className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-brand"
                style={{
                  left: 0,
                  animation: `desstudy-ease-run 1.6s ${timing} infinite`,
                  animationPlayState: playing ? 'running' : 'paused',
                }}
              />
            </div>
            <style>{`@keyframes desstudy-ease-run {
              0% { left: 0; }
              62% { left: calc(100% - 20px); }
              100% { left: calc(100% - 20px); }
            }`}</style>
          </div>

          <p className="text-caption tabular-nums text-tertiary break-all">{timing}</p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
            >
              {playing ? (
                <>
                  <Pause size={13} /> Пауза
                </>
              ) : (
                <>
                  <Play size={13} /> Проиграть
                </>
              )}
            </button>
            <button
              type="button"
              onClick={next}
              className="shrink-0 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 text-footnote font-semibold text-secondary transition-fast hover:bg-hover active:bg-pressed"
            >
              Другая цель
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-footnote text-secondary">
        {solved ? `Это ${target.name}: ${target.note}.` : 'Совмести сплошную кривую с пунктирной целью.'}
      </p>
    </div>
  );
}
