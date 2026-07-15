'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CrystalGem, type GemTone } from '@/components/achievements/CrystalGem';

/**
 * A full-screen achievement reveal. The screen dims, a rough stone drops in and
 * trembles, hairline cracks race across it, then it shatters into wedges that
 * fly outward while a crystal bursts from within — flooding everything with
 * light. The crystal holds, then flies up "into its place" as the overlay
 * dismisses.
 *
 * Trigger it by mounting with `open`; call `onDone` when the sequence finishes
 * (auto-advance or a tap). Respects reduced motion by cutting straight to the
 * lit crystal.
 */

type Phase = 'dim' | 'shake' | 'crack' | 'burst' | 'hold' | 'exit';

/** The stone silhouette, cut into 8 wedges around a shared core so it can shatter. */
const CX = 100;
const CY = 104;
const RIM: [number, number][] = [
  [100, 40],
  [150, 55],
  [170, 100],
  [155, 150],
  [105, 168],
  [55, 152],
  [35, 102],
  [52, 58],
];
const WEDGES = RIM.map((a, i) => {
  const b = RIM[(i + 1) % RIM.length];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  // outward unit vector from the stone's centre through this wedge
  const vx = mx - CX;
  const vy = my - CY;
  const len = Math.hypot(vx, vy) || 1;
  return {
    points: `${CX},${CY} ${a[0]},${a[1]} ${b[0]},${b[1]}`,
    dx: (vx / len) * (170 + i * 9),
    dy: (vy / len) * (170 + i * 9),
    rot: (i % 2 ? 1 : -1) * (60 + i * 14),
  };
});

const RAYS = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);

const reduced = () =>
  typeof document !== 'undefined' &&
  document.documentElement.getAttribute('data-motion') === 'reduced';

