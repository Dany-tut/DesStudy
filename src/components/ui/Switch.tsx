'use client';

import { motion } from 'framer-motion';

/** Boolean toggle with a spring-animated knob. */
export function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={[
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-base"
        style={{ background: checked ? 'var(--brand)' : 'var(--bg-muted)' }}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="absolute inset-0 z-10 m-0 cursor-inherit opacity-0"
        />
        <motion.span
          className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 22 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </span>
      {label && <span className="text-callout text-primary">{label}</span>}
    </label>
  );
}
