'use client';

import { Minus, Plus, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

/** Numeric +/- control tuned on a fixed step — used wherever a value is nudged, not typed. */
export function Stepper({
  label,
  value,
  unit = 'px',
  min,
  max,
  step = 1,
  disabled,
  onChange,
}: {
  label?: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div>
      {label && <p className="mb-1.5 text-footnote text-secondary">{label}</p>}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
        <StepperButton
          icon={Minus}
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || atMin}
          label={`${label ?? 'значение'}: уменьшить`}
        />
        <div className="flex-1 select-none text-center text-callout font-semibold tabular-nums text-primary">
          {value}
          {unit}
        </div>
        <StepperButton
          icon={Plus}
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || atMax}
          label={`${label ?? 'значение'}: увеличить`}
        />
      </div>
    </div>
  );
}

function StepperButton({
  icon: Icon,
  onClick,
  disabled,
  label,
}: {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-primary transition-fast hover:bg-muted active:bg-border disabled:cursor-not-allowed disabled:text-tertiary disabled:hover:bg-transparent"
    >
      <Icon size={16} />
    </motion.button>
  );
}
