'use client';

import type { GraduationCap } from 'lucide-react';

/** Soft tint per lesson type — token-based, so both themes track automatically.
 *  Deliberately light (10% fill): the three read as distinct types without
 *  competing with the lesson thumbnails below. */
export const PILL_TONE: Record<'lesson' | 'figma' | 'make', string> = {
  lesson: 'border-brand/20 bg-brand/10 text-brand hover:bg-brand/[0.16]',
  figma: 'border-warning/20 bg-warning/10 text-warning hover:bg-warning/[0.16]',
  make: 'border-success/20 bg-success/10 text-success hover:bg-success/[0.16]',
};

/** A create-a-lesson pill in the «Уроки» heading row — one per lesson type. */
export function TypePill({
  icon: Icon,
  tone,
  label,
  title,
  disabled,
  onClick,
}: {
  icon: typeof GraduationCap;
  tone: 'lesson' | 'figma' | 'make';
  label: string;
  /** Tooltip — the longer "what this type is" hint the pill has no room for. */
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-footnote font-medium transition-fast disabled:cursor-not-allowed disabled:opacity-50',
        PILL_TONE[tone],
      ].join(' ')}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
