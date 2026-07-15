import { Lock } from 'lucide-react';

/**
 * A faceted, hand-cut crystal rendered in pure SVG — no raster assets. Each
 * achievement family gets its own gem `tone`; locked gems render as a dark,
 * low-contrast rough stone with a lock so the unlock reads as "it comes alive".
 *
 * The cut is a hexagonal crystal seen at 3/4: a pointed termination on top,
 * three visible prism faces below, plus specular glints and a floor reflection
 * so it feels like a studio-lit gem rather than a flat icon.
 */

export type GemTone = 'sapphire' | 'ember' | 'amethyst' | 'emerald' | 'gold';

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

export function CrystalGem({
  tone,
  locked = false,
  size = 96,
}: {
  tone: GemTone;
  locked?: boolean;
  size?: number;
}) {
  const p = locked ? LOCKED : PALETTES[tone];
  const uid = `${tone}-${locked ? 'off' : 'on'}`;

  return (
    <svg
      viewBox="0 0 100 108"
      width={size}
      height={(size * 108) / 100}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="gem-lift"
      aria-hidden
    >
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor={p.glow} stopOpacity={locked ? 0 : 0.5} />
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
        <linearGradient id={`sweep-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        {/* clip the shimmer band to the stone's silhouette */}
        <clipPath id={`clip-${uid}`}>
          <polygon points="50,6 76,30 76,82 58,90 42,88 24,82 24,30" />
        </clipPath>
      </defs>

      {/* ambient bloom */}
      <circle cx="50" cy="44" r="48" fill={`url(#glow-${uid})`} />

      {/* floor reflection — a faded, squashed echo of the stone */}
      <g opacity={locked ? 0.18 : 0.4}>
        <polygon points="42,92 58,92 54,104 46,104" fill={`url(#refl-${uid})`} />
        <ellipse cx="50" cy="98" rx="26" ry="5" fill={`url(#refl-${uid})`} />
      </g>

      {/* ── termination (pointed crown) ── */}
      <polygon points="50,6 24,30 42,36" fill={`url(#fTermL-${uid})`} />
      <polygon points="50,6 42,36 58,36" fill={`url(#fTermC-${uid})`} />
      <polygon points="50,6 58,36 76,30" fill={`url(#fTermR-${uid})`} />

      {/* ── prism body (three visible faces) ── */}
      <polygon points="24,30 42,36 42,88 24,82" fill={`url(#fLeft-${uid})`} />
      <polygon points="42,36 58,36 58,90 42,88" fill={`url(#fFront-${uid})`} />
      <polygon points="58,36 76,30 76,82 58,90" fill={`url(#fRight-${uid})`} />

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

      {/* specular glints */}
      {!locked && (
        <g fill="#FFFFFF">
          <polygon points="50,11 40,26 47,29" fillOpacity="0.7" />
          <polygon points="44,42 47,42 46,72 44,70" fillOpacity="0.22" />
          <circle cx="34" cy="30" r="1.4" fillOpacity="0.85" />
        </g>
      )}

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

      {locked && (
        <foreignObject x="39" y="47" width="22" height="22">
          <div className="flex h-full w-full items-center justify-center">
            <Lock size={16} className="text-tertiary" />
          </div>
        </foreignObject>
      )}
    </svg>
  );
}
