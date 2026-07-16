'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CrystalGem, type GemTone } from '@/components/achievements/CrystalGem';
import { playRockRumble, playRockShatter } from '@/lib/sound';

/**
 * A full-screen achievement reveal. The screen dims, a raw faceted boulder drops
 * in and trembles harder and harder as a deep rumble builds; glowing fault-lines
 * race along its seams — then it detonates: the rock splits into heavy chunks
 * that tumble out under gravity, a ring of debris and dust sprays outward, a
 * shockwave snaps across the frame and the whole stage kicks — while the crystal
 * bursts from within and floods everything with light. A layered boom + crystal
 * chime plays on the break.
 *
 * Trigger it by mounting with `open`; call `onDone` when the sequence finishes
 * (auto-advance or a tap). Respects reduced motion by cutting straight to the
 * lit crystal (no shatter, no sound).
 */

type Phase = 'dim' | 'shake' | 'crack' | 'burst' | 'hold' | 'exit';

/** Break origin — chunks fan out from here and rotate about it. */
const CX = 100;
const CY = 112;

/** Tiny deterministic PRNG so SSR and client render identical debris. */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/**
 * A hand-cut, craggy boulder — a tall chunk of grey rock with a jagged rim, seen
 * roughly head-on. The rim's 14 vertices are split into four heavy chunks around
 * the core so it can break along believable seams.
 */
const RIM: [number, number][] = [
  [100, 28], [120, 58], [144, 92], [156, 132], [148, 166], [130, 184], [100, 190],
  [70, 184], [52, 160], [60, 130], [44, 104], [64, 80], [80, 56], [90, 42],
];
const OUTLINE = RIM.map(([x, y]) => `${x},${y}`).join(' ');
const P = (i: number) => `${RIM[i][0]},${RIM[i][1]}`;
const CORE = `${CX},${CY}`;

/**
 * The four chunks the boulder breaks into. Each carries its own facets (so it
 * reads as shaded stone, not a flat slab) and a launch vector + spin. Fills
 * reference the grey face gradients defined in <defs>.
 */
const CHUNKS: {
  facets: { points: string; fill: string }[];
  edge?: string;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
}[] = [
  {
    // top — the lit crown, thrown upward
    facets: [
      { points: `${CORE} ${P(12)} ${P(13)} ${P(0)}`, fill: 'g-lit' },
      { points: `${CORE} ${P(0)} ${P(1)}`, fill: 'g-mid' },
    ],
    edge: `M${P(12)} L${P(13)} L${P(0)} L${P(1)}`,
    dx: -4, dy: -150, rot: -26, delay: 0.02,
  },
  {
    // right — mid over dark, hurled right and down
    facets: [
      { points: `${CORE} ${P(1)} ${P(2)}`, fill: 'g-mid' },
      { points: `${CORE} ${P(2)} ${P(3)} ${P(4)}`, fill: 'g-dark' },
    ],
    dx: 150, dy: 60, rot: 34, delay: 0,
  },
  {
    // bottom — the shadowed base, dropped straight down
    facets: [{ points: `${CORE} ${P(4)} ${P(5)} ${P(6)} ${P(7)}`, fill: 'g-base' }],
    dx: 6, dy: 165, rot: -14, delay: 0.05,
  },
  {
    // left — mid over dark, hurled left and down
    facets: [
      { points: `${CORE} ${P(10)} ${P(11)} ${P(12)}`, fill: 'g-mid' },
      { points: `${CORE} ${P(7)} ${P(8)} ${P(9)} ${P(10)}`, fill: 'g-dark' },
    ],
    dx: -150, dy: 55, rot: -34, delay: 0.02,
  },
];

/** The seams between chunks — they glow with the gem's colour just before the break. */
const SEAMS = [1, 4, 7, 12].map((i) => `M${CORE} L${P(i)}`);

/** A ring of small rock chips + dust that sprays outward on the break. */
const DEBRIS = Array.from({ length: 22 }, (_, i) => {
  const r = rng(i * 53 + 13);
  const a = (i / 22) * Math.PI * 2 + r() * 0.5;
  const dist = 150 + r() * 190;
  return {
    size: 2 + r() * 5,
    dx: Math.cos(a) * dist,
    dy: Math.sin(a) * dist,
    rot: (r() - 0.5) * 720,
    delay: r() * 0.08,
    dur: 0.7 + r() * 0.5,
    tri: r() > 0.5,
  };
});

/**
 * Sparkle rays fanning from the crystal — alternating long/short tapered spokes
 * so it reads as a soft star-burst rather than a wheel of identical bars. Each is
 * a slim triangle (base near the core, apex out) that we fade + breathe on hold.
 */
