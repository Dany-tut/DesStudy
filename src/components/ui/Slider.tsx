'use client';

/**
 * Custom-skinned range input (see .ui-slider in globals.css for the thumb/track
 * styling — the native input stays for a11y/keyboard/touch, only its paint is replaced).
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled,
  unit = '',
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-footnote text-tertiary">
          {min}
          {unit}
        </span>
        <span className="text-title2 font-semibold tabular-nums text-primary">
          {value}
          {unit}
        </span>
        <span className="text-footnote text-tertiary">
          {max}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="ui-slider"
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
