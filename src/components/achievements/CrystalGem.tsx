import { Lock } from 'lucide-react';

/**
 * A faceted, hand-cut crystal rendered in pure SVG — no raster assets. Each
 * achievement family gets its own gem `tone`; locked gems render as a dark,
 * de-faceted rough stone with a lock so the unlock reads as "it comes alive".
 */

export type GemTone = 'sapphire' | 'ember' | 'amethyst' | 'emerald' | 'gold';

interface Palette {
  /** top-crown highlight */ light: string;
  /** body */ mid: string;
  /** pavilion shadow */ dark: string;
  /** ambient glow */ glow: string;
}

const PALETTES: Record<GemTone, Palette> = {
  sapphire: { light: '#8FC2FF', mid: '#3B82F6', dark: '#1E3A8A', glow: '#3B82F6' },
  ember: { light: '#FFC07A', mid: '#F97316', dark: '#9A3412', glow: '#FB923C' },
  amethyst: { light: '#D0A9FF', mid: '#9B61FF', dark: '#5B21B6', glow: '#9B61FF' },
  emerald: { light: '#8FF0C4', mid: '#10B981', dark: '#065F46', glow: '#34D399' },
  gold: { light: '#FFE9A6', mid: '#F5C043', dark: '#B7791F', glow: '#FFD24A' },
};

const LOCKED: Palette = { light: '#3A3F47', mid: '#272B31', dark: '#171A1E', glow: '#000000' };

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
  // Unique gradient ids so multiple gems on a page don't collide.
  const uid = `${tone}-${locked ? 'off' : 'on'}`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient id={`glow-${uid}`} cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={p.glow} stopOpacity={locked ? 0 : 0.55} />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`crownL-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="100%" stopColor={p.mid} />
        </linearGradient>
        <linearGradient id={`crownR-${uid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="100%" stopColor={p.mid} />
        </linearGradient>
        <linearGradient id={`pavL-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={`pavR-${uid}`} x1="1" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.dark} />
        </linearGradient>
      </defs>

      {/* ambient bloom behind the stone */}
      <circle cx="50" cy="46" r="46" fill={`url(#glow-${uid})`} />

      {/* crown — split by a vertical ridge so light catches each face differently */}
      <polygon points="50,8 18,40 50,40" fill={`url(#crownL-${uid})`} />
      <polygon points="50,8 82,40 50,40" fill={`url(#crownR-${uid})`} />
      {/* pavilion — the deep tapering base */}
      <polygon points="18,40 50,40 50,94" fill={`url(#pavL-${uid})`} />
      <polygon points="82,40 50,40 50,94" fill={`url(#pavR-${uid})`} />

      {/* facet edges — thin bright lines read as cut glass */}
      <g stroke={locked ? '#000000' : p.light} strokeWidth="0.75" strokeOpacity={locked ? 0.35 : 0.55}>
        <line x1="50" y1="8" x2="50" y2="94" />
        <line x1="18" y1="40" x2="82" y2="40" />
        <polyline points="50,8 18,40 50,94 82,40 50,8" fill="none" />
      </g>

      {/* specular sparkle on the top-left crown */}
      {!locked && (
        <polygon points="50,14 34,34 47,36" fill="#FFFFFF" fillOpacity="0.55" />
      )}

      {locked && (
        <g transform="translate(50,50)">
          <foreignObject x="-11" y="-11" width="22" height="22">
            <div className="flex h-full w-full items-center justify-center">
              <Lock size={16} className="text-tertiary" />
            </div>
          </foreignObject>
        </g>
      )}
    </svg>
  );
}
