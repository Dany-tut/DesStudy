'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Pill-shaped exclusive picker — a compact alternative to radio buttons.
 * Segments size to their own label (content width), so "Уютно" is narrower
 * than "Компактно". The sliding highlight measures the active button's real
 * offset/width rather than assuming equal thirds, so it always hugs the label.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const btn = btnRefs.current[activeIndex];
      const parent = listRef.current;
      if (!btn || !parent) return;
      setRect({ left: btn.offsetLeft, width: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => ro.disconnect();
  }, [activeIndex, options.length]);

  return (
    <div ref={listRef} className="relative inline-flex rounded-lg bg-muted p-1">
      {rect && (
        <motion.div
          className="absolute inset-y-1 rounded-md bg-brand shadow-sm"
          initial={false}
          animate={{ left: rect.left, width: rect.width }}
          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
        />
      )}
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              'relative z-10 whitespace-nowrap rounded-md px-4 py-2 text-footnote font-medium transition-fast',
              disabled ? 'cursor-not-allowed opacity-50' : '',
              active ? 'text-on-brand' : 'text-secondary hover:text-primary',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
