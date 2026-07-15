'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Stepper } from '@/components/ui/Stepper';
import { TilePicker } from '@/components/ui/TilePicker';
import { useT } from '@/lib/i18n/client';

/** Modular scale ratios common in typography. 1.25 is the UI sweet spot.
 *  `nameKey` holds a translation key resolved at render via t(). */
const RATIOS = [
  { value: 1.125, nameKey: 'exercises.scaleRamp.ratioMinorSecond' },
  { value: 1.25, nameKey: 'exercises.scaleRamp.ratioMajorThird' },
  { value: 1.333, nameKey: 'exercises.scaleRamp.ratioPerfectFourth' },
  { value: 1.5, nameKey: 'exercises.scaleRamp.ratioPerfectFifth' },
] as const;

/** Recommended ratio for interface type scales. */
const UI_RATIO = 1.25;

/** Six ascending steps of the scale, rendered bottom-up (caption → display). */
const STEPS = [
  { key: 'caption', label: 'Caption', n: -1 },
  { key: 'body', label: 'Body', n: 0 },
  { key: 'h3', label: 'H3', n: 1 },
  { key: 'h2', label: 'H2', n: 2 },
  { key: 'h1', label: 'H1', n: 3 },
  { key: 'display', label: 'Display', n: 4 },
] as const;

/**
 * DRAFT exercise — "scale-ramp".
 * Learner picks a base body size and a modular ratio, then sees a full
 * type scale render live: size = base * ratio^n, rounded to whole px.
 */
/**
 * Exercise type — "scale-ramp". Dual-mode: no props → standalone showcase; pass
 * `value`/`onChange` to drive it as a graded exercise (reports {base,ratio} up;
 * the player validates against the target and renders the verdict).
 */
export function ScaleRamp({
  value,
  disabled,
  onChange,
}: {
  value?: { base: number; ratio: number };
  disabled?: boolean;
  onChange?: (v: { base: number; ratio: number }) => void;
} = {}) {
  const { t } = useT();
  const controlled = onChange !== undefined;
  const [internal, setInternal] = useState({ base: 16, ratio: UI_RATIO });
  const ratio = controlled ? value?.ratio ?? UI_RATIO : internal.ratio;
  const base = controlled ? value?.base ?? 16 : internal.base;
  const setRatio = (v: number) =>
    controlled ? onChange!({ base, ratio: v }) : setInternal((s) => ({ ...s, ratio: v }));
  const setBase = (v: number) =>
    controlled ? onChange!({ base: v, ratio }) : setInternal((s) => ({ ...s, base: v }));

  const isUiRatio = ratio === UI_RATIO;

  return (
    <div className={controlled ? '' : 'rounded-2xl border border-border bg-surface p-5'}>
      {/* Header */}
      {!controlled && (
        <div className="mb-5">
          <h3 className="text-title3 font-semibold text-primary">{t('exercises.scaleRamp.title')}</h3>
          <p className="mt-1 text-footnote text-secondary">
            {t('exercises.scaleRamp.subtitle')}
          </p>
        </div>
      )}

      {/* Ratio picker */}
      <div className="mb-4">
        <p className="mb-2 text-footnote text-secondary">{t('exercises.scaleRamp.ratioLabel')}</p>
        <TilePicker
          value={String(ratio)}
          disabled={disabled}
          onChange={(v) => setRatio(Number(v))}
          options={RATIOS.map((r) => ({
            value: String(r.value),
            glyph: String(r.value),
            label: t(r.nameKey),
          }))}
        />
        {isUiRatio && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-caption font-medium text-brand">
            <Sparkles size={13} />
            {t('exercises.scaleRamp.recommendedForUi')}
          </div>
        )}
      </div>

      {/* Base size stepper */}
      <div className="mb-5">
        <Stepper
          label={t('exercises.scaleRamp.baseSize')}
          value={base}
          unit="px"
          min={14}
          max={18}
          step={1}
          variant="pill"
          disabled={disabled}
          onChange={setBase}
        />
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-border bg-canvas p-4">
        <p className="mb-3 text-caption uppercase tracking-wide text-tertiary">
          {t('exercises.scaleRamp.livePreview')}
        </p>
        <div className="flex flex-col gap-3">
          {[...STEPS].reverse().map((step) => {
            const size = Math.round(base * Math.pow(ratio, step.n));
            return (
              <div key={step.key} className="flex items-baseline gap-3">
                <span className="w-16 shrink-0 text-caption text-tertiary">
                  {step.label}
                </span>
                <span className="w-12 shrink-0 text-right text-footnote tabular-nums text-secondary">
                  {size}px
                </span>
                <span
                  className="min-w-0 truncate font-semibold leading-tight text-primary transition-base"
                  style={{ fontSize: `${size}px` }}
                >
                  {t('exercises.scaleRamp.heading')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
