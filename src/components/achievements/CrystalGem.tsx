'use client';

import { useRef, useState } from 'react';
import { Lock } from 'lucide-react';

/**
 * A faceted, hand-cut crystal rendered in pure SVG — no raster assets. Each
 * achievement family gets its own gem `tone`; locked gems render as a dark,
 * "sleeping ore" with a faint hint of their native colour and a lock, so the
 * unlock reads as "it comes alive".
 *
 * The cut is a hexagonal crystal seen at 3/4: a pointed termination on top,
 * three visible prism faces below, plus specular glints and a floor reflection
 * so it feels like a studio-lit gem rather than a flat icon.
 *
 * Richness comes in seven layers: (1) an internal glow core that pulses,
 * (2) chromatic dispersion along two ridges, (3) a coloured caustic pooled on
 * the floor, (4) twinkling sparkles, (5) rarity expressed as material — a
 * rotating light beam for rare/legendary and a floating halo for legendary,
 * (6) a colour-hinted sleeping state when locked, and (7) a cursor-driven 3D
 * parallax tilt.
 */

export type GemTone = 'sapphire' | 'ember' | 'amethyst' | 'emerald' | 'gold';
type Rarity = 'common' | 'rare' | 'legendary';

interface Palette {
  /** brightest catch-light face */ hi: string;
  /** upper body */ light: string;
  /** main body */ mid: string;
  /** shadowed face */ dark: string;
  /** deepest core */ deep: string;
  /** ambient glow + reflection */ glow: string;
}

const PALETTES: Record<GemTone, Palette> = {
  sapphire: { hi: '#CFE4FF', light: '#8FC2FF', mid: '#3B82F6', dark: '#1E4FBF', deep: '#152C7A', glow: '#3B82F6' },
  ember: { hi: '#FFE0B8', light: '#FFB067', mid: '#F97316', dark: '#C2410C', deep: '#7C2D12', glow: '#FB923C' },
  amethyst: { hi: '#EAD8FF', light: '#C6A0FF', mid: '#9B61FF', dark: '#6D28D9', deep: '#4C1D95', glow: '#9B61FF' },
  emerald: { hi: '#C8FBE4', light: '#7EE7B8', mid: '#10B981', dark: '#0B7A57', deep: '#064E3B', glow: '#34D399' },
  gold: { hi: '#FFF3CC', light: '#FFDE8A', mid: '#F5C043', dark: '#C99320', deep: '#8A6412', glow: '#FFD24A' },
};

const LOCKED: Palette = {
  hi: '#4A4F57', light: '#3A3F47', mid: '#2A2E34', dark: '#20242A', deep: '#15181C', glow: '#000000',
};

/** Rarity drives how much "material" a gem shows — beams, extra sparkle, a halo. */
const RARITY: Record<GemTone, Rarity> = {
  sapphire: 'common',
  amethyst: 'common',
  ember: 'common',
  emerald: 'rare',
  gold: 'legendary',
};

const prefersReducedMotion = () =>
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'reduced';

/** A tiny 4-point twinkle centred at (cx,cy) with arm length r. */
function sparklePath(cx: number, cy: number, r: number) {
  const w = r * 0.28; // waist thickness
  return (
    `M${cx},${cy - r} C${cx + w},${cy - w} ${cx + w},${cy - w} ${cx + r},${cy} ` +
    `C${cx + w},${cy + w} ${cx + w},${cy + w} ${cx},${cy + r} ` +
    `C${cx - w},${cy + w} ${cx - w},${cy + w} ${cx - r},${cy} ` +
    `C${cx - w},${cy - w} ${cx - w},${cy - w} ${cx},${cy - r} Z`
  );
}