export function AchievementReveal({
  open,
  tone,
  label,
  title,
  hint,
  onDone,
}: {
  open: boolean;
  tone: GemTone;
  /** Small kicker above the title, e.g. "Achievement unlocked". */
  label: string;
  /** The achievement / lesson name. */
  title: string;
  /** "Tap to continue" microcopy. */
  hint: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('dim');
  const cracked = phase === 'crack' || phase === 'burst' || phase === 'hold' || phase === 'exit';
  const broken = phase === 'burst' || phase === 'hold' || phase === 'exit';
  const lit = phase === 'burst' || phase === 'hold';

  useEffect(() => {
    if (!open) return;
    if (reduced()) {
      setPhase('hold');
      return;
    }
    setPhase('dim');
    const timers = [
      setTimeout(() => setPhase('shake'), 260),
      setTimeout(() => setPhase('crack'), 1150),
      setTimeout(() => setPhase('burst'), 1650),
      setTimeout(() => setPhase('hold'), 2450),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open]);

  const dismiss = () => {
    if (phase === 'dim' || phase === 'exit') return;
    setPhase('exit');
    setTimeout(onDone, 620);
  };

  const gemSize = 132;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'exit' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          onClick={dismiss}
          role="dialog"
          aria-label={`${label}: ${title}`}
        >
          {/* dim backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* white flash at the instant of the break */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'burst' ? [0, 0.55, 0] : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.18, 1] }}
          />

          {/* stage */}
          <div className="relative flex flex-col items-center gap-6">
            <motion.div
              className="relative"
              style={{ width: 200, height: 200 }}
              animate={
                phase === 'exit'
                  ? { y: -180, scale: 0.35, opacity: 0 }
                  : { y: 0, scale: 1, opacity: 1 }
              }
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* light bloom flooding outward from the crystal's core */}
              <motion.div
                className="pointer-events-none absolute aspect-square w-[75vmin] rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  // centre via margins — framer-motion owns `transform` for the scale
                  marginLeft: '-37.5vmin',
                  marginTop: '-37.5vmin',
                  background: `radial-gradient(circle, ${GLOW[tone]}cc 0%, ${GLOW[tone]}55 34%, transparent 66%)`,
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.2 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
              />

              {/* light rays fanning out from the crystal */}
              <svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute inset-0"
                style={{ overflow: 'visible' }}
                aria-hidden
              >
                {RAYS.map((deg, i) => (
                  <motion.rect
                    key={i}
                    x={98.5}
                    y={-70}
                    width={3}
                    height={170}
                    rx={1.5}
                    fill={GLOW[tone]}
                    style={{ transformOrigin: '100px 104px' }}
                    initial={{ opacity: 0, scaleY: 0.2, rotate: deg }}
                    animate={{
                      opacity: lit ? [0, 0.7, 0.35] : 0,
                      scaleY: lit ? [0.2, 1.15, 1] : 0.2,
                      rotate: deg + (lit ? 22 : 0),
                    }}
                    transition={{
                      duration: 1.4,
                      delay: i * 0.012,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </svg>

              {/* the stone — trembles, cracks, then shatters into wedges */}
              <motion.svg
                viewBox="0 0 200 200"
                className="absolute inset-0"
                style={{ overflow: 'visible' }}
                aria-hidden
                animate={
                  phase === 'shake' || phase === 'crack'
                    ? { x: [0, -3, 3, -2, 2, -1, 1, 0], rotate: [0, -1.2, 1.2, -0.8, 0.8, 0] }
                    : { x: 0, rotate: 0 }
                }
                transition={
                  phase === 'shake' || phase === 'crack'
                    ? { duration: 0.4, repeat: Infinity, ease: 'linear' }
                    : { duration: 0.2 }
                }
              >
                <defs>
                  <radialGradient id="stone-face" cx="42%" cy="34%" r="72%">
                    <stop offset="0%" stopColor="#6B7280" />
                    <stop offset="55%" stopColor="#434A54" />
                    <stop offset="100%" stopColor="#272B31" />
                  </radialGradient>
                </defs>

                {WEDGES.map((w, i) => (
                  <motion.polygon
                    key={i}
                    points={w.points}
                    fill="url(#stone-face)"
                    stroke="#1B1E23"
                    strokeWidth={1}
                    strokeLinejoin="round"
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={
                      broken
                        ? { x: w.dx, y: w.dy, rotate: w.rot, opacity: 0 }
                        : { x: 0, y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{ duration: broken ? 0.85 : 0.2, ease: 'easeOut' }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  />
                ))}

                {/* hairline cracks racing from the core to each rim vertex */}
                <g stroke="#0C0E11" strokeWidth={1.6} strokeLinecap="round" fill="none">
                  {RIM.map(([x, y], i) => (
                    <motion.line
                      key={i}
                      x1={CX}
                      y1={CY}
                      x2={x}
                      y2={y}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        cracked && !broken
                          ? { pathLength: 1, opacity: 0.9 }
                          : broken
                            ? { pathLength: 1, opacity: 0 }
                            : { pathLength: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.35, delay: i * 0.02, ease: 'easeOut' }}
                    />
                  ))}
                </g>
              </motion.svg>

              {/* the crystal within — bursts out as the stone breaks */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -40, opacity: 0 }}
                  animate={
                    broken
                      ? { scale: 1, rotate: 0, opacity: 1 }
                      : { scale: 0, rotate: -40, opacity: 0 }
                  }
                  transition={{
                    duration: 0.85,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  style={{ marginTop: -14 }}
                >
                  <FloatWrap active={phase === 'hold'}>
                    <CrystalGem tone={tone} size={gemSize} />
                  </FloatWrap>
                </motion.div>
              </div>
            </motion.div>

            {/* caption */}
            <motion.div
              className="relative flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 14 }}
              animate={
                phase === 'hold'
                  ? { opacity: 1, y: 0 }
                  : phase === 'exit'
                    ? { opacity: 0, y: -10 }
                    : { opacity: 0, y: 14 }
              }
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <span
                className="text-caption font-semibold uppercase tracking-[0.18em]"
                style={{ color: GLOW[tone] }}
              >
                {label}
              </span>
              <span className="mt-1 max-w-[24ch] text-title2 font-bold text-white">{title}</span>
              <span className="mt-4 text-footnote text-white/55">{hint}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Gentle idle bob once the crystal has settled. */
function FloatWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={active ? { y: [0, -8, 0] } : { y: 0 }}
      transition={active ? { duration: 3, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/** Per-tone bloom colour, matched to CrystalGem's `glow`. */
const GLOW: Record<GemTone, string> = {
  sapphire: '#3B82F6',
  ember: '#FB923C',
  amethyst: '#9B61FF',
  emerald: '#34D399',
  gold: '#FFD24A',
};
