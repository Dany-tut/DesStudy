'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * A one-shot confetti burst — no external library. A fixed number of paper bits
 * fall and drift from the top with framer-motion; the piece count and palette
 * stay small so it celebrates without janking the result screen. Rendered once
 * on mount (parent controls presence via a `key` or conditional).
 */

const COLORS = ['var(--brand)', 'var(--success)', 'var(--warning)', 'var(--info)'];

interface Piece {
  left: number; // %
  delay: number;
  duration: number;
  drift: number; // px horizontal drift
  rotate: number;
  color: string;
  size: number;
}

export function Confetti({ pieces = 90 }: { pieces?: number }) {
  const bits = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 160,
        rotate: Math.random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    [pieces],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block rounded-[1px]"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.color }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: '105vh', x: b.drift, opacity: [0, 1, 1, 0.9], rotate: b.rotate }}
          transition={{ duration: b.duration, delay: b.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
