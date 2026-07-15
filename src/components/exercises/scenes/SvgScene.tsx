'use client';

import { Check, CircleHelp, Lightbulb } from 'lucide-react';
import type { CritiqueZone } from '@/lib/curriculum/types';
import type { Verdict } from '@/lib/curriculum/screenCritique';

/**
 * The `svg` scene for screen-critique: a teacher-authored mockup (built in the
 * visual builder) rendered verbatim, with clickable zone overlays placed by each
 * zone's `rect` (% bbox) — exactly like `ImageScene`, but the underlying screen
 * is inline SVG markup instead of a raster upload. A correctly-reconstructed
 * zone gets a soft green wash to echo the "repair" feedback of the DOM scene.
 */

const VERDICT_RING: Record<Verdict, string> = {
  right: '#3FB950',
  debatable: '#E3B341',
  wrong: '#E0785F',
};
const VERDICT_ICON: Record<Verdict, typeof Check> = {
  right: Check,
  debatable: CircleHelp,
  wrong: Lightbulb,
};

export function SvgScene({
  svg,
  zones,
  fixed,
  selected,
  onSelect,
  verdicts,
  checked = false,
  interactive = true,
}: {
  svg: string;
  zones: CritiqueZone[];
  fixed: Set<string>;
  selected: string | null;
  onSelect?: (id: string) => void;
  verdicts?: Record<string, Verdict | undefined>;
  checked?: boolean;
  interactive?: boolean;
}) {
  return (
    <div className="relative w-[320px] shrink-0 overflow-hidden rounded-2xl border border-border shadow-lg [&_svg]:block [&_svg]:h-auto [&_svg]:w-full">
      <div dangerouslySetInnerHTML={{ __html: svg }} />

      {zones.map((z) => {
        if (!z.rect) return null;
        const { x0, y0, x1, y1 } = z.rect;
        const w = Math.max(0.001, x1 - x0);
        const h = Math.max(0.001, y1 - y0);
        const wv = verdicts?.[z.id];
        const showFixed = fixed.has(z.id);

        const outline = checked && wv
          ? `2px solid ${VERDICT_RING[wv]}`
          : !checked && selected === z.id
            ? '2px solid var(--brand)'
            : '1px dashed rgba(120,120,140,0.5)';

        const Icon = wv ? VERDICT_ICON[wv] : null;

        return (
          <div
            key={z.id}
            onClick={interactive && !checked && onSelect ? () => onSelect(z.id) : undefined}
            className={interactive && !checked ? 'cursor-pointer' : 'cursor-default'}
            style={{
              position: 'absolute',
              left: `${x0}%`,
              top: `${y0}%`,
              width: `${w}%`,
              height: `${h}%`,
              outline,
              outlineOffset: -1,
              borderRadius: 4,
              background: showFixed ? 'rgba(63,185,80,0.14)' : undefined,
            }}
          >
            {checked && wv && Icon && (
              <span
                className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full"
                style={{ background: VERDICT_RING[wv] }}
              >
                <Icon size={12} className="text-white" strokeWidth={3} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