const RAY_ORIGIN = { x: 100, y: 104 };
const RAYS = Array.from({ length: 16 }, (_, i) => {
  const deg = (i * 360) / 16;
  const long = i % 2 === 0;
  const len = long ? 96 : 52;
  const hw = long ? 2.6 : 1.7; // half-width of the base
  const r0 = 30; // inner radius where the ray starts
  const p = (r: number, dx: number) => {
    const rad = (deg - 90) * (Math.PI / 180);
    const px = RAY_ORIGIN.x + Math.cos(rad) * r - Math.sin(rad) * dx;
    const py = RAY_ORIGIN.y + Math.sin(rad) * r + Math.cos(rad) * dx;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  };
  return {
    deg,
    long,
    points: `${p(r0 + len, 0)} ${p(r0, hw)} ${p(r0, -hw)}`,
  };
});

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
      setTimeout(() => {
        setPhase('shake');
        playRockRumble(); // deep pressure builds under the trembling rock
      }, 260),
      setTimeout(() => setPhase('crack'), 1150),
      setTimeout(() => {
        setPhase('burst');
        playRockShatter(); // boom + crack + crystalline chime
      }, 1650),
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
            animate={{ opacity: phase === 'burst' ? [0, 0.7, 0] : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.12, 1] }}
          />

          {/* stage — kicks hard on the break, then settles */}
          <motion.div
            className="relative flex flex-col items-center gap-6"
            animate={
              phase === 'burst'
                ? { x: [0, -8, 9, -6, 4, -2, 0], y: [0, 6, -7, 4, -2, 0] }
                : { x: 0, y: 0 }
            }
            transition={phase === 'burst' ? { duration: 0.45, ease: 'easeOut' } : { duration: 0.2 }}
          >
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
              {/* light bloom flooding outward from the crystal's core — a soft,
                  edgeless falloff that gently breathes so the halo feels alive */}
              <motion.div
                className="pointer-events-none absolute aspect-square w-[92vmin] rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: '-46vmin',
                  marginTop: '-46vmin',
                  background: `radial-gradient(circle, ${GLOW[tone]}b0 0%, ${GLOW[tone]}66 22%, ${GLOW[tone]}26 44%, ${GLOW[tone]}0d 62%, transparent 80%)`,
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={
                  phase === 'hold'
                    ? { opacity: [0.9, 1, 0.9], scale: [1, 1.05, 1] }
                    : { opacity: lit ? 0.9 : 0, scale: lit ? 1 : 0.2 }
                }
                transition={
                  phase === 'hold'
                    ? { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.7, ease: 'easeOut' }
                }
              />

              {/* shockwave ring — snaps outward at the moment of the break */}
              <motion.div
                className="pointer-events-none absolute rounded-full border-2"
                style={{
                  left: '50%',
                  top: '52%',
                  width: 120,
                  height: 120,
                  marginLeft: -60,
                  marginTop: -60,
                  borderColor: `${GLOW[tone]}`,
                }}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={
                  phase === 'burst'
                    ? { opacity: [0, 0.8, 0], scale: [0.2, 2.6, 3.4] }
                    : { opacity: 0, scale: 0.2 }
                }
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />

              {/* soft sparkle rays fanning from the crystal — the whole cluster
                  drifts slowly and the spokes breathe so it never sits still */}
              <motion.svg
                viewBox="0 0 200 200"
                className="pointer-events-none absolute inset-0"
                style={{ overflow: 'visible', transformOrigin: '100px 104px' }}
                aria-hidden
                animate={{ rotate: lit ? 360 : 0 }}
                transition={
                  phase === 'hold'
                    ? { duration: 48, repeat: Infinity, ease: 'linear' }
                    : { duration: 1.6, ease: 'easeOut' }
                }
              >
                <defs>
                  <linearGradient id="ray-fade" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor={GLOW[tone]} stopOpacity="0.55" />
                    <stop offset="100%" stopColor={GLOW[tone]} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {RAYS.map((ray, i) => (
                  <motion.polygon
                    key={i}
                    points={ray.points}
                    fill="url(#ray-fade)"
                    style={{ transformOrigin: '100px 104px' }}
                    initial={{ opacity: 0, scale: 0.3 }}
                    animate={
                      phase === 'hold'
                        ? {
                            opacity: ray.long ? [0.6, 0.28, 0.6] : [0.32, 0.12, 0.32],
                            scale: ray.long ? [1, 1.06, 1] : [1, 0.92, 1],
                          }
                        : lit
                          ? { opacity: ray.long ? 0.6 : 0.32, scale: [0.3, 1.12, 1] }
                          : { opacity: 0, scale: 0.3 }
                    }
                    transition={
                      phase === 'hold'
                        ? { duration: 2.6 + (i % 4) * 0.4, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 1.1, delay: i * 0.02, ease: 'easeOut' }
                    }
                  />
                ))}
              </motion.svg>

              {/* the rock — trembles, cracks along its seams, then splits into chunks */}
              <motion.svg
                viewBox="0 0 200 200"
                className="absolute inset-0"
                style={{ overflow: 'visible' }}
                aria-hidden
                animate={
                  phase === 'shake'
                    ? { x: [0, -2, 2, -1.5, 1.5, -1, 1, 0], rotate: [0, -0.8, 0.8, -0.5, 0.5, 0] }
                    : phase === 'crack'
                      ? { x: [0, -4, 4, -3, 3, -2, 2, 0], rotate: [0, -1.6, 1.6, -1, 1, 0] }
                      : { x: 0, rotate: 0 }
                }
                transition={
                  phase === 'shake'
                    ? { duration: 0.5, repeat: Infinity, ease: 'linear' }
                    : phase === 'crack'
                      ? { duration: 0.28, repeat: Infinity, ease: 'linear' }
                      : { duration: 0.2 }
                }
              >
                <defs>
                  {/* grey stone face gradients — lit crown → shadowed base */}
                  <linearGradient id="g-lit" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#8b929b" />
                    <stop offset="100%" stopColor="#565c65" />
                  </linearGradient>
                  <linearGradient id="g-mid" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#5a606a" />
                    <stop offset="100%" stopColor="#3c414a" />
                  </linearGradient>
                  <linearGradient id="g-dark" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a3f47" />
                    <stop offset="100%" stopColor="#23272d" />
                  </linearGradient>
                  <linearGradient id="g-base" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c3037" />
                    <stop offset="100%" stopColor="#181b1f" />
                  </linearGradient>
                </defs>

                {/* whole-rock underglow that builds before the break */}
                <motion.polygon
                  points={OUTLINE}
                  fill={GLOW[tone]}
                  style={{ transformOrigin: `${CX}px ${CY}px` }}
                  initial={{ opacity: 0, scale: 1 }}
                  animate={
                    cracked && !broken
                      ? { opacity: [0, 0.45], scale: [1, 1.04] }
                      : { opacity: 0, scale: 1 }
                  }
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />

                {/* the four chunks — intact, then flung out under gravity with spin */}
                {CHUNKS.map((chunk, i) => (
                  <motion.g
                    key={i}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={
                      broken
                        ? { x: chunk.dx, y: [0, chunk.dy - 20, chunk.dy + 130], rotate: chunk.rot, opacity: [1, 1, 0] }
                        : { x: 0, y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{
                      duration: broken ? 0.95 : 0.2,
                      delay: broken ? chunk.delay : 0,
                      ease: broken ? [0.2, 0.6, 0.4, 1] : 'easeOut',
                    }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  >
                    {chunk.facets.map((f, j) => (
                      <polygon
                        key={j}
                        points={f.points}
                        fill={`url(#${f.fill})`}
                        stroke="#14171b"
                        strokeWidth={0.8}
                        strokeLinejoin="round"
                      />
                    ))}
                    {chunk.edge && (
                      <path
                        d={chunk.edge}
                        fill="none"
                        stroke="#c3cad2"
                        strokeOpacity={0.55}
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </motion.g>
                ))}

                {/* glowing fault-lines racing along the seams before the break */}
                <g fill="none" strokeLinecap="round">
                  {SEAMS.map((d, i) => (
                    <motion.path
                      key={i}
                      d={d}
                      stroke={GLOW[tone]}
                      strokeWidth={2.2}
                      style={{ filter: `drop-shadow(0 0 3px ${GLOW[tone]})` }}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={
                        cracked && !broken
                          ? { pathLength: 1, opacity: 0.95 }
                          : broken
                            ? { pathLength: 1, opacity: 0 }
                            : { pathLength: 0, opacity: 0 }
                      }
                      transition={{ duration: 0.34, delay: i * 0.05, ease: 'easeOut' }}
                    />
                  ))}
                </g>

                {/* debris chips + dust sprayed on the break */}
                {DEBRIS.map((d, i) => (
                  <motion.g
                    key={`d${i}`}
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
                    animate={
                      broken
                        ? { x: d.dx, y: [0, d.dy - 20, d.dy + 130], rotate: d.rot, opacity: [1, 1, 0] }
                        : { x: 0, y: 0, rotate: 0, opacity: 0 }
                    }
                    transition={{ duration: broken ? d.dur : 0.1, delay: broken ? d.delay : 0, ease: 'easeOut' }}
                    style={{ transformOrigin: `${CX}px ${CY}px` }}
                  >
                    {d.tri ? (
                      <polygon
                        points={`${CX},${CY - d.size} ${CX + d.size},${CY + d.size} ${CX - d.size},${CY + d.size}`}
                        fill="#3a3f47"
                      />
                    ) : (
                      <circle cx={CX} cy={CY} r={d.size} fill="#23272d" />
                    )}
                  </motion.g>
                ))}
              </motion.svg>

              {/* the crystal within — bursts out as the rock breaks */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -40, opacity: 0 }}
                  animate={
                    broken
                      ? { scale: 1, rotate: 0, opacity: 1 }
                      : { scale: 0, rotate: -40, opacity: 0 }
                  }
                  transition={{ duration: 0.85, ease: [0.34, 1.56, 0.64, 1] }}
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
          </motion.div>
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
