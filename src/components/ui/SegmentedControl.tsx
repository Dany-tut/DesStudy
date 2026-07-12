'use client';

import { motion } from 'framer-motion';

/** Pill-shaped exclusive picker — a compact alternative to radio buttons. */
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
  const count = options.length;

  return (
    <div className="relative inline-flex rounded-lg bg-muted p-1">
      <motion.div
        className="absolute inset-y-1 rounded-md bg-brand shadow-sm"
        style={{ width: `calc(${100 / count}% - 4px)`, left: '2px' }}
        animate={{ x: `calc(${activeIndex * 100}% + ${activeIndex * 4}px)` }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              'relative z-10 flex-1 whitespace-nowrap rounded-md px-4 py-2 text-footnote font-medium transition-fast',
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
