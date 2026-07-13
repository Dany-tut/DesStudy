'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export interface TileOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Short text shown in the tile's glyph box instead of an icon (e.g. a ratio "1.25"). */
  glyph?: string;
  /** Optional secondary line under the label. */
  sublabel?: string;
}

/** Row of icon tiles for a single-pick choice — for options that read better as a glyph than a sentence. */
export function TilePicker<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: TileOption<T>[];
  value: T;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <motion.button
            key={opt.value}
            type="button"
            whileTap={disabled ? undefined : { scale: 0.96 }}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              'flex flex-col items-center gap-1.5 rounded-xl border-[1.5px] px-4 py-3 text-caption font-semibold transition-fast',
              disabled ? 'cursor-not-allowed opacity-50' : '',
              active
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-border bg-canvas text-secondary hover:border-border-strong',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-6 items-center justify-center rounded-md px-1.5 text-callout tabular-nums',
                opt.glyph ? 'min-w-6' : 'w-6',
                active ? 'bg-brand text-on-brand' : 'bg-muted text-tertiary',
              ].join(' ')}
            >
              {opt.glyph ?? (Icon && <Icon size={14} />)}
            </span>
            {opt.label}
            {opt.sublabel && (
              <span className={active ? 'text-brand/70' : 'text-tertiary'}>{opt.sublabel}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
