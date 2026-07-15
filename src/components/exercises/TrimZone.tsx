'use client';

import { Slider } from '@/components/ui/Slider';
import { useT } from '@/lib/i18n/client';

/**
 * Exercise type — "trim-zone". The learner drags a slider to trim the invisible
 * extra font space (trim zone) above and below a text label, until its optical
 * padding is symmetric — the hands-on version of `text-box-trim`.
 *
 * The pink hatched bands represent the extra space; they shrink as trim grows.
 * Over-trimming starts clipping the glyphs (the label is nudged and cropped),
 * so the sweet spot is felt, not guessed.
 */
export function TrimZone({
  label,
  targetTrim,
  maxTrim,
  value,
  disabled,
  onChange,
}: {
  label: string;
  targetTrim: number;
  maxTrim: number;
  value: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const { t } = useT();
  // Extra space present before trimming equals the target trim: at the target,
  // both bands vanish and the label is optically centered.
  const band = Math.max(0, targetTrim - value);
  // Past the target we've eaten into the glyphs — show a clip to signal overshoot.
  const overshoot = Math.max(0, value - targetTrim);

  return (
    <div>
      <div className="rounded-lg border border-border bg-canvas px-4 py-3">
        <div className="mx-auto w-fit">
          {/* Top extra-space band */}
          <div
            className="trim-band"
            style={{ height: band }}
            aria-hidden
          />
          {/* The text box */}
          <div
            className="flex items-center justify-center overflow-hidden rounded-md bg-brand px-6 text-on-brand"
            style={{
              // Optical box: shrinks vertically as we trim, clips on overshoot.
              paddingTop: 10 - Math.min(10, overshoot),
              paddingBottom: 10 - Math.min(10, overshoot),
            }}
          >
            <span className="text-title3 font-semibold leading-none">{label}</span>
          </div>
          {/* Bottom extra-space band */}
          <div
            className="trim-band"
            style={{ height: band }}
            aria-hidden
          />
        </div>

        <p className="mt-2 text-center text-caption text-tertiary">
          {band > 0
            ? t('exercises.trimZone.bandsHint')
            : overshoot > 0
              ? t('exercises.trimZone.overshootHint')
              : t('exercises.trimZone.centeredHint')}
        </p>
      </div>

      <div className="mt-3">
        <Slider
          value={value}
          min={0}
          max={maxTrim}
          step={1}
          unit="px"
          disabled={disabled}
          onChange={onChange}
        />
      </div>

      <style>{`
        .trim-band {
          width: 100%;
          background-image: repeating-linear-gradient(
            45deg,
            color-mix(in srgb, var(--danger, #e5484d) 22%, transparent) 0,
            color-mix(in srgb, var(--danger, #e5484d) 22%, transparent) 4px,
            transparent 4px,
            transparent 8px
          );
          transition: height 0.12s ease;
        }
      `}</style>
    </div>
  );
}