export function CrystalGem({
  tone,
  locked = false,
  size = 96,
  charge,
}: {
  tone: GemTone;
  locked?: boolean;
  size?: number;
  /**
   * Optional 0..1 fill level. When provided (and unlocked), the stone reads as a
   * vessel that charges from the bottom up: the portion below the rising liquid
   * line glows in full colour, the un-charged portion above sits dim and empty.
   * Omit for the classic always-vibrant gem.
   */
  charge?: number;
}) {
  const p = locked ? LOCKED : PALETTES[tone];
  const t = PALETTES[tone]; // native colour, used to hint the locked "sleeping ore"
  const rarity = RARITY[tone];
  const uid = `${tone}-${locked ? 'off' : 'on'}`;

  // (7) cursor-driven parallax tilt
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion()) return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    setTilt({ x: -dy * 8, y: dx * 8 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  // hover embers — [cx, cy, r, driftX, driftY, delay]; they rise up and fan out
  const SPARKS: [number, number, number, number, number, number][] = [
    [44, 40, 1.7, -18, -40, 0],
    [56, 44, 2, 22, -46, 0.12],
    [50, 34, 1.5, 4, -54, 0.24],
    [40, 52, 1.8, -26, -32, 0.36],
    [60, 56, 1.6, 28, -34, 0.48],
    [50, 60, 1.9, -6, -50, 0.6],
    [46, 46, 1.4, -12, -58, 0.72],
    [54, 38, 1.6, 14, -60, 0.84],
    [50, 50, 2.1, 0, -66, 0.96],
    [38, 44, 1.5, -30, -44, 1.08],
  ];

  // liquid charge line: the stone's body runs y≈6 (crown tip) → y≈90 (base).
  // A charge of 0 leaves the line at the base; 1 lifts it to the crown.
  const hasCharge = !locked && typeof charge === 'number';
  const c = hasCharge ? Math.max(0, Math.min(1, charge as number)) : 1;
  const fillY = 90 - c * (90 - 6);
  // Glow, floor caustic and reflection track the charge: an empty stone gives off
  // no coloured light, and the bloom grows as it fills.
  const glowScale = hasCharge ? c : 1;

  const showBeam = !locked && rarity !== 'common';
  const showHalo = !locked && rarity === 'legendary';
  // sparkle seeds: [cx, cy, r, delay]
  const sparkles: [number, number, number, number][] =
    rarity === 'legendary'
      ? [
          [36, 24, 4, 0],
          [66, 46, 3.2, 0.9],
          [50, 74, 3.6, 1.7],
          [30, 60, 2.6, 2.4],
        ]
      : rarity === 'rare'
        ? [
            [36, 26, 3.6, 0],
            [64, 52, 3, 1.2],
          ]
        : [[38, 28, 3, 0.4]];

  return (
    <div
      ref={wrapRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="gem-wrap"
      style={{ perspective: '460px', display: 'inline-block', lineHeight: 0 }}
    >
      <svg
        viewBox="0 0 100 116"
        width={size}
        height={(size * 116) / 100}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="gem-lift"
        style={{
          overflow: 'visible',
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: 'transform 0.25s cubic-bezier(0.2,0.7,0.3,1)',
          transformStyle: 'preserve-3d',
        }}
        aria-hidden
      >
        <defs>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="40%" r="52%">
            <stop offset="0%" stopColor={p.glow} stopOpacity={locked ? 0 : 0.5} />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </radialGradient>

          {/* (1) internal glow core — light pooled low in the body */}
          <radialGradient id={`core-${uid}`} cx="50%" cy="70%" r="42%">
            <stop offset="0%" stopColor={p.hi} stopOpacity={locked ? 0 : 0.95} />
            <stop offset="42%" stopColor={p.glow} stopOpacity={locked ? 0 : 0.55} />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </radialGradient>

          {/* per-face gradients for depth */}
          <linearGradient id={`fTermL-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={p.hi} />
            <stop offset="100%" stopColor={p.light} />
          </linearGradient>
          <linearGradient id={`fTermC-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={p.light} />
            <stop offset="100%" stopColor={p.mid} />
          </linearGradient>
          <linearGradient id={`fTermR-${uid}`} x1="1" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.dark} />
          </linearGradient>
          <linearGradient id={`fLeft-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.light} />
            <stop offset="100%" stopColor={p.mid} />
          </linearGradient>
          <linearGradient id={`fFront-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.deep} />
          </linearGradient>
          <linearGradient id={`fRight-${uid}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.dark} />
            <stop offset="100%" stopColor={p.deep} />
          </linearGradient>
          <linearGradient id={`refl-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={p.glow} stopOpacity={locked ? 0 : 0.32} />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </linearGradient>
          {/* liquid charge — a bright pool that reads as stored energy */}
          <linearGradient id={`fill-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor={p.hi} stopOpacity="0.85" />
            <stop offset="30%" stopColor={p.glow} stopOpacity="0.6" />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id={`sweep-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* (2) chromatic dispersion — a rainbow slide for ridge cut-lines */}
          <linearGradient id={`disp-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#7CF9FF" />
            <stop offset="72%" stopColor="#C6A0FF" />
            <stop offset="100%" stopColor="#FF9BC7" />
          </linearGradient>

          {/* (5) rotating light beam for rare/legendary */}
          <linearGradient id={`beam-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* (3) blur for the floor caustic */}
          <filter id={`blur-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>

          {/* soft blur so the ambient bloom melts at its edge instead of ending */}
          <filter id={`bloom-${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" />
          </filter>

          {/* clip everything interior to the stone's silhouette */}
          <clipPath id={`clip-${uid}`}>
            <polygon points="50,6 76,30 76,82 58,90 42,88 24,82 24,30" />
          </clipPath>
        </defs>

        {/* ambient bloom — breathes so the halo of light feels alive. Wrapped in a
            group whose opacity tracks the charge (the animation drives the child's
            own opacity, so the group multiplies over it). */}
        <g opacity={glowScale} style={{ transition: 'opacity 0.6s ease' }}>
          <circle
            cx="50"
            cy="44"
            r="48"
            fill={`url(#glow-${uid})`}
            filter={`url(#bloom-${uid})`}
            className={locked ? undefined : 'gem-glow'}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </g>

        {/* (3) coloured caustic pooled on the floor */}
        {!locked && (
          <g opacity={glowScale} style={{ transition: 'opacity 0.6s ease' }}>
            <ellipse
              cx="50"
              cy="99"
              rx="30"
              ry="7"
              fill={p.glow}
              opacity="0.45"
              filter={`url(#blur-${uid})`}
              className="gem-core"
            />
          </g>
        )}

        {/* floor reflection — a faded, squashed echo of the stone */}
        <g opacity={locked ? 0.18 : 0.4 * glowScale}>
          <polygon points="42,92 58,92 54,104 46,104" fill={`url(#refl-${uid})`} />
          <ellipse cx="50" cy="98" rx="26" ry="5" fill={`url(#refl-${uid})`} />
        </g>

        {/* (5) legendary halo — a soft floating ring behind the crown */}
        {showHalo && (
          <circle
            cx="50"
            cy="44"
            r="40"
            fill="none"
            stroke={p.hi}
            strokeWidth="0.9"
            strokeOpacity="0.5"
            className="gem-halo"
          />
        )}

        {/* ── termination (pointed crown) ── */}
        <polygon points="50,6 24,30 42,36" fill={`url(#fTermL-${uid})`} />
        <polygon points="50,6 42,36 58,36" fill={`url(#fTermC-${uid})`} />
        <polygon points="50,6 58,36 76,30" fill={`url(#fTermR-${uid})`} />

        {/* ── prism body (three visible faces) ── */}
        <polygon points="24,30 42,36 42,88 24,82" fill={`url(#fLeft-${uid})`} />
        <polygon points="42,36 58,36 58,90 42,88" fill={`url(#fFront-${uid})`} />
        <polygon points="58,36 76,30 76,82 58,90" fill={`url(#fRight-${uid})`} />

        {/* charge — dim the un-charged portion above the liquid line */}
        {hasCharge && c < 1 && (
          <g clipPath={`url(#clip-${uid})`}>
            <rect x="0" y="0" width="100" height={fillY} fill="#0B1220" opacity="0.6" />
          </g>
        )}

        {/* (6) sleeping ore — a faint breath of native colour under the lock */}
        {locked && (
          <g clipPath={`url(#clip-${uid})`}>
            <ellipse cx="50" cy="66" rx="20" ry="26" fill={t.glow} className="gem-locked-hint" />
          </g>
        )}

        {/* (1) internal glow core — screen-blended so it reads as light, not paint */}
        {!locked && (
          <g clipPath={`url(#clip-${uid})`} style={{ mixBlendMode: 'screen' }} opacity={glowScale}>
            <ellipse cx="50" cy="70" rx="24" ry="30" fill={`url(#core-${uid})`} className="gem-core" />
          </g>
        )}

        {/* charge — the bright liquid pool below the line, plus a glinting surface */}
        {hasCharge && c > 0 && (
          <>
            <g clipPath={`url(#clip-${uid})`} style={{ mixBlendMode: 'screen' }}>
              <rect
                x="0"
                y={fillY}
                width="100"
                height={90 - fillY}
                fill={`url(#fill-${uid})`}
                style={{ transition: 'y 0.6s cubic-bezier(0.2,0.7,0.3,1), height 0.6s cubic-bezier(0.2,0.7,0.3,1)' }}
              />
            </g>
            {c < 1 && (
              <g clipPath={`url(#clip-${uid})`}>
                <rect
                  x="0"
                  y={fillY - 0.6}
                  width="100"
                  height="1.2"
                  fill={p.hi}
                  opacity="0.9"
                  style={{ transition: 'y 0.6s cubic-bezier(0.2,0.7,0.3,1)' }}
                />
              </g>
            )}
          </>
        )}

        {/* (5) rotating light beam, clipped to the stone */}
        {showBeam && (
          <g clipPath={`url(#clip-${uid})`} style={{ mixBlendMode: 'screen' }}>
            <rect
              x="46"
              y="4"
              width="8"
              height="90"
              fill={`url(#beam-${uid})`}
              className="gem-beam"
              style={{ transformBox: 'fill-box', transformOrigin: 'center', opacity: rarity === 'legendary' ? 0.9 : 0.6 }}
            />
          </g>
        )}

        {/* facet edges — thin bright cut-lines */}
        <g
          stroke={locked ? '#3A3F47' : p.hi}
          strokeWidth="0.8"
          strokeOpacity={locked ? 0.4 : 0.5}
          strokeLinejoin="round"
          fill="none"
        >
          {/* silhouette */}
          <polygon points="50,6 76,30 76,82 58,90 42,88 24,82 24,30" />
          {/* termination ridges */}
          <path d="M50,6 42,36 M50,6 58,36" />
          {/* girdle */}
          <path d="M24,30 42,36 58,36 76,30" />
          {/* vertical prism edges */}
          <path d="M42,36 42,88 M58,36 58,90" />
        </g>

        {/* (2) chromatic dispersion painted over two ridges */}
        {!locked && (
          <g stroke={`url(#disp-${uid})`} strokeWidth="1.1" strokeOpacity="0.75" fill="none" strokeLinecap="round">
            <path d="M50,7 58,36" />
            <path d="M58,37 58,89" />
          </g>
        )}

        {/* specular glints */}
        {!locked && (
          <g fill="#FFFFFF">
            <polygon points="50,11 40,26 47,29" fillOpacity="0.7" />
            <polygon points="44,42 47,42 46,72 44,70" fillOpacity="0.22" />
            <circle cx="34" cy="30" r="1.4" fillOpacity="0.85" />
          </g>
        )}

        {/* (4) twinkling sparkles */}
        {!locked &&
          sparkles.map(([cx, cy, r, delay], i) => (
            <path
              key={i}
              d={sparklePath(cx, cy, r)}
              fill="#FFFFFF"
              className="gem-twinkle"
              style={{ animationDelay: `${delay}s`, transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          ))}

        {/* specular band that sweeps across on hover */}
        {!locked && (
          <g clipPath={`url(#clip-${uid})`}>
            <rect
              className="gem-sweep"
              x="-4"
              y="0"
              width="20"
              height="108"
              fill={`url(#sweep-${uid})`}
              transform="skewX(-14)"
            />
          </g>
        )}

        {/* hover sparks — tiny embers that drift up and out of the stone */}
        {!locked && (
          <g fill={p.hi} className="gem-sparks">
            {SPARKS.map(([cx, cy, r, dx, dy, delay], i) => (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                className="gem-spark"
                style={
                  {
                    '--sx': `${dx}px`,
                    '--sy': `${dy}px`,
                    animationDelay: `${delay}s`,
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                  } as React.CSSProperties
                }
              />
            ))}
          </g>
        )}

        {locked && (
          <foreignObject x="39" y="47" width="22" height="22">
            <div className="flex h-full w-full items-center justify-center">
              <Lock size={16} className="text-tertiary" />
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}
