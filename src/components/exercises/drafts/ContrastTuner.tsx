'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

function channelToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Neutral grey from lightness 0..100 -> relative luminance (per WCAG 2.1)
function luminanceFromLightness(lightness: number): number {
  const v = Math.round((lightness / 100) * 255);
  const lin = channelToLinear(v);
  return 0.2126 * lin + 0.7152 * lin + 0.0722 * lin;
}

function greyHex(lightness: number): string {
  const v = Math.round((lightness / 100) * 255);
  const h = v.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
}

/**
 * Exercise type — "contrast-tune". Dual-mode: no props → standalone showcase;
 * pass `value`/`onChange` (+ optional `targetRatio`) to drive it as a graded
 * exercise (reports {textL,bgL} up; the player renders the verdict).
 */
export function ContrastTuner({
  targetRatio = 4.5,
  value,
  disabled,
  onChange,
}: {
  targetRatio?: number;
  value?: { textL: number; bgL: number };
  disabled?: boolean;
  onChange?: (v: { textL: number; bgL: number }) => void;
} = {}) {
  const { t } = useT();
  const controlled = onChange !== undefined;
  const [internal, setInternal] = useState({ textL: 38, bgL: 96 });
  const textL = controlled ? value?.textL ?? 38 : internal.textL;
  const bgL = controlled ? value?.bgL ?? 96 : internal.bgL;
  const setTextL = (v: number) =>
    controlled ? onChange!({ textL: v, bgL }) : setInternal((s) => ({ ...s, textL: v }));
  const setBgL = (v: number) =>
    controlled ? onChange!({ textL, bgL: v }) : setInternal((s) => ({ ...s, bgL: v }));

  const lumText = luminanceFromLightness(textL);
  const lumBg = luminanceFromLightness(bgL);
  const lighter = Math.max(lumText, lumBg);
  const darker = Math.min(lumText, lumBg);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  const ratioLabel = `${ratio.toFixed(2)}:1`;

  const passAA = ratio >= 4.5;
  const passAALarge = ratio >= 3;
  const passAAA = ratio >= 7;

  const textColor = greyHex(textL);
  const bgColor = greyHex(bgL);

  const badges = [
    { key: 'aa', label: 'AA', hint: t('exercises.contrastTuner.hintNormal'), pass: passAA },
    { key: 'aa-l', label: 'AA Large', hint: t('exercises.contrastTuner.hintLarge'), pass: passAALarge },
    { key: 'aaa', label: 'AAA', hint: t('exercises.contrastTuner.hintEnhanced'), pass: passAAA },
  ];

  const reached = ratio >= targetRatio;

  return (
    <div className={controlled ? '' : 'rounded-xl border border-border bg-surface p-5'}>
      {!controlled && (
        <div className="mb-4">
          <h3 className="text-title3 text-primary">{t('exercises.contrastTuner.title')}</h3>
          <p className="text-footnote text-secondary mt-1">
            {t('exercises.contrastTuner.subtitle')}
          </p>
        </div>
      )}

      {/* Live preview card */}
      <div
        className="rounded-lg border border-border p-6 transition-base"
        style={{ backgroundColor: bgColor }}
      >
        <div className="text-title2" style={{ color: textColor }}>
          {t('exercises.contrastTuner.sampleTitle')}
        </div>
        <p className="text-body mt-2" style={{ color: textColor }}>
          {t('exercises.contrastTuner.sampleBody')}
        </p>
      </div>

      {/* Ratio readout */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-elevated border border-border px-4 py-3">
        <span className="text-footnote text-secondary">{t('exercises.contrastTuner.contrast')}</span>
        <span
          className={`text-title3 tabular-nums ${passAA ? 'text-success' : 'text-danger'}`}
        >
          {ratioLabel}
        </span>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.key}
            className={`flex items-center gap-2 rounded-full border px-3 py-2 transition-fast ${
              b.pass
                ? 'border-success bg-success/10 text-success'
                : 'border-border bg-muted text-tertiary'
            }`}
          >
            {b.pass ? (
              <Check size={14} strokeWidth={2.5} />
            ) : (
              <X size={14} strokeWidth={2.5} />
            )}
            <span className="text-footnote">{b.label}</span>
            <span className="text-caption opacity-70">{b.hint}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-5">
        <label className="block">
          <div className="flex items-center justify-between mb-2">
            <span className="text-footnote text-secondary">{t('exercises.contrastTuner.textLightness')}</span>
            <span className="text-footnote text-tertiary tabular-nums">{textL}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={textL}
            onChange={(e) => setTextL(Number(e.target.value))}
            disabled={disabled}
            className="ui-slider ui-slider--chunky"
            style={{ '--pct': `${textL}%` } as React.CSSProperties}
          />
        </label>

        <label className="block">
          <div className="flex items-center justify-between mb-2">
            <span className="text-footnote text-secondary">{t('exercises.contrastTuner.bgLightness')}</span>
            <span className="text-footnote text-tertiary tabular-nums">{bgL}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={bgL}
            onChange={(e) => setBgL(Number(e.target.value))}
            disabled={disabled}
            className="ui-slider ui-slider--chunky"
            style={{ '--pct': `${bgL}%` } as React.CSSProperties}
          />
        </label>
      </div>

      {!controlled && passAA && (
        <div className="mt-4 flex items-center gap-2 text-success">
          <Check size={16} strokeWidth={2.5} />
          <span className="text-footnote">{t('exercises.contrastTuner.passesAA')}</span>
        </div>
      )}
      {controlled && reached && (
        <div className="mt-4 flex items-center gap-2 text-success">
          <Check size={16} strokeWidth={2.5} />
          <span className="text-footnote">{t('exercises.contrastTuner.goalReached', { ratio: targetRatio })}</span>
        </div>
      )}
    </div>
  );
}
