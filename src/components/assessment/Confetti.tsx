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
    // Fixed to the viewport (not the tall result page) so pieces fall the full
    // screen height and never pile into a mid-page band, and fade to 0 as they
    // land so the burst disappears once it's done.
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute -top-6 block rounded-[1px]"
          style={{ left: `${b.left}%`, width: b.size, height: b.size * 0.6, background: b.color }}
          initial={{ y: 0, opacity: 0, rotate: 0 }}
          animate={{ y: '110vh', x: b.drift, opacity: [0, 1, 1, 0], rotate: b.rotate }}
          transition={{ duration: b.duration, delay: b.delay, ease: [0.4, 0.1, 0.7, 1], times: [0, 0.1, 0.8, 1] }}
        />
      ))}
    </div>
  );
}
