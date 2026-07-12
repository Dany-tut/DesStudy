'use client';

import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

/** Selectable answer card — used for 'choose'-type exercises and any single-pick list. */
export function ChoiceCard({
  label,
  selected,
  correct,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  correct?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.98 }}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-callout transition-fast',
        correct
          ? 'border-success bg-success/10 text-primary'
          : selected
            ? 'border-brand bg-brand/10 text-primary'
            : 'border-border bg-canvas text-secondary hover:border-border-strong',
      ].join(' ')}
    >
      {label}
      {(correct || (selected && !disabled)) && (
        <Check size={16} className={correct ? 'text-success' : 'text-brand'} />
      )}
    </motion.button>
  );
}
