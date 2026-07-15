'use client';

import { motion } from 'framer-motion';

/**
 * A radar / "паутинка" chart in pure SVG — concentric rings + one filled
 * polygon. Values are normalized 0..1 per axis. Styled with the brand token so
 * it reads the same in light/dark. Used both on the learner result screen
 * (large, animated) and as a mini chart on the teacher's admin cards.
 */

export interface RadarAxis {
  label: string;
  value: number; // 0..1
}

export function RadarChart({
  axes,
  size = 320,
  rings = 4,
  animate = true,
  showLabels = true,
}: {
  axes: RadarAxis[];
  size?: number;
  rings?: number;
  animate?: boolean;
  showLabels?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  // Leave room for labels around the plot (they sit outside the last ring).
  const radius = size / 2 - (showLabels ? size * 0.2 : size * 0.04);
  const n = axes.length;

  // Angle for axis i, starting at the top (−90°) and going clockwise.
  const angleAt = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pointAt = (i: number, r: number) => ({
    x: cx + Math.cos(angleAt(i)) * r,
    y: cy + Math.sin(angleAt(i)) * r,
  });

  const ringPolys = Array.from({ length: rings }, (_, ring) => {
    const r = (radius * (ring + 1)) / rings;
    return axes.map((_, i) => pointAt(i, r)).map((p) => `${p.x},${p.y}`).join(' ');
  });

  const dataPts = axes.map((a, i) => pointAt(i, radius * Math.max(0, Math.min(1, a.value))));
  const dataPoly = dataPts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="max-w-full"
    >
      {/* grid rings */}
      {ringPolys.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          className="fill-none stroke-border"
          strokeWidth={1}
          opacity={0.6}
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const p = pointAt(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            className="stroke-border"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* data polygon */}
      <motion.polygon
        points={dataPoly}
        className="fill-brand/15 stroke-brand"
        strokeWidth={2.5}
        strokeLinejoin="round"
        initial={animate ? { opacity: 0, scale: 0.6 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* vertices */}
      {dataPts.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          className="fill-brand"
          initial={animate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.04 }}
        />
      ))}

      {/* axis labels */}
      {showLabels &&
        axes.map((a, i) => {
          const p = pointAt(i, radius + size * 0.055);
          const anchor =
            Math.abs(p.x - cx) < 4 ? 'middle' : p.x > cx ? 'start' : 'end';
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-secondary text-[10px] font-medium"
            >
              {a.label}
            </text>
          );
        })}
    </svg>
  );
}
