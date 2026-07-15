'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * A one-shot celebratory burst that launches from the bottom center and explodes
 * upward-and-outward, like a firework or popper — no external library. Pieces
 * shoot up, arc out with a bit of gravity, then fade. Rendered once on mount
 * (parent controls presence via a `key` or conditional).
 */

const COLORS = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--info)'];

interface Piece {
  angle: number; // radians, mostly pointing up
  distance: number; // px travel
  delay: number;
  duration: number;
  rotate: number;
  color: string;
  size: number;
}

export function ConfettiBurst({ pieces = 90 }: { pieces?: number }) {
  const bits = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        // -90° is straight up; spread ±70° around it so the burst fans upward.
        const angle = (-90 + (Math.random() - 0.5) * 140) * (Math.PI / 180);
        return {
          angle,
          distance: 160 + Math.random() * 220,
          delay: Math.random() * 0.12,
          duration: 1.1 + Math.random() * 0.9,
          rotate: Math.random() * 720 - 360,
          color: COLORS[i % COLORS.length],
          size: 6 + Math.random() * 6,
        };
      }),
    [pieces],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => {
        const dx = Math.cos(b.angle) * b.distance;
        const dy = Math.sin(b.angle) * b.distance; // negative → upward
        return (
          <motion.span
            key={i}
            className="absolute bottom-0 left-1/2 block rounded-[1px]"
            style={{ width: b.size, height: b.size * 0.6, background: b.color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              // shoot up-and-out, then let gravity pull the tail back down a touch
              x: dx,
              y: [0, dy, dy + 60],
              opacity: [1, 1, 0],
              rotate: b.rotate,
            }}
            transition={{
              duration: b.duration,
              delay: b.delay,
              ease: 'easeOut',
              times: [0, 0.6, 1],
            }}
          />
        );
      })}
    </div>
  );
}
