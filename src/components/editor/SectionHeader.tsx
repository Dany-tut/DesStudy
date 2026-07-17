'use client';

/**
 * The reference header every inspector block shares — Position, Layout,
 * Appearance, Fill, Stroke, Effects, Export. Only the trailing actions differ
 * between blocks, so they are a slot rather than props: the header owns the
 * title's type, colour and metrics, and nothing else.
 *
 * Two levels of label, and the gap between them is the point:
 *
 *   SectionHeader  — the block's name. footnote / semibold / primary.
 *   FieldLabel     — a control's name inside it. caption / regular / tertiary.
 *
 * A block title that sits at the same weight as the labels under it turns the
 * panel into an undifferentiated list — you have to read it to find the block
 * you want instead of seeing it. The step in size, weight AND colour is what
 * makes the panel scannable.
 *
 * Not yet adopted by PropertiesPanel — this is the agreed shape first, the
 * migration after.
 */

/** A block header. `muted` marks a block with nothing in it — an empty Effects
 *  reads as an offer, not as content, so its title recedes. */
export function SectionHeader({
  title,
  muted,
  actions,
}: {
  title: string;
  muted?: boolean;
  /** Trailing controls — the style/variable picker, «+», visibility, blend.
   *  A slot, because this is the only part that varies per block. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex h-7 items-center justify-between gap-2">
      <p
        className={[
          'truncate text-footnote font-semibold',
          muted ? 'text-tertiary' : 'text-primary',
        ].join(' ')}
      >
        {title}
      </p>
      {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
    </div>
  );
}

/** The name of a single control inside a block («Opacity», «Corner radius»).
 *  Deliberately quiet: it labels the field below it, it does not compete with
 *  the block header above it. */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 truncate text-caption text-tertiary">{children}</p>;
}
