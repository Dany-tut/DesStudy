'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand shadow-sm hover:bg-brand-hover',
  secondary: 'border border-border bg-surface text-primary hover:bg-hover active:bg-pressed',
  success: 'bg-success/10 text-success hover:bg-success/15',
  danger: 'bg-danger/10 text-danger hover:bg-danger/15',
  ghost: 'text-secondary hover:bg-hover hover:text-primary active:bg-pressed',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-footnote',
  md: 'h-10 gap-2 px-5 text-callout',
  lg: 'h-12 gap-2 px-6 text-callout',
};

/** Core action button — every clickable CTA in the app should render through this. */
export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
} & HTMLMotionProps<'button'>) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-lg font-medium transition-base',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:text-tertiary disabled:shadow-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </motion.button>
  );
}
