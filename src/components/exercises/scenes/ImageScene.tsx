'use client';

import { Check, CircleHelp, Lightbulb } from 'lucide-react';
import type { CritiqueZone, CritiqueImage } from '@/lib/curriculum/types';
import type { Verdict } from '@/lib/curriculum/screenCritique';

/**
 * The `image` scene for screen-critique: an uploaded "broken" screen with
 * clickable zone overlays placed by each zone's `rect` (% bbox). When the
 * exercise ships a "good" version, a correctly-reconstructed zone reveals that
 * region from the good screen — so the broken image visibly morphs toward the
 * good one, exactly like the DOM scene's repair.
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

export function ImageScene({
  image,
  zones,
  fixed,
  selected,
  onSelect,
  verdicts,
  checked = false,
  interactive = true,
}: {
  image: CritiqueImage;
  zones: CritiqueZone[];
  fixed: Set<string>;
  selected: string | null;
  onSelect?: (id: string) => void;
  verdicts?: Record<string, Verdict | undefined>;
  checked?: boolean;
  interactive?: boolean;
}) {
  return (
    <div className="relative w-[320px] shrink-0 overflow-hidden rounded-2xl border border-border shadow-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt="Экран для разбора" className="block w-full" />

      {zones.map((z) => {
        if (!z.rect) return null;
        const { x0, y0, x1, y1 } = z.rect;
        const w = Math.max(0.001, x1 - x0);
        const h = Math.max(0.001, y1 - y0);
        const wv = verdicts?.[z.id];
        const showGood = image.goodUrl && fixed.has(z.id);

        const outline = checked && wv
          ? `2px solid ${VERDICT_RING[wv]}`
          : !checked && selected === z.id
            ? '2px solid var(--brand)'
            : '1px dashed rgba(255,255,255,0.5)';

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
            }}
          >
            {/* Good-screen reveal, clipped to this zone's box. */}
            {showGood && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.goodUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    width: `${(100 / w) * 100}%`,
                    height: `${(100 / h) * 100}%`,
                    left: `${-(x0 / w) * 100}%`,
                    top: `${-(y0 / h) * 100}%`,
                    maxWidth: 'none',
                  }}
                />
              </div>
            )}

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
