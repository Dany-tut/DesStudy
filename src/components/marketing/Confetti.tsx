'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Lightweight confetti burst for the landing showcase. Fires a batch of
 * particles every time `fireKey` changes to a new truthy value. Purely
 * decorative — absolutely positioned, pointer-events-none, so it overlays the
 * frame without interfering. Particles clean themselves up after the animation.
 */

const COLORS = ['bg-brand', 'bg-success', 'bg-warning', 'bg-info'];

interface Particle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  color: string;
  size: number;
}

let seq = 0;

function makeBatch(): Particle[] {
  return Array.from({ length: 26 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    return {
      id: seq++,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 40, // bias upward
      rotate: Math.random() * 540 - 270,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 6,
    };
  });
}

export function Confetti({ fireKey }: { fireKey: number }) {
  const [batch, setBatch] = useState<Particle[]>([]);

  useEffect(() => {
    if (!fireKey) return;
    setBatch(makeBatch());
    const t = setTimeout(() => setBatch([]), 1100);
    return () => clearTimeout(t);
  }, [fireKey]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {batch.map((p) => (
          <motion.span
            key={p.id}
            className={`absolute rounded-[2px] ${p.color}`}
            style={{ width: p.size, height: p.size * 1.4 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
