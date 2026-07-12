'use client';

import { motion } from 'framer-motion';

export interface SwatchOption<T extends string> {
  value: T;
  label: string;
  /** CSS color/background for the swatch circle — falls back to the muted token. */
  swatch?: string;
}

/** Row of labeled circles for a single-pick choice — for options tied to a visual sample (color, example A/B/C/D). */
export function SwatchPicker<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: SwatchOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={disabled ? undefined : { scale: 0.94 }}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            className={[
              'flex flex-col items-center gap-2 text-caption font-semibold transition-fast',
              disabled ? 'cursor-not-allowed opacity-50' : '',
              active ? 'text-primary' : 'text-tertiary hover:text-secondary',
            ].join(' ')}
          >
            <span
              className="h-11 w-11 rounded-xl transition-fast"
              style={{
                background: opt.swatch ?? 'var(--bg-muted)',
                boxShadow: active
                  ? 'inset 0 0 0 2px var(--bg-surface), 0 0 0 2px var(--brand)'
                  : 'inset 0 0 0 1px var(--border)',
                transform: active ? 'scale(1.06)' : undefined,
              }}
            />
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}
