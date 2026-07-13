'use client';

import { Minus, Plus, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export type StepperVariant = 'pill' | 'dots';

/** Numeric +/- control tuned on a fixed step — used wherever a value is nudged, not typed. */
export function Stepper({
  label,
  value,
  unit = 'px',
  min,
  max,
  step = 1,
  disabled,
  variant = 'pill',
  onChange,
}: {
  label?: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** 'pill' — quiet capsule, value centered. 'dots' — grid-step dots reveal progress toward max. */
  variant?: StepperVariant;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;
  const decLabel = `${label ?? 'значение'}: уменьшить`;
  const incLabel = `${label ?? 'значение'}: увеличить`;

  if (variant === 'dots') {
    const dotCount = min !== undefined && max !== undefined && step > 0 ? (max - min) / step : 0;
    const filled = min !== undefined && step > 0 ? Math.round((value - min) / step) : 0;

    return (
      <div>
        {label && <p className="mb-1.5 text-footnote text-secondary">{label}</p>}
        <div className="flex items-center gap-1">
          <StepperButton icon={Minus} onClick={() => onChange(clamp(value - step))} disabled={disabled || atMin} label={decLabel} shape="square" />
          <span className="w-16 select-none text-center text-callout font-semibold tabular-nums text-primary">
            {value}
            {unit}
          </span>
          <StepperButton icon={Plus} onClick={() => onChange(clamp(value + step))} disabled={disabled || atMax} label={incLabel} shape="square" />
        </div>
        {dotCount > 0 && (
          <div className="mt-2.5 flex gap-1 px-1">
            {Array.from({ length: dotCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-fast ${i < filled ? 'bg-brand' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-footnote text-secondary">{label}</p>}
      <div className="flex items-center gap-1 rounded-full border border-border bg-canvas p-1">
        <StepperButton icon={Minus} onClick={() => onChange(clamp(value - step))} disabled={disabled || atMin} label={decLabel} shape="round" />
        <div className="w-16 select-none text-center text-callout font-semibold tabular-nums text-primary">
          {value}
          {unit}
        </div>
        <StepperButton icon={Plus} onClick={() => onChange(clamp(value + step))} disabled={disabled || atMax} label={incLabel} shape="round" />
      </div>
    </div>
  );
}

function StepperButton({
  icon: Icon,
  onClick,
  disabled,
  label,
  shape = 'square',
}: {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  shape?: 'square' | 'round';
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.88 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'flex h-9 w-9 items-center justify-center text-primary transition-fast hover:bg-hover active:bg-pressed disabled:cursor-not-allowed disabled:text-tertiary disabled:hover:bg-transparent',
        shape === 'round'
          ? 'rounded-full border border-border bg-surface disabled:border-border/50'
          : 'rounded-lg',
      ].join(' ')}
    >
      <Icon size={16} />
    </motion.button>
  );
}
